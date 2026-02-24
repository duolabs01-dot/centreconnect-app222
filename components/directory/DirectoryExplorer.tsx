'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import CentreCard from '@/components/parent/CentreCard'
import { cn } from '@/lib/utils'
import type { DirectoryCentre } from '@/types/directory-centre'

const DirectoryMap = dynamic(
  () => import('./DirectoryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 rounded-2xl bg-slate-100 animate-pulse-slow
                      flex items-center justify-center">
        <p className="text-slate-400 text-sm font-medium">
          Loading map...
        </p>
      </div>
    ),
  }
)

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
}

const FEE_OPTIONS = [
  { label: 'Any fee', value: '' },
  { label: 'Under R800', value: '800' },
  { label: 'Under R1200', value: '1200' },
  { label: 'Under R2000', value: '2000' },
]

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function distanceKm(
  userLng: number,
  userLat: number,
  centreLng: number,
  centreLat: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(centreLat - userLat)
  const dLon = toRad(centreLng - userLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(centreLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export default function DirectoryExplorer({
  initialCentres,
  totalResults: initialTotal,
  pageSize,
  initialPage,
  initialFilters,
  suburbs,
  ageGroups,
}: DirectoryExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()

  const initialSearch = (initialFilters.search ?? '').trim()
  const initialSuburb = initialFilters.suburb ?? ''
  const initialAge = initialFilters.age ?? ''
  const initialFee = initialFilters.fee ?? ''
  const initialSubsidy = initialFilters.subsidy ? 'true' : ''

  const [centres, setCentres] = useState(initialCentres)
  const [totalResults, setTotalResults] = useState(initialTotal)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const [search, setSearch] = useState(initialSearch)
  const [selectedSuburb, setSelectedSuburb] = useState(initialSuburb)
  const [selectedAge, setSelectedAge] = useState(initialAge)
  const [selectedFee, setSelectedFee] = useState(initialFee)
  const [selectedSubsidy, setSelectedSubsidy] = useState(initialSubsidy)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()
  const fetchMountedRef = useRef(false)
  const urlSyncMountedRef = useRef(false)

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [geoMessage, setGeoMessage] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const hasActiveFilters = Boolean(selectedSuburb || selectedAge || selectedFee || selectedSubsidy === 'true')

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    const feeCap = Number(selectedFee)

    return centres.filter((centre) => {
      if (
        searchValue &&
        !centre.name.toLowerCase().includes(searchValue) &&
        !centre.suburb?.toLowerCase().includes(searchValue)
      ) {
        return false
      }

      if (selectedSuburb && centre.suburb !== selectedSuburb) {
        return false
      }

      if (selectedAge && !centre.age_groups?.includes(selectedAge)) {
        return false
      }

      if (!Number.isNaN(feeCap) && selectedFee) {
        const minFee = centre.monthly_fee_min
        const maxFee = centre.monthly_fee_max
        const matchesFee =
          (typeof minFee === 'number' && minFee <= feeCap) ||
          (typeof maxFee === 'number' && maxFee <= feeCap)

        if (!matchesFee) {
          return false
        }
      }

      if (selectedSubsidy === 'true' && !centre.subsidy_accepted) {
        return false
      }

      return true
    })
  }, [centres, search, selectedSuburb, selectedAge, selectedFee, selectedSubsidy])

  const centresWithLocation = useMemo(() => {
    return filtered.flatMap((centre) => {
      const latitude = toFiniteNumber(centre.latitude)
      const longitude = toFiniteNumber(centre.longitude)
      if (latitude == null || longitude == null) return []
      return [{ ...centre, latitude, longitude }]
    })
  }, [filtered])

  const showMap = viewMode === 'map'
  const locationHint =
    centresWithLocation.length === 0
      ? 'No mapped centres for these filters yet. Try resetting filters.'
      : geoStatus === 'granted'
        ? 'Showing centres closest to your location. Your pin is yellow.'
        : geoStatus === 'pending'
          ? 'Requesting location access...'
          : geoMessage ?? 'Allow location access to showcase your pin.'

  const buildFetchUrl = useCallback(
    (query: DirectoryFilters) => {
      const params = new URLSearchParams()
      if (query.search) params.set('search', query.search)
      if (query.suburb) params.set('suburb', query.suburb)
      if (query.age) params.set('age', query.age)
      if (query.fee) params.set('fee', query.fee)
      if (query.subsidy) params.set('subsidy', 'true')
      params.set('page', String(query.page ?? 1))
      return `/api/directory/search?${params.toString()}`
    },
    []
  )

  const apiFilters = useMemo<DirectoryFilters>(
    () => ({
      search: debouncedSearch || undefined,
      suburb: selectedSuburb || undefined,
      age: selectedAge || undefined,
      fee: selectedFee || undefined,
      subsidy: selectedSubsidy === 'true' ? true : undefined,
      page: currentPage,
    }),
    [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedSubsidy, currentPage]
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (!urlSyncMountedRef.current) {
      urlSyncMountedRef.current = true
      return
    }

    const params = new URLSearchParams()
    const trimmedSearch = search.trim()
    if (trimmedSearch) params.set('search', trimmedSearch)
    if (selectedSuburb) params.set('suburb', selectedSuburb)
    if (selectedAge) params.set('age', selectedAge)
    if (selectedFee) params.set('fee', selectedFee)
    if (selectedSubsidy === 'true') params.set('subsidy', 'true')
    if (currentPage > 1) params.set('page', String(currentPage))

    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [search, selectedSuburb, selectedAge, selectedFee, selectedSubsidy, currentPage, pathname, router])

  useEffect(() => {
    if (!fetchMountedRef.current) {
      fetchMountedRef.current = true
      return
    }

    const controller = new AbortController()
    startTransition(async () => {
      try {
        const url = buildFetchUrl(apiFilters)
        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = await response.json()
        setCentres(payload.centres ?? [])
        setTotalResults(payload.totalResults ?? 0)
      } catch {
        // ignore
      }
    })

    return () => controller.abort()
  }, [apiFilters, buildFetchUrl])

  const resetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setSelectedSuburb('')
    setSelectedAge('')
    setSelectedFee('')
    setSelectedSubsidy('')
    setFiltersOpen(false)
    setCurrentPage(1)
  }

  const activateMapView = () => {
    setViewMode('map')

    if (!('geolocation' in navigator)) {
      setGeoStatus('denied')
      setGeoMessage('Geolocation not supported on this device')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
        setGeoStatus('granted')
        setGeoMessage(null)
      },
      (err) => {
        setGeoStatus('denied')
        setGeoMessage(err.message || 'Location access denied.')
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 180000 }
    )
  }

  const handlePageChange = (next: number) => {
    setCurrentPage(next)
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-cyan-100/80 bg-white/90 p-3.5 shadow-[var(--shadow-elevation-3)] backdrop-blur-sm sm:p-4 lg:p-5"
      aria-live="polite"
    >
      <div className="space-y-2.5 sm:space-y-3">
        <div className="sticky top-2 z-30 -mx-1 rounded-2xl border border-cyan-100/80 bg-white/95 p-2 shadow-[var(--shadow-elevation-2)] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search centres or suburbs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm font-medium focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 md:hidden"
            >
              <span className="relative inline-flex">
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-500" />
                ) : null}
              </span>
              Filter
            </button>
          </div>

          <div
            className={cn(
              'grid gap-3 overflow-hidden transition-all duration-300 ease-out md:grid-cols-3 md:overflow-visible',
              filtersOpen
                ? 'mt-2 max-h-96 border-t border-slate-100 pt-2 opacity-100 md:mt-0 md:max-h-none md:border-0 md:pt-0'
                : 'max-h-0 opacity-0 md:mt-2 md:max-h-none md:opacity-100'
            )}
          >
            <select
              value={selectedSuburb}
              onChange={(event) => {
                setSelectedSuburb(event.target.value)
                setCurrentPage(1)
              }}
              className="cc-native-field"
            >
              <option value="">All suburbs</option>
              {suburbs.map((suburb) => (
                <option key={suburb} value={suburb}>
                  {suburb}
                </option>
              ))}
            </select>

            <select
              value={selectedAge}
              onChange={(event) => {
                setSelectedAge(event.target.value)
                setCurrentPage(1)
              }}
              className="cc-native-field"
            >
              <option value="">All age groups</option>
              {ageGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>

            <select
              value={selectedFee}
              onChange={(event) => {
                setSelectedFee(event.target.value)
                setCurrentPage(1)
              }}
              className="cc-native-field"
            >
              {FEE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold md:col-span-3">
              <input
                type="checkbox"
                checked={selectedSubsidy === 'true'}
                onChange={(event) => {
                  setSelectedSubsidy(event.target.checked ? 'true' : '')
                  setCurrentPage(1)
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
              Subsidy accepted
            </label>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5 md:mt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            List view
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'map' ? 'default' : 'outline'}
            onClick={activateMapView}
          >
            Map view
          </Button>
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
        <p className="text-xs text-slate-500 md:text-right">
          {isPending ? 'Searching results...' : 'Results update instantly as you type.'}
        </p>
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5 border-t border-slate-100 pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of {totalResults} centre{totalResults === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="relative mt-3.5 sm:mt-4">
        {isPending && (
          <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-white/80">
            <p className="m-4 text-sm font-semibold text-slate-700">Updating results...</p>
          </div>
        )}

        {showMap && (
          <DirectoryMap
            centresWithLocation={centresWithLocation}
            userLocation={userLocation}
            locationHint={locationHint}
            showMap={showMap}
          />
        )}
        {showMap && userLocation && centresWithLocation.length > 0 && (
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-cyan-200 bg-cyan-50 py-3 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100"
            onClick={() => {
              const nearest = [...centresWithLocation]
                .filter((c) => c.latitude && c.longitude)
                .sort(
                  (a, b) =>
                    distanceKm(userLocation[0], userLocation[1], a.longitude!, a.latitude!) -
                    distanceKm(userLocation[0], userLocation[1], b.longitude!, b.latitude!)
                )[0]

              if (nearest) {
                setViewMode('list')
                setSelectedSuburb(nearest.suburb ?? '')
                setCurrentPage(1)
              }
            }}
          >
            Show nearest centres first
          </button>
        )}

        {filtered.length === 0 && !showMap ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">No centres match that search</p>
            <p className="text-xs text-slate-500">
              Try another suburb, age group, or uncheck the subsidy filter to broaden the results.
            </p>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          </div>
        ) : !showMap ? (
          <>
            <p className="px-1 text-xs font-medium text-slate-400">
              {filtered.length} {filtered.length === 1 ? 'centre' : 'centres'} found
            </p>

            <div className="mt-3.5 grid gap-3 sm:mt-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {filtered.map((centre) => {
                const latitude = toFiniteNumber(centre.latitude)
                const longitude = toFiniteNumber(centre.longitude)
                const distanceLabel =
                  userLocation && latitude != null && longitude != null
                    ? `${formatDistance(distanceKm(userLocation[0], userLocation[1], longitude, latitude))} away`
                    : null

                return (
                  <CentreCard
                    key={centre.id}
                    id={centre.id}
                    slug={centre.slug}
                    name={centre.name}
                    tagline={centre.tagline ?? undefined}
                    suburb={centre.suburb}
                    city={centre.city}
                    capacity={centre.capacity ?? undefined}
                    age_groups={centre.age_groups ?? []}
                    is_registered={centre.is_registered}
                    logo_url={centre.logo_url ?? undefined}
                    cover_image_url={centre.cover_image_url ?? undefined}
                    subsidy_accepted={centre.subsidy_accepted}
                    fees_display_mode={centre.fees_display_mode}
                    distanceLabel={distanceLabel ?? undefined}
                  />
                )
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}



