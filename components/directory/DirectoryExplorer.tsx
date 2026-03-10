'use client'

import { useEffect, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Map as MapIcon, LayoutGrid, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CentreCard from '@/components/parent/CentreCard'
import { cn } from '@/lib/utils'
import type { DirectoryCentre } from '@/types/directory-centre'
import { useBottomNav } from '@/lib/context/BottomNavProvider'
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
    <div className="flex h-96 animate-pulse-slow items-center justify-center rounded-[2rem] border border-[#E6DDD1] bg-[#FFFDF9]">
      <p className="text-sm font-medium text-[#7C8682]">Loading map...</p>
    </div>
  ),
})

type DirectoryFilters = {
  search?: string
  suburb?: string
  age?: string
  fee?: string
  subsidy?: boolean
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

  const [search, setSearch] = useState(initialFilters.search ?? '')
  const [selectedSuburb, setSelectedSuburb] = useState(initialFilters.suburb ?? '')
  const [selectedAge, setSelectedAge] = useState(initialFilters.age ?? '')
  const [selectedFee, setSelectedFee] = useState(initialFilters.fee ?? '')
  const [selectedSubsidy, setSelectedSubsidy] = useState(initialFilters.subsidy ? 'true' : '')
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search ?? '')
  const [isPending, startTransition] = useTransition()
  const { setVisible } = useBottomNav()
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle')

  useEffect(() => {
    setVisible(!isFilterSheetOpen)
    return () => setVisible(true)
  }, [isFilterSheetOpen, setVisible])

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const hasActiveFilters = Boolean(selectedSuburb || selectedAge || selectedFee || selectedSubsidy === 'true')

  const quickFilters = [
    { label: 'Near Me', active: geoStatus === 'granted', onClick: () => activateMapView() },
    {
      label: 'Alexandra',
      active: selectedSuburb === 'Alexandra',
      onClick: () => {
        setSelectedSuburb(selectedSuburb === 'Alexandra' ? '' : 'Alexandra')
        setCurrentPage(1)
      },
    },
    {
      label: 'Subsidy',
      active: selectedSubsidy === 'true',
      onClick: () => {
        setSelectedSubsidy(selectedSubsidy === 'true' ? '' : 'true')
        setCurrentPage(1)
      },
    },
    {
      label: 'Infants',
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

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedSuburb) params.set('suburb', selectedSuburb)
    if (selectedAge) params.set('age', selectedAge)
    if (selectedFee) params.set('fee', selectedFee)
    if (selectedSubsidy === 'true') params.set('subsidy', 'true')
    if (currentPage > 1) params.set('page', String(currentPage))

    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedSubsidy, currentPage, pathname, router])

  useEffect(() => {
    const controller = new AbortController()
    startTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (selectedSuburb) params.set('suburb', selectedSuburb)
        if (selectedAge) params.set('age', selectedAge)
        if (selectedFee) params.set('fee', selectedFee)
        if (selectedSubsidy === 'true') params.set('subsidy', 'true')
        params.set('page', String(currentPage))

        const res = await fetch(`/api/directory/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) return
        const payload = await res.json()
        setCentres(payload.centres ?? [])
        setTotalResults(payload.totalResults ?? 0)
      } catch {}
    })
    return () => controller.abort()
  }, [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedSubsidy, currentPage])

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
    setSelectedSubsidy('')
    setCurrentPage(1)
  }

  return (
    <div className="cc-stack overflow-x-clip text-[#22312E]" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="sticky top-[84px] z-[60] mx-0 rounded-[1.7rem] border border-[#E8DDD0] bg-[#FFFDF9]/95 p-3 shadow-[0_12px_32px_rgba(31,44,39,0.06)] backdrop-blur-xl sm:static sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C8682]" />
            <Input
              type="text"
              placeholder="Search by centre name or suburb..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="h-14 rounded-2xl border-[#DDD5C8] bg-white pl-11 pr-4 text-base font-medium text-[#22312E] shadow-none focus-visible:border-[#0D9488] focus-visible:ring-2 focus-visible:ring-[#0D9488]/10"
            />
          </div>

          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-2xl border-[#DDD5C8] bg-white text-[#5B6966] shadow-none transition-all hover:border-[#0D9488] hover:text-[#0D9488] active:scale-90"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2.5rem] border-t-0 bg-[#FFFDF9] px-6 pb-12 pt-8 shadow-[0_-20px_50px_rgba(0,0,0,0.08)]">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-[2rem] tracking-[-0.03em] text-[#1F2D29]" style={{ fontFamily: 'var(--font-display)' }}>
                  Refine results
                </SheetTitle>
              </SheetHeader>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7C8682]">Location</label>
                  <select
                    value={selectedSuburb}
                    onChange={(e) => setSelectedSuburb(e.target.value)}
                    className="cc-native-field h-14 w-full rounded-2xl border border-[#DDD5C8] bg-white px-4 text-base font-medium text-[#22312E] outline-none focus:border-[#0D9488]"
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
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7C8682]">Monthly Budget</label>
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
                            ? 'border-[#0D9488] bg-[#EAF6F2] text-[#0D9488] hover:bg-[#DDF2EC]'
                            : 'border-[#E6DDD1] bg-white text-[#5B6966] hover:bg-[#FAF8F4]'
                        )}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7C8682]">Child&apos;s Age Group</label>
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
                            ? 'border-[#0D9488] bg-[#0D9488] text-white hover:bg-[#0B857A] shadow-[0_12px_24px_rgba(13,148,136,0.18)]'
                            : 'border-[#E6DDD1] bg-white text-[#5B6966] hover:bg-[#FAF8F4]'
                        )}
                      >
                        {age.replace(/(\d+)([my])/g, '$1$2 old')}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex h-16 w-full cursor-pointer items-center justify-between rounded-2xl border border-[#E6DDD1] bg-white px-5 transition-colors hover:bg-[#FAF8F4]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FDF0E6]">
                        <Check className="h-4 w-4 stroke-[3] text-[#D4935A]" />
                      </div>
                      <span className="text-sm font-semibold text-[#22312E]">Accepts government subsidy</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedSubsidy === 'true'}
                      onChange={(e) => setSelectedSubsidy(e.target.checked ? 'true' : '')}
                      className="h-6 w-6 rounded-lg border-[#DDD5C8] text-[#0D9488] focus:ring-[#0D9488]"
                    />
                  </label>
                </div>
              </div>

              <SheetFooter className="mt-10 gap-3">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="h-14 flex-1 rounded-2xl border-[#DDD5C8] bg-white font-semibold text-[#4E5D59] hover:bg-[#FAF8F4]"
                >
                  Reset all
                </Button>
                <SheetClose asChild>
                  <Button className="h-14 flex-1 rounded-2xl bg-[#0D9488] font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] hover:bg-[#0B857A]">
                    Apply filters
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
          <Button
            type="button"
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            variant={viewMode === 'map' ? 'default' : 'outline'}
            className={cn(
              'h-10 shrink-0 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.16em] transition-all',
              viewMode === 'map'
                ? 'border-[#0D9488] bg-[#0D9488] text-white hover:bg-[#0B857A]'
                : 'border-[#DDD5C8] bg-white text-[#5B6966] hover:border-[#0D9488] hover:text-[#0D9488]'
            )}
          >
            {viewMode === 'list' ? <MapIcon className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {viewMode === 'list' ? 'Map View' : 'List View'}
          </Button>

          <div className="mx-1 h-8 w-px shrink-0 self-center bg-[#E6DDD1]" />

          {quickFilters.map((filter) => (
            <Button
              type="button"
              key={filter.label}
              onClick={filter.onClick}
              variant={filter.active ? 'default' : 'outline'}
              className={cn(
                'h-10 shrink-0 whitespace-nowrap rounded-full px-5 text-xs font-medium transition-all',
                filter.active
                  ? 'border-[#0D9488] bg-[#EAF6F2] text-[#0D9488] hover:bg-[#DDF2EC]'
                  : 'border-[#DDD5C8] bg-white text-[#5B6966] hover:border-[#0D9488] hover:text-[#0D9488]'
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative mt-2 min-h-[500px]">
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 z-10 flex h-full justify-center rounded-3xl bg-[#FAF8F4]/60 py-12 backdrop-blur-[2px]"
            >
              <div className="flex h-12 items-center gap-3 rounded-full bg-[#FFFDF9] px-6 text-sm font-semibold text-[#22312E] shadow-[0_12px_24px_rgba(31,44,39,0.08)]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0D9488] border-t-transparent" />
                Finding results...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'map' ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-xs font-medium text-[#7B827E]">
                {geoStatus === 'granted' ? 'Showing centres near your location' : 'Mappable centres in this area'}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={activateMapView}
                className="h-8 rounded-2xl px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0D9488] hover:bg-[#EAF6F2] hover:text-[#0B857A]"
              >
                Update my location
              </Button>
            </div>
            <DirectoryMap
              centresWithLocation={centres.filter((centre) => centre.latitude && centre.longitude)}
              userLocation={userLocation}
              locationHint={geoStatus === 'granted' ? '' : 'Allow location for better results'}
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
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#FFFDF9] shadow-[0_10px_24px_rgba(31,44,39,0.05)]">
                  <Search className="h-10 w-10 text-[#B1BAB6]" />
                </div>
                <h3 className="text-[1.8rem] leading-tight text-[#1F2D29]" style={{ fontFamily: 'var(--font-display)' }}>
                  No crèches matched that search.
                </h3>
                <p className="mt-2 max-w-xs text-base font-medium text-[#66736F]">
                  Try another suburb, remove a filter, or search by centre name.
                </p>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-8 h-14 rounded-2xl border-[#DDD5C8] bg-white px-8 font-semibold text-[#4E5D59] hover:bg-[#FAF8F4]"
                >
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {centres.map((centre, index) => (
                  <motion.div
                    key={centre.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <CentreCard
                      {...centre}
                      isPilot={centre.is_pilot}
                      isFeatured={centre.is_featured}
                      capacity={centre.capacity ?? undefined}
                      age_groups={centre.age_groups ?? []}
                      tagline={centre.tagline ?? undefined}
                      logo_url={centre.logo_url ?? undefined}
                      cover_image_url={centre.cover_image_url ?? undefined}
                      viewerRole={viewerRole}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-between border-t border-[#E6DDD1] pt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B827E]">
                  Page <span className="text-[#22312E]">{currentPage}</span> of {totalPages}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    className="h-12 rounded-2xl border-[#DDD5C8] bg-white px-6 text-sm font-semibold text-[#4E5D59] transition-all hover:bg-[#FAF8F4] active:scale-95 disabled:opacity-30"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="h-12 rounded-2xl bg-[#0D9488] px-8 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] transition-all hover:bg-[#0B857A] active:scale-95 disabled:opacity-30"
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
          className="relative mt-16 overflow-hidden rounded-[2.2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-6 shadow-[0_20px_50px_rgba(31,44,39,0.06)] sm:mt-20 sm:p-10"
        >
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(212,147,90,0.16),transparent_32%),radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_40%)]" />

          <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#E2D4C1] bg-[#FDF0E6] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B47642]">
                Parent profile
              </div>
              <h3
                className="mb-4 mt-5 text-[2rem] leading-[1.05] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.7rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Found a few you like? Keep your next steps simple.
              </h3>
              <p className="mb-8 max-w-md text-[15px] font-medium leading-7 text-[#5F6C68] sm:text-[17px]">
                Save your documents once, apply from your phone, and track each reply without going back to WhatsApp chats and paper forms.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-[1.1rem] bg-[#0D9488] px-7 text-base font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] hover:bg-[#0B857A]"
                >
                  <Link href="/register?next=%2Fdirectory">Create Parent Profile</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-[1.1rem] border-[#DDD5C8] bg-white px-7 text-base font-semibold text-[#4E5D59] hover:bg-[#FAF8F4]"
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
                <div key={feature.label} className="flex items-start gap-4 rounded-[1.5rem] border border-[#E7DDD1] bg-white p-5 transition-transform hover:-translate-y-0.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDF0E6]">
                    <Check className="h-4 w-4 stroke-[3] text-[#D4935A]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold leading-tight text-[#22312E]">{feature.label}</p>
                    <p className="text-sm font-medium leading-relaxed text-[#66736F]">{feature.desc}</p>
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




