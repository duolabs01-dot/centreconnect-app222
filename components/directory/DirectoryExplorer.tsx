'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Baby, MapPin, Search, ShieldCheck, SlidersHorizontal, Map as MapIcon, LayoutGrid, List, Check, X, Clock, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SharedCentreCard } from '@/components/shared/CentreCard'
import { type CentreCardData, parseAgeGroupsToMonths } from '@/types/centre-card'
import { useCardViewPreference } from '@/lib/hooks/use-card-view-preference'

import { cn } from '@/lib/utils'
import { getLocationReference, resolveCentreCoordinates } from '@/lib/geo/centre-location'
import { isTrustedDistanceSource } from '@/lib/geo/centre-location-metadata'
import type { DirectoryCentre } from '@/types/directory-centre'
import { useBottomNav } from '@/lib/context/BottomNavProvider'
import { useRecentSearches } from '@/lib/hooks/use-recent-searches'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'

const DirectoryMap = dynamic(() => import('./DirectoryMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 animate-pulse-slow items-center justify-center rounded-[2rem] border border-stone-200 bg-stone-50">
      <p className="text-sm font-medium text-[stone-500]">Loading map...</p>
    </div>
  ),
})

type DirectoryFilters = {
  search?: string
  suburb?: string
  age?: string
  fee?: string
  registered?: boolean
  page?: number
}

type DirectoryExplorerProps = {
  initialCentres: DirectoryCentre[]
  totalResults: number
  pageSize: number
  initialPage: number
  initialFilters: DirectoryFilters
  suburbs: string[]
  ageGroups: string[]
  viewerRole?: string | null
}

const FEE_OPTIONS = [
  { label: 'Any fee', value: '' },
  { label: 'Under R800', value: '800' },
  { label: 'Under R1200', value: '1200' },
  { label: 'Under R2000', value: '2000' },
]

