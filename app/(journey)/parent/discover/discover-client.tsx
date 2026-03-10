'use client'

import { useEffect, useMemo, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import CentreCard from '@/components/parent/CentreCard'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { getLocationReference, resolveCentreCoordinates } from '@/lib/geo/centre-location'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'
import { createClient } from '@/lib/supabase/client'

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
  feesLabel?: string
  age_groups: string[]
  rating?: number
  latitude?: number | null
  longitude?: number | null
  contact_whatsapp?: string | null
  contact_phone?: string | null
  phone?: string | null
  is_claimed?: boolean
  is_registered?: boolean
  distanceMeters?: number
}

const FALLBACK_CENTRES: DiscoverCentre[] = [
  {
    id: 'centre-local-1',
    name: 'Community Learning Centre',
    tagline: 'Warm care, clear communication, safer pickup.',
    city: 'Johannesburg',
    suburb: 'Alexandra',
    feesLabel: 'Ask centre for fees',
    age_groups: ['0-2', '2-4', '5-6'],
    rating: 4.8,
    is_claimed: false,
    is_registered: false,
  },
  {
    id: 'centre-local-2',
    name: 'Sunrise ECD Home',
    tagline: 'Simple routines and trusted care.',
    city: 'Johannesburg',
    suburb: 'Wynberg',
    feesLabel: 'Ask centre for fees',
    age_groups: ['2-4', '5-6'],
    rating: 4.7,
    is_claimed: false,
    is_registered: false,
  },
]

function formatFees(min: number | null, max: number | null) {
  const safeMin = Number.isFinite(min) && (min ?? 0) > 0 ? Number(min) : null
  const safeMax = Number.isFinite(max) && (max ?? 0) > 0 ? Number(max) : null
  if (safeMin && safeMax) return `R${safeMin} - R${safeMax} / month`
  if (safeMin) return `From R${safeMin} / month`
  if (safeMax) return `Up to R${safeMax} / month`
  return 'Ask centre for fees'
}

function toAgeGroups(ageGroupPricing: unknown) {
  if (!ageGroupPricing || typeof ageGroupPricing !== 'object' || Array.isArray(ageGroupPricing)) {
    return ['0-2', '2-4', '5-6']
  }

  const entries = Object.keys(ageGroupPricing as Record<string, unknown>)
    .map((key) => key.trim())
    .filter(Boolean)

  if (entries.length === 0) return ['0-2', '2-4', '5-6']
  return entries.slice(0, 3)
}

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
  const km = meters / 1000
  const minutes = Math.max(1, Math.round((km / 30) * 60))
  if (meters < 1000) {
    return `${Math.round(meters)} m · ${minutes} min away`
  }
  return `${km.toFixed(1)} km · ${minutes} min away`
}

