'use client'

import { useEffect, useMemo, useState } from 'react'

import { LayoutGrid, List } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SharedCentreCard } from '@/components/shared/CentreCard'
import { type CentreCardData, parseAgeGroupsToMonths } from '@/types/centre-card'
import { useCardViewPreference } from '@/lib/hooks/use-card-view-preference'
import { getLocationReference, resolveCentreCoordinates } from '@/lib/geo/centre-location'
import {
  defaultConfidenceForSource,
  isTrustedDistanceSource,
  type CentreCoordinateConfidence,
  type CentreCoordinateSource,
} from '@/lib/geo/centre-location-metadata'

type DiscoverCentre = {
  id: string
  slug?: string
  name: string
  tagline?: string
  city?: string
  suburb?: string
  cover_image_url?: string
  logo_url?: string
  distanceLabel?: string
  fee_min?: number | null
  fee_max?: number | null
  age_groups: string[]
  latitude?: number | null
  longitude?: number | null
  contact_whatsapp?: string | null
  contact_phone?: string | null
  is_claimed?: boolean
  is_registered?: boolean
  is_pilot?: boolean
  is_featured?: boolean
  distanceMeters?: number
  coordinateSource?: CentreCoordinateSource
  coordinateConfidence?: CentreCoordinateConfidence | null
}

const FALLBACK_CENTRES: DiscoverCentre[] = [
  {
    id: 'centre-local-1',
    name: 'Community Learning Creche',
    city: 'Johannesburg',
    suburb: 'Alexandra',
    age_groups: ['0-2', '2-4', '5-6'],
    fee_min: null,
    fee_max: null,
    is_claimed: false,
    is_registered: false,
  },
  {
    id: 'centre-local-2',
    name: 'Sunrise Creche Home',
    city: 'Johannesburg',
    suburb: 'Wynberg',
    age_groups: ['2-4', '5-6'],
    fee_min: null,
    fee_max: null,
    is_claimed: false,
    is_registered: false,
  },
]

function haversine(lat1: number, lon1: number, lat2: number | null, lon2: number | null) {
  if (lat2 == null || lon2 == null) return Number.POSITIVE_INFINITY
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return null
  if (meters < 1000) return `${Math.round(meters)} m away`
  return `${(meters / 1000).toFixed(1)} km away`
}

