'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CentreCard from '@/components/parent/CentreCard'
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
}

const FALLBACK_CENTRES: DiscoverCentre[] = [
  {
    id: 'centre-local-1',
    name: 'Community Learning Centre',
    tagline: 'Warm care, clear communication, safer pickup.',
    city: 'Johannesburg',
    suburb: 'Alexandra',
    cover_image_url:
      'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg',
    feesLabel: 'Ask centre for fees',
    age_groups: ['0-2', '2-4', '5-6'],
    rating: 4.8,
  },
  {
    id: 'centre-local-2',
    name: 'Sunrise ECD Home',
    tagline: 'Simple routines and trusted care.',
    city: 'Johannesburg',
    suburb: 'Wynberg',
    cover_image_url:
      'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg',
    feesLabel: 'Ask centre for fees',
    age_groups: ['2-4', '5-6'],
    rating: 4.7,
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

export default function ParentDiscoverClient() {
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState('')
  const [centres, setCentres] = useState<DiscoverCentre[]>(FALLBACK_CENTRES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadCentres = async () => {
      const { data } = await supabase
        .from('public_ecd_centres')
        .select('id,slug,name,tagline,suburb,city,cover_image_url,logo_url,monthly_fee_min,monthly_fee_max,age_group_pricing')
        .order('is_registered', { ascending: false })
        .order('name', { ascending: true })
        .limit(24)

      if (!mounted) return

      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((centre) => ({
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
        })) as DiscoverCentre[]
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

  const filteredCentres = useMemo(() => {
    if (!query.trim()) return centres
    const needle = query.toLowerCase().trim()
    return centres.filter(
      (centre) =>
        centre.name.toLowerCase().includes(needle) ||
        (centre.suburb ?? '').toLowerCase().includes(needle) ||
        (centre.city ?? '').toLowerCase().includes(needle)
    )
  }, [centres, query])

  return (
    <div className="min-h-screen overflow-x-hidden overflow-y-auto bg-slate-50 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-8 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-700">Parent discovery</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Discover trusted creches</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Find nearby centres, compare quickly, and open a full profile before you apply.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <label className="relative flex-1">
              <Input
                placeholder="Search by suburb, city, or centre name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="bg-white text-slate-900 placeholder:text-slate-400"
              />
            </label>
            <Button
              variant="outline"
              disabled
              className="min-h-[48px] rounded-2xl border-slate-300 bg-white text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
            >
              Filters coming soon
            </Button>
          </div>
        </header>

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
              <CentreCard key={centre.id} {...centre} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