export default function ParentDiscoverClient() {
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState('')
  const [centres, setCentres] = useState<DiscoverCentre[]>(FALLBACK_CENTRES)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState({ lat: -26.1881, lng: 28.0473 })
  const [selectedSuburb, setSelectedSuburb] = useState('')
  const [locationMode, setLocationMode] = useState<'device' | 'fallback'>('fallback')

  useEffect(() => {
    let mounted = true

    const loadCentres = async () => {
      const { data } = await supabase
        .from('public_ecd_centres')
.select('id,slug,name,tagline,suburb,city,cover_image_url,logo_url,monthly_fee_min,monthly_fee_max,age_group_pricing,latitude,longitude,contact_whatsapp,contact_phone,phone,is_registered,is_claimed')
        .order('is_registered', { ascending: false })
        .order('name', { ascending: true })
        .limit(24)

      if (!mounted) return

      if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((centre) => {
            const resolvedCoordinates = resolveCentreCoordinates({
              latitude: centre.latitude,
              longitude: centre.longitude,
              slug: centre.slug ?? null,
              suburb: centre.suburb ?? null,
              city: centre.city ?? null,
            })

            return {
              id: centre.id,
              slug: centre.slug ?? undefined,
              name: centre.name ?? 'ECD centre',
              tagline: centre.tagline ?? undefined,
              city: centre.city ?? undefined,
              suburb: centre.suburb ?? undefined,
              cover_image_url: centre.cover_image_url ?? undefined,
              logo_url: centre.logo_url ?? undefined,
              feesLabel: formatFees(centre.monthly_fee_min, centre.monthly_fee_max),
              age_groups: toAgeGroups(centre.age_group_pricing),
              rating: 4.8,
              latitude: resolvedCoordinates.latitude,
              longitude: resolvedCoordinates.longitude,
              contact_whatsapp: centre.contact_whatsapp ?? null,
              contact_phone: centre.contact_phone ?? null,
              phone: centre.phone ?? null,
              is_claimed: Boolean(centre.is_claimed),
              is_registered: Boolean(centre.is_registered),
            }
          }) as DiscoverCentre[]
        setCentres(mapped)
      } else {
        setCentres(FALLBACK_CENTRES)
      }

      setLoading(false)
    }

    void loadCentres()
    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    if (locationMode === 'device') return
    const [lng, lat] = getLocationReference({ suburb: selectedSuburb || centres[0]?.suburb || 'Alexandra', city: centres[0]?.city })
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
          distanceLabel: formatDistance(distanceMeters) ?? 'Distance unknown',
        }
      })
      .sort((a, b) => (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY))
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

  return (
    <div className="min-h-screen overflow-x-hidden overflow-y-auto bg-slate-50 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-8 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-700">Parent discovery</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Discover trusted creches</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Find nearby centres, compare quickly, and open a full profile before you apply.
          </p>

          <div className="space-y-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            <p>
              {locationMode === 'device'
                ? 'Showing centres closest to your current location.'
                : 'Showing Alexandra first because device location is not available yet.'}
            </p>
            <p className="text-xs font-medium text-cyan-800">
              Preview image = the centre has not uploaded real photos yet. Not yet on CentreConnect = ask the centre directly before applying.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Input
                placeholder="Search by suburb, city, or centre name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="bg-white text-slate-900 placeholder:text-slate-400"
              />
            </label>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Search by suburb or centre name
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedSuburb}
              onChange={(event) => setSelectedSuburb(event.target.value)}
              className="cc-native-field h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-500"
            >
              <option value="">All nearby suburbs</option>
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

        {!loading && filteredCentres.length > 0 && (
          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-700">Recommended for your area</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCentres.slice(0, 2).map((centre) => {
                const hasRealCover = typeof centre.cover_image_url === 'string' && centre.cover_image_url.trim().length > 0
                const heroSrc = hasRealCover
                  ? centre.cover_image_url!.trim()
                  : buildCentrePreviewImage({ name: centre.name, suburb: centre.suburb, isClaimed: centre.is_claimed ?? true })
                const detailHref = centre.slug ? `/c/${encodeURIComponent(centre.slug)}` : '/directory'
                const locationLabel = [centre.suburb, centre.city].filter(Boolean).join(', ') || 'Near you'
                const logoSrc = centre.logo_url?.trim() || null
                const isVerified = Boolean(centre.is_claimed && centre.is_registered)

                return (
                  <Link
                    key={centre.id}
                    href={detailHref}
                    className="group overflow-hidden rounded-[1.6rem] border border-[#E8DDD0] bg-[#FFFDF9] shadow-[0_10px_28px_rgba(31,44,39,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(31,44,39,0.08)]"
                  >
                    <div className="relative aspect-[16/6.2] overflow-hidden bg-[#F4ECE2]">
                      <Image
                        src={heroSrc}
                        alt={hasRealCover ? centre.name : `${centre.name} preview image`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized={!hasRealCover}
                      />
                    </div>
                    <div className="space-y-2.5 px-4 pb-4 pt-3">
                      <div className="relative min-h-[3rem] pl-[4rem]">
                        <div className="absolute left-0 top-[-1.85rem]">
                          {logoSrc ? (
                            <div className="h-11 w-11 overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-[0_10px_24px_rgba(31,44,39,0.12)]">
                              <Image src={logoSrc} alt={`${centre.name} logo`} width={44} height={44} className="h-full w-full object-cover" sizes="44px" unoptimized />
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-[3px] border-white bg-[#F5EFE6] text-sm font-black text-[#0D9488] shadow-[0_10px_24px_rgba(31,44,39,0.12)]">
                              {centre.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[0.98rem] font-bold leading-[1.12] tracking-[-0.02em] text-[#22312E]">{centre.name}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7B827E]">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{locationLabel}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {isVerified ? <PremiumVerifiedBadge compact className="border-[#F3E3B3] bg-[#FFF8DA] text-[#6C4700]" /> : null}
                        {centre.is_claimed ? (
                          <Badge className="border border-[#E7DDD1] bg-[#FAF8F4] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6A7672] shadow-none">
                            CentreConnect partner
                          </Badge>
                        ) : (
                          <Badge className="border border-amber-200 bg-[#FFF6E8] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A5A10] shadow-none">
                            Preview only
                          </Badge>
                        )}
                        {centre.distanceLabel ? (
                          <Badge className="border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-700 shadow-none">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {centre.distanceLabel}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[360px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))}
          </section>
        ) : filteredCentres.length === 0 ? (
          <section className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No matches yet</h2>
            <p className="max-w-xs text-sm text-slate-600">Try a different suburb or clear your search.</p>
            <Button variant="outline" className="rounded-2xl px-6 text-sm font-semibold" onClick={() => setQuery('')}>
              Reset search
            </Button>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCentres.map((centre) => (
              <CentreCard key={centre.id} {...centre} viewerRole={"parent_user"} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