export default function ParentDiscoverClient() {
  const [query, setQuery] = useState('')
  const [centres, setCentres] = useState<DiscoverCentre[]>(FALLBACK_CENTRES)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState({ lat: -26.1881, lng: 28.0473 })
  const [selectedSuburb, setSelectedSuburb] = useState('')
  const [locationMode, setLocationMode] = useState<'device' | 'fallback'>('fallback')
  const [savedCentreIds, setSavedCentreIds] = useState<Set<string>>(new Set())
  const { variant: cardVariant, setVariant: setCardVariant } = useCardViewPreference()

  useEffect(() => {
    let mounted = true

    const loadCentres = async () => {
      try {
        const response = await fetch('/api/directory/search', { cache: 'no-store' })
        const payload = response.ok ? await response.json() : null
        const apiCentres = Array.isArray(payload?.centres) ? payload.centres : []

        if (!mounted) return

        if (apiCentres.length > 0) {
          const mapped = apiCentres.map((centre: Record<string, unknown>) => {
            const resolvedCoordinates = resolveCentreCoordinates({
              latitude: (centre.latitude as number | null | undefined) ?? null,
              longitude: (centre.longitude as number | null | undefined) ?? null,
              slug: (centre.slug as string | null | undefined) ?? null,
              suburb: (centre.suburb as string | null | undefined) ?? null,
              city: (centre.city as string | null | undefined) ?? null,
            })

            return {
              id: String(centre.id ?? ''),
              slug: (centre.slug as string | null | undefined) ?? undefined,
              name: String(centre.name ?? 'Creche'),
              tagline: (centre.tagline as string | null | undefined) ?? undefined,
              city: (centre.city as string | null | undefined) ?? undefined,
              suburb: (centre.suburb as string | null | undefined) ?? undefined,
              cover_image_url: (centre.cover_image_url as string | null | undefined) ?? undefined,
              logo_url: (centre.logo_url as string | null | undefined) ?? undefined,
              fee_min: (centre.monthly_fee_min as number | null | undefined) ?? null,
              fee_max: (centre.monthly_fee_max as number | null | undefined) ?? null,
              age_groups: Array.isArray(centre.age_groups)
                ? (centre.age_groups as string[])
                : ['0-2', '2-4', '5-6'],
              latitude: resolvedCoordinates.latitude,
              longitude: resolvedCoordinates.longitude,
              coordinateSource: resolvedCoordinates.source,
              coordinateConfidence: defaultConfidenceForSource(resolvedCoordinates.source),
              contact_whatsapp: (centre.contact_whatsapp as string | null | undefined) ?? null,
              contact_phone: (centre.contact_phone as string | null | undefined) ?? null,
              is_claimed: Boolean(centre.is_claimed),
              is_registered: Boolean(centre.is_registered),
              is_pilot: Boolean(centre.is_pilot),
              is_featured: Boolean(centre.is_featured),
            }
          }) as DiscoverCentre[]
          setCentres(mapped)

          const savedFromApi = apiCentres
            .filter((centre: Record<string, unknown>) => Boolean(centre.is_saved))
            .map((centre: Record<string, unknown>) => String(centre.id ?? ''))
            .filter(Boolean)
          if (savedFromApi.length > 0) {
            setSavedCentreIds(new Set(savedFromApi))
          }
        } else {
          setCentres(FALLBACK_CENTRES)
        }
      } catch {
        if (!mounted) return
        setCentres(FALLBACK_CENTRES)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadCentres()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadShortlistSummary = async () => {
      try {
        const response = await fetch('/api/parent/shortlist/summary', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        if (!active) return
        setSavedCentreIds(new Set((payload?.centreIds ?? []).map((value: string) => String(value))))
      } catch {
        // Public browsing can continue without saved-state hydration.
      }
    }

    const handleShortlistUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ centreId?: string; saved?: boolean }>).detail
      const centreId = detail?.centreId
      if (!centreId) return
      setSavedCentreIds((current) => {
        const next = new Set(current)
        if (detail.saved) {
          next.add(centreId)
        } else {
          next.delete(centreId)
        }
        return next
      })
    }

    void loadShortlistSummary()
    window.addEventListener('cc:shortlist-updated', handleShortlistUpdated as EventListener)
    return () => {
      active = false
      window.removeEventListener('cc:shortlist-updated', handleShortlistUpdated as EventListener)
    }
  }, [])

  useEffect(() => {
    if (locationMode === 'device') return
    const [lng, lat] = getLocationReference({ suburb: selectedSuburb || centres[0]?.suburb || '', city: centres[0]?.city })
    setLocation({ lat, lng })
  }, [centres, locationMode, selectedSuburb])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationMode('device')
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        setLocationMode('fallback')
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 }
    )
  }, [])

  const centresWithDistance = useMemo(() => {
    return centres
      .map((centre) => {
        const distanceMeters = haversine(location.lat, location.lng, centre.latitude ?? null, centre.longitude ?? null)
        return {
          ...centre,
          distanceMeters,
          distanceLabel: Number.isFinite(distanceMeters)
            ? `${formatDistance(distanceMeters) ?? ''}${
                !isTrustedDistanceSource(centre.coordinateSource ?? null, centre.coordinateConfidence ?? null) ? ' (approx)' : ''
              }`.trim()
            : undefined,
        }
      })
      .sort((a, b) => {
        const aPromoted = Boolean(a.is_featured || a.is_pilot)
        const bPromoted = Boolean(b.is_featured || b.is_pilot)
        if (aPromoted && !bPromoted) return -1
        if (!aPromoted && bPromoted) return 1
        return (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY)
      })
  }, [centres, location])

  const suburbOptions = useMemo(() => {
    return Array.from(
      new Set(
        centresWithDistance
          .map((centre) => centre.suburb?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [centresWithDistance])

  const filteredCentres = useMemo(() => {
    const base = selectedSuburb
      ? centresWithDistance.filter((centre) => (centre.suburb ?? '').toLowerCase() === selectedSuburb.toLowerCase())
      : centresWithDistance

    if (!query.trim()) return base
    const needle = query.toLowerCase().trim()
    return base.filter(
      (centre) =>
        centre.name.toLowerCase().includes(needle) ||
        (centre.suburb ?? '').toLowerCase().includes(needle) ||
        (centre.city ?? '').toLowerCase().includes(needle)
    )
  }, [centresWithDistance, query, selectedSuburb])

  const promotedCentres = useMemo(
    () => filteredCentres.filter((centre) => Boolean(centre.is_featured || centre.is_pilot)),
    [filteredCentres]
  )

  const listCentres = useMemo(
    () => filteredCentres.filter((centre) => !centre.is_featured && !centre.is_pilot),
    [filteredCentres]
  )

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-8 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-700">Nearby cr&egrave;ches</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Find a cr&egrave;che you can feel good about</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Browse nearby cr&egrave;ches, save the ones you love, and open a full profile before you apply.
          </p>

          <div className="space-y-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            <p>
              {locationMode === 'device'
                ? 'Showing cr\u00e8ches closest to your current location.'
                : 'Showing centres across Johannesburg. Allow location to see exact distance from you.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Input
                placeholder="Search by suburb, area, or cr\u00e8che name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="bg-white text-slate-900 placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedSuburb}
              onChange={(event) => setSelectedSuburb(event.target.value)}
              className="cc-native-field h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-500"
            >
              <option value="">All Johannesburg suburbs</option>
              {suburbOptions.map((suburb) => (
                <option key={suburb} value={suburb}>
                  {suburb}
                </option>
              ))}
            </select>

            {selectedSuburb ? (
              <Button variant="outline" className="rounded-2xl px-4 text-sm font-semibold" onClick={() => setSelectedSuburb('')}>
                Clear suburb
              </Button>
            ) : null}
          </div>
        </header>

        {/* Results bar */}
        <div className="flex items-center justify-between rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Results</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">
              {loading ? 'Loading\u2026' : `${filteredCentres.length} cr\u00e8che${filteredCentres.length === 1 ? '' : 's'} found`}
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            <button
              onClick={() => setCardVariant('full')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${cardVariant === 'full' ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCardVariant('compact')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${cardVariant === 'compact' ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className={cardVariant === 'full' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`animate-pulse rounded-2xl border border-slate-200 bg-white ${cardVariant === 'full' ? 'h-[360px]' : 'h-[88px]'}`}
              />
            ))}
          </div>
        ) : filteredCentres.length === 0 ? (
          <section className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No matches yet</h2>
            <p className="max-w-xs text-sm text-slate-600">Try a different suburb or clear your search.</p>
            <Button variant="outline" className="rounded-2xl px-6 text-sm font-semibold" onClick={() => setQuery('')}>
              Reset search
            </Button>
          </section>
        ) : (
          <div className="space-y-4">
            {promotedCentres.length > 0 ? (
              <div>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Recommended near you</p>
                <div className={cardVariant === 'full' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
                  {promotedCentres.map((centre) => {
                    const { age_min_months, age_max_months } = parseAgeGroupsToMonths(centre.age_groups)
                    const cardData: CentreCardData = {
                      id: centre.id,
                      slug: centre.slug ?? centre.id,
                      name: centre.name,
                      suburb: centre.suburb ?? null,
                      area: centre.city ?? null,
                      fee_min: centre.fee_min ?? null,
                      fee_max: centre.fee_max ?? null,
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
                      is_saved: savedCentreIds.has(centre.id),
                      is_pilot: Boolean(centre.is_pilot),
                      is_featured: Boolean(centre.is_featured),
                      viewer_role: 'parent_user',
                    }
                    return <SharedCentreCard key={centre.id} centre={cardData} variant={cardVariant} />
                  })}
                </div>
              </div>
            ) : null}

            {listCentres.length > 0 ? (
              <div>
                {promotedCentres.length > 0 ? (
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">More cr&egrave;ches</p>
                ) : null}
                <div className={cardVariant === 'full' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
                  {listCentres.map((centre) => {
                    const { age_min_months, age_max_months } = parseAgeGroupsToMonths(centre.age_groups)
                    const cardData: CentreCardData = {
                      id: centre.id,
                      slug: centre.slug ?? centre.id,
                      name: centre.name,
                      suburb: centre.suburb ?? null,
                      area: centre.city ?? null,
                      fee_min: centre.fee_min ?? null,
                      fee_max: centre.fee_max ?? null,
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
                      is_saved: savedCentreIds.has(centre.id),
                      is_pilot: Boolean(centre.is_pilot),
                      is_featured: Boolean(centre.is_featured),
                      viewer_role: 'parent_user',
                    }
                    return <SharedCentreCard key={centre.id} centre={cardData} variant={cardVariant} />
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
