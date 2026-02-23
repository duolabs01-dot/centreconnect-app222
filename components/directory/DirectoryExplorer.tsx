'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CentreCard from '@/components/parent/CentreCard'
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
  initialFilters,
  suburbs,
  ageGroups,
}: DirectoryExplorerProps) {
  const [centres, setCentres] = useState(initialCentres)
  const [totalResults, setTotalResults] = useState(initialTotal)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [filters, setFilters] = useState<DirectoryFilters>({
    ...initialFilters,
    page: initialPage,
  })
  const [searchTerm, setSearchTerm] = useState(initialFilters.search ?? '')
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()
  const mountedRef = useRef(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [geoMessage, setGeoMessage] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))

  const centresWithLocation = useMemo(
    () =>
      centres.filter(
        (centre) =>
          Number.isFinite(centre.latitude) && Number.isFinite(centre.longitude)
      ) as DirectoryCentre[],
    [centres]
  )



  const showMap = viewMode === 'map'
  const locationHint =
    geoStatus === 'granted'
      ? 'Your location is pinned in yellow.'
      : geoStatus === 'pending'
        ? 'Requesting location access…'
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

  const applyFilters = (next: Partial<DirectoryFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...next,
      page: next.page ?? 1,
    }))
    setCurrentPage(next.page ?? 1)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      applyFilters({ search: searchTerm, page: 1 })
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchTerm])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    const controller = new AbortController()
    startTransition(async () => {
      try {
        const url = buildFetchUrl(filters)
        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = await response.json()
        setCentres(payload.centres ?? [])
        setTotalResults(payload.totalResults ?? 0)
        setCurrentPage(filters.page ?? 1)
      } catch {
        // ignore
      }
    })

    return () => controller.abort()
  }, [filters, buildFetchUrl])

  const resetFilters = () => {
    setSearchTerm(initialFilters.search ?? '')
    setFilters({
      ...initialFilters,
      page: 1,
    })
    setCurrentPage(1)
  }

  const activateMapView = () => {
    setViewMode('map') // Set view mode to map
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
    applyFilters({ page: next })
  }

  return (
    <section
      className="rounded-2xl border border-cyan-100/80 bg-white/90 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm"
      aria-live="polite"
    >
      <div className="grid gap-3 lg:grid-cols-6">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Live search centres as you type"
          className="lg:col-span-2"
        />
        <div className="lg:col-span-3 text-xs text-muted-foreground">
          {isPending ? 'Searching results…' : 'Results update instantly as you type.'}
        </div>
        <select
          value={filters.suburb ?? ''}
          onChange={(event) => applyFilters({ suburb: event.target.value || undefined })}
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
          value={filters.age ?? ''}
          onChange={(event) => applyFilters({ age: event.target.value || undefined })}
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
          value={filters.fee ?? ''}
          onChange={(event) => applyFilters({ fee: event.target.value || undefined })}
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
            checked={Boolean(filters.subsidy)}
            onChange={(event) => applyFilters({ subsidy: event.target.checked || undefined })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Subsidy accepted
        </label>
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
          Showing {centres.length} of {totalResults} centre{totalResults === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Page {currentPage} of {totalPages}
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
            <p className="m-4 text-sm font-semibold text-slate-700">Updating results…</p>
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
        {centres.length === 0 && !showMap ? (
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centres.map((centre) => (
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
        ) : null}
      </div>
    </section>
  )
}