function haversineMeters(
  userLocation: [number, number],
  centre: { latitude: number | null; longitude: number | null; slug?: string | null; suburb?: string | null; city?: string | null; address?: string | null; coordinate_source?: string | null }
) {
  const resolved = resolveCentreCoordinates({
    latitude: centre.latitude,
    longitude: centre.longitude,
    slug: centre.slug,
    suburb: centre.suburb,
    city: centre.city,
    address: centre.address,
    storedSource: (centre.coordinate_source as any) ?? null,
  })
  if (resolved.latitude == null || resolved.longitude == null) return null

  const toRad = (value: number) => (value * Math.PI) / 180
  const [userLng, userLat] = userLocation
  const dLat = toRad(resolved.latitude - userLat)
  const dLon = toRad(resolved.longitude - userLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(resolved.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistanceLabel(distanceMeters: number | null) {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return null
  const km = distanceMeters / 1000
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m away`
  return `${km.toFixed(1)} km away`
}

function buildMapsLink(centre: DirectoryCentre) {
  const hasCoords = typeof centre.latitude === 'number' && typeof centre.longitude === 'number'
  if (hasCoords) {
    return `https://www.google.com/maps?q=${centre.latitude},${centre.longitude}`
  }
   const parts = [centre.name, centre.suburb, centre.city].filter((value) => typeof value === 'string' && value.trim().length > 0)
  if (parts.length === 0) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(' '))}`
}

export default function DirectoryExplorer({
  initialCentres,
  totalResults: initialTotal,
  pageSize,
  initialPage,
  initialFilters,
  suburbs,
  ageGroups,
  viewerRole = null,
}: DirectoryExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [centres, setCentres] = useState(initialCentres)
  const [totalResults, setTotalResults] = useState(initialTotal)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const { variant: cardVariant, setVariant: setCardVariant } = useCardViewPreference()

  const [search, setSearch] = useState(initialFilters.search ?? '')
  const [selectedSuburb, setSelectedSuburb] = useState(initialFilters.suburb ?? '')
  const [selectedAge, setSelectedAge] = useState(initialFilters.age ?? '')
  const [selectedFee, setSelectedFee] = useState(initialFilters.fee ?? '')
  const [selectedRegistered, setSelectedRegistered] = useState(initialFilters.registered ? 'true' : '')
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search ?? '')
  const [isPending, startTransition] = useTransition()
  const { setVisible } = useBottomNav()
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle')

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const { recentSearches, recentSuburbs, addRecentSearch, addRecentSuburb, clearRecentSearches, clearRecentSuburbs } = useRecentSearches()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userLocation || geoStatus === 'granted') return

    const areaSuburb = selectedSuburb || initialFilters.suburb || centres[0]?.suburb || centres[0]?.city || ''
    setUserLocation(getLocationReference({ suburb: areaSuburb, city: centres[0]?.city }))
  }, [centres, geoStatus, initialFilters.suburb, selectedSuburb, userLocation])

  useEffect(() => {
    if (geoStatus !== 'idle' || typeof navigator === 'undefined' || !navigator.geolocation) return

    setGeoStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
        setGeoStatus('granted')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 600000 }
    )
  }, [geoStatus])

  useEffect(() => {
    setVisible(!isFilterSheetOpen)
    return () => setVisible(true)
  }, [isFilterSheetOpen, setVisible])

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const hasActiveFilters = Boolean(selectedSuburb || selectedAge || selectedFee || selectedRegistered === 'true')
  const exactUserLocation = geoStatus === 'granted' ? userLocation : null

  const quickFilters = [
    { label: 'Near Me', icon: MapPin, active: geoStatus === 'granted', onClick: () => activateMapView() },
    {
      label: 'Alexandra',
      icon: MapPin,
      active: selectedSuburb === 'Alexandra',
      onClick: () => {
        setSelectedSuburb(selectedSuburb === 'Alexandra' ? '' : 'Alexandra')
        setCurrentPage(1)
      },
    },
    {
      label: 'DSD registered',
      icon: ShieldCheck,
      active: selectedRegistered === 'true',
      onClick: () => {
        setSelectedRegistered(selectedRegistered === 'true' ? '' : 'true')
        setCurrentPage(1)
      },
    },
    {
      label: 'Infants',
      icon: Baby,
      active: selectedAge === 'Infants (0-1 year)',
      onClick: () => {
        setSelectedAge(selectedAge === 'Infants (0-1 year)' ? '' : 'Infants (0-1 year)')
        setCurrentPage(1)
      },
    },
  ]

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeout)
  }, [search])

  // Save to recent searches when search is performed
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length >= 2) {
      addRecentSearch(debouncedSearch)
    }
  }, [debouncedSearch, addRecentSearch])

  // Save suburb when selected
  useEffect(() => {
    if (selectedSuburb) {
      addRecentSuburb(selectedSuburb)
    }
  }, [selectedSuburb, addRecentSuburb])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedSuburb) params.set('suburb', selectedSuburb)
    if (selectedAge) params.set('age', selectedAge)
    if (selectedFee) params.set('fee', selectedFee)
    if (selectedRegistered === 'true') params.set('registered', 'true')
    if (currentPage > 1) params.set('page', String(currentPage))

    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedRegistered, currentPage, pathname, router])

  useEffect(() => {
    const controller = new AbortController()
    startTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (selectedSuburb) params.set('suburb', selectedSuburb)
        if (selectedAge) params.set('age', selectedAge)
        if (selectedFee) params.set('fee', selectedFee)
        if (selectedRegistered === 'true') params.set('registered', 'true')
        params.set('page', String(currentPage))

        const res = await fetch(`/api/directory/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) return
        const payload = await res.json()
        setCentres(payload.centres ?? [])
        setTotalResults(payload.totalResults ?? 0)
      } catch {}
    })
    return () => controller.abort()
  }, [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedRegistered, currentPage])

  const activateMapView = () => {
    if (geoStatus === 'granted') {
      setViewMode('map')
      return
    }
    setGeoStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
        setGeoStatus('granted')
        setViewMode('map')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const resetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setSelectedSuburb('')
    setSelectedAge('')
    setSelectedFee('')
    setSelectedRegistered('')
    setCurrentPage(1)
  }

  return (
    <div className="cc-stack overflow-x-clip text-stone-800" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="sticky top-[84px] z-[60] mx-0 rounded-[1.7rem] border border-stone-200 bg-stone-50/95 p-3 shadow-[0_12px_32px_rgba(31,44,39,0.06)] backdrop-blur-xl sm:static sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[stone-500]" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search centre or suburb..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
                setShowAutocomplete(true)
              }}
              onFocus={() => setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              className="h-14 rounded-[1.4rem] border-stone-300 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFCF7_100%)] pl-11 pr-4 text-base font-medium text-stone-800 shadow-[0_10px_24px_rgba(31,44,39,0.05)] focus-visible:border-teal-600 focus-visible:ring-2 focus-visible:ring-teal-600/10"
            />
            
            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showAutocomplete && (recentSearches.length > 0 || recentSuburbs.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border border-stone-300 bg-white shadow-lg"
                >
                  {recentSearches.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[stone-500]">
                          <Clock className="h-3 w-3" />
                          Recent Searches
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearRecentSearches}
                          className="text-xs text-[stone-500] hover:text-teal-600 h-auto p-0"
                        >
                          Clear
                        </Button>
                      </div>
                      {recentSearches.map((s, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch(s)
                            setCurrentPage(1)
                            setShowAutocomplete(false)
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[stone-100] justify-start h-auto normal-case font-normal"
                        >
                          <Search className="h-4 w-4 text-[stone-500]" />
                          <span className="text-stone-800">{s}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {recentSuburbs.length > 0 && (
                    <div className="border-t border-stone-300 p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[stone-500]">
                          <MapPin className="h-3 w-3" />
                          Recent Areas
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearRecentSuburbs}
                          className="text-xs text-[stone-500] hover:text-teal-600 h-auto p-0"
                        >
                          Clear
                        </Button>
                      </div>
                      {recentSuburbs.map((suburb, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSuburb(suburb)
                            addRecentSuburb(suburb)
                            setCurrentPage(1)
                            setShowAutocomplete(false)
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[stone-100] justify-start h-auto normal-case font-normal"
                        >
                          <MapPin className="h-4 w-4 text-[stone-500]" />
                          <span className="text-stone-800">{suburb}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-[1.4rem] border-stone-300 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFCF7_100%)] text-stone-600 shadow-[0_10px_24px_rgba(31,44,39,0.05)] transition-all hover:border-teal-600 hover:text-teal-600 active:scale-90"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2.5rem] border-t-0 bg-stone-50 px-6 pb-12 pt-8 shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-[1.95rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-stone-800" style={{ fontFamily: 'var(--font-display)' }}>
                  Refine results
                </SheetTitle>
              </SheetHeader>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[stone-500]">Location</label>
                  <select
                    value={selectedSuburb}
                    onChange={(e) => setSelectedSuburb(e.target.value)}
                    className="cc-native-field h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 text-base font-medium text-stone-800 outline-none focus:border-teal-600"
                  >
                    <option value="">All Johannesburg Areas</option>
                    {suburbs.map((suburb) => (
                      <option key={suburb} value={suburb}>
                        {suburb}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[stone-500]">Monthly Budget</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEE_OPTIONS.map((option) => (
                      <Button
                        type="button"
                        key={option.value}
                        onClick={() => setSelectedFee(option.value)}
                        variant={selectedFee === option.value ? 'default' : 'outline'}
                        className={cn(
                          'h-12 rounded-2xl px-4 text-sm font-semibold transition-all',
                          selectedFee === option.value
                            ? 'border-teal-600 bg-teal-50 text-teal-600 hover:bg-teal-100'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        )}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[stone-500]">Child&apos;s Age Group</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...ageGroups].map((age) => (
                      <Button
                        type="button"
                        key={age}
                        onClick={() => setSelectedAge(age === 'All' ? '' : age)}
                        variant={(age === 'All' ? !selectedAge : selectedAge === age) ? 'default' : 'outline'}
                        className={cn(
                          'h-11 rounded-2xl px-5 text-sm font-semibold transition-all',
                          (age === 'All' ? !selectedAge : selectedAge === age)
                            ? 'border-teal-600 bg-[teal-600] text-white hover:bg-[teal-700] shadow-[0_12px_24px_rgba(13,148,136,0.18)]'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        )}
                      >
                        {age.replace(/(\d+)([my])/g, '$1$2 old')}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex h-16 w-full cursor-pointer items-center justify-between rounded-2xl border border-stone-200 bg-white px-5 transition-colors hover:bg-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
                        <Check className="h-4 w-4 stroke-[3] text-amber-600" />
                      </div>
                      <span className="text-sm font-semibold text-stone-800">DSD registered</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedRegistered === 'true'}
                      onChange={(e) => setSelectedRegistered(e.target.checked ? 'true' : '')}
                      className="h-6 w-6 rounded-lg border-stone-300 text-teal-600 focus:ring-[teal-600]"
                    />
                  </label>
                </div>
              </div>

              <SheetFooter className="mt-10 gap-3">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="h-14 flex-1 rounded-2xl border-stone-300 bg-white font-semibold text-stone-500 hover:bg-stone-50"
                >
                  Reset all
                </Button>
                <SheetClose asChild>
                  <Button className="h-14 flex-1 rounded-2xl bg-[teal-600] font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] hover:bg-[teal-700]">
                    Apply filters
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            variant={viewMode === 'map' ? 'default' : 'outline'}
            className={cn(
              'h-10 shrink-0 rounded-full px-4 text-xs font-semibold tracking-[0.08em] transition-all',
              viewMode === 'map'
                ? 'border-teal-600 bg-[teal-600] text-white hover:bg-[teal-700]'
                : 'border-stone-300 bg-white text-stone-600 hover:border-teal-600 hover:text-teal-600'
            )}
          >
            {viewMode === 'list' ? <MapIcon className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {viewMode === 'list' ? 'Map View' : 'List View'}
          </Button>

          <div className="mx-1 h-8 w-px shrink-0 self-center bg-stone-200" />

          {quickFilters.map((filter) => {
            const Icon = filter.icon
            return (
              <Button
                type="button"
                key={filter.label}
                onClick={filter.onClick}
                variant={filter.active ? 'default' : 'outline'}
                className={cn(
                  'h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-all',
                  filter.active
                    ? 'border-teal-600 bg-teal-50 text-teal-600 hover:bg-teal-100'
                    : 'border-stone-300 bg-white text-stone-600 hover:border-teal-600 hover:text-teal-600'
                )}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {filter.label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="relative mt-2 min-h-[500px]">
        <div className="mb-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-4 shadow-[0_10px_24px_rgba(31,44,39,0.04)] sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Results</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">
                {totalResults} {totalResults === 1 ? 'cr\u00E8che' : 'cr\u00E8ches'} found
              </p>
            </div>
            {/* Card view toggle */}
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setCardVariant('full')}
                aria-label="Grid view"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                  cardVariant === 'full'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'bg-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardVariant('compact')}
                aria-label="List view"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                  cardVariant === 'compact'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'bg-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 z-10 flex h-full justify-center rounded-3xl bg-stone-50/60 py-12 backdrop-blur-[2px]"
            >
              <div className="flex h-12 items-center gap-3 rounded-full bg-stone-50 px-6 text-sm font-semibold text-stone-800 shadow-[0_12px_24px_rgba(31,44,39,0.08)]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                Finding results...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'map' ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-xs font-medium text-stone-500">
                {geoStatus === 'granted' ? 'Showing centres near your location' : 'Showing centres in this area'}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={activateMapView}
                className="h-8 rounded-2xl px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-600 hover:bg-teal-50 hover:text-[teal-700]"
              >
                Update my location
              </Button>
            </div>
            <DirectoryMap
              centresWithLocation={centres.filter((centre) => centre.latitude != null && centre.longitude != null)}
              userLocation={exactUserLocation}
              locationHint={geoStatus === 'granted' ? '' : 'Allow location for exact distance'}
              showMap={true}
            />
          </div>
        ) : (
          <div className="cc-stack">
            {centres.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center px-6 py-24 text-center"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-stone-50 shadow-[0_10px_24px_rgba(31,44,39,0.05)]">
                  <Search className="h-10 w-10 text-stone-400" />
                </div>
                <h3 className="text-[1.7rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-stone-800" style={{ fontFamily: 'var(--font-display)' }}>
                  No creches matched that search.
                </h3>
                <p className="mt-2 max-w-xs text-base font-medium text-stone-600">
                  Try another suburb, remove a filter, or search by centre name.
                </p>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-8 h-14 rounded-2xl border-stone-300 bg-white px-8 font-semibold text-stone-500 hover:bg-stone-50"
                >
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <div className={cn(
                cardVariant === 'full'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-2'
              )}>
                {centres.map((centre, index) => {
                  const { age_min_months, age_max_months } = parseAgeGroupsToMonths(centre.age_groups)
                  const cardData: CentreCardData = {
                    id: centre.id,
                    slug: centre.slug,
                    name: centre.name,
                    suburb: centre.suburb ?? null,
                    area: centre.city ?? null,
                    fee_min: centre.monthly_fee_min ?? null,
                    fee_max: centre.monthly_fee_max ?? null,
                    age_min_months,
                    age_max_months,
                    hero_image_url: centre.cover_image_url ?? null,
                    is_verified: Boolean(centre.is_claimed),
                    is_dsd_registered: Boolean(centre.is_registered),
                    vacancy_status: null,
                    is_claimed: Boolean(centre.is_claimed),
                    logo_url: centre.logo_url ?? null,
                    tagline: centre.tagline ?? null,
                    age_groups: centre.age_groups ?? null,
                    contact_whatsapp: centre.contact_whatsapp ?? null,
                    contact_phone: centre.contact_phone ?? null,
                    is_saved: Boolean(centre.is_saved),
                  }
                  return (
                    <motion.div
                      key={centre.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <SharedCentreCard centre={cardData} variant={cardVariant} />
                    </motion.div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-between border-t border-stone-200 pt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Page <span className="text-stone-800">{currentPage}</span> of {totalPages}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    className="h-12 rounded-2xl border-stone-300 bg-white px-6 text-sm font-semibold text-stone-500 transition-all hover:bg-stone-50 active:scale-95 disabled:opacity-30"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="h-12 rounded-2xl bg-[teal-600] px-8 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] transition-all hover:bg-[teal-700] active:scale-95 disabled:opacity-30"
                  >
                    Next page
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!initialFilters.search && !hasActiveFilters && centres.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mt-16 overflow-hidden rounded-[2.2rem] border border-stone-200 bg-stone-50 p-6 shadow-[0_20px_50px_rgba(31,44,39,0.06)] sm:mt-20 sm:p-10"
        >
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(212,147,90,0.16),transparent_32%),radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_40%)]" />

          <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <div>
              <div className="inline-flex items-center rounded-full border border-stone-200 bg-orange-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                Parent profile
              </div>
              <h3
                className="mb-4 mt-5 text-[1.95rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-stone-800 sm:text-[2.55rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Found one you like? Apply in minutes.
              </h3>
              <p className="mb-8 max-w-md text-[15px] font-medium leading-7 text-stone-600 sm:text-[17px]">
                Create an account only when you want to apply. Then keep your documents, replies, and next steps in one place.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-[1.1rem] bg-[teal-600] px-7 text-base font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] hover:bg-[teal-700]"
                >
                  <Link href="/register?next=%2Fdirectory">Create account</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-[1.1rem] border-stone-300 bg-white px-7 text-base font-semibold text-stone-500 hover:bg-stone-50"
                >
                  <Link href="/login?next=%2Fdirectory">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                { label: 'Apply faster', desc: 'Keep documents ready once, then use them again when another centre asks.' },
                { label: 'Stay in control', desc: 'See who replied, what is still missing, and what to do next.' },
                { label: 'Feel safer', desc: 'Pickup verification and live updates keep the day clearer for you.' },
              ].map((feature) => (
                <div key={feature.label} className="flex items-start gap-4 rounded-[1.5rem] border border-stone-200 bg-white p-5 transition-transform hover:-translate-y-0.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    <Check className="h-4 w-4 stroke-[3] text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold leading-tight text-stone-800">{feature.label}</p>
                    <p className="text-sm font-medium leading-relaxed text-stone-600">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}







