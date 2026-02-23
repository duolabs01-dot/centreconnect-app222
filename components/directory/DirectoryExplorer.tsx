'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
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
      <div className="h-96 rounded-2xl bg-slate-100 animate-pulse
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

export default function DirectoryExplorer({
  initialCentres,
  totalResults: initialTotal,
  pageSize,
  initialPage,
  suburbs,
  ageGroups,
}: DirectoryExplorerProps) {
  const [centres, setCentres] = useState(initialCentres)
  const [totalResults, setTotalResults] = useState(initialTotal)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const [search, setSearch] = useState('')
  const [selectedSuburb, setSelectedSuburb] = useState('')
  const [selectedAge, setSelectedAge] = useState('')
  const [selectedFee, setSelectedFee] = useState('')
  const [selectedSubsidy, setSelectedSubsidy] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()
  const mountedRef = useRef(false)

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [geoMessage, setGeoMessage] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))

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

  const centresWithLocation = useMemo(
    () =>
      filtered.filter(
        (centre) =>
          Number.isFinite(centre.latitude) && Number.isFinite(centre.longitude)
      ) as DirectoryCentre[],
    [filtered]
  )

  const showMap = viewMode === 'map'
  const locationHint =
    geoStatus === 'granted'
      ? 'Your location is pinned in yellow.'
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
    if (!mountedRef.current) {
      mountedRef.current = true
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
      { timeout: 8000 }
    )
  }

  const handlePageChange = (next: number) => {
    setCurrentPage(next)
  }

  return (
    <section
      className="rounded-2xl border border-cyan-100/80 bg-white/90 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm"
      aria-live="polite"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search centres or suburbs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {filtersOpen ? 'Hide filters' : 'Filter centres'}
          {(selectedSuburb || selectedAge || selectedFee) && (
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
          )}
        </button>

        <div className={cn('grid gap-3 md:grid md:grid-cols-3', filtersOpen ? 'grid' : 'hidden md:grid')}>
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

          <label className="flex items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold">
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
        <p className="text-xs text-slate-500">
          {isPending ? 'Searching results...' : 'Results update instantly as you type.'}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Page {currentPage} of {totalPages}
        </p>
        <p className="text-xs text-slate-500">
          Showing {filtered.length} of {totalResults} centre{totalResults === 1 ? '' : 's'}
        </p>
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

      <div className="relative mt-4">
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((centre) => (
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
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
