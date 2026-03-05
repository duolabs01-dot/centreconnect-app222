'use client'

import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CentreCard from '@/components/parent/CentreCard'

const mockCentres = [
  {
    id: 'centre-1',
    slug: 'starlight-nursery',
    name: 'Starlight Nursery Studio',
    tagline: 'Warm light, calm routines, joyful discoveries.',
    city: 'Johannesburg',
    suburb: 'Melville',
    cover_image_url: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1800&q=80',
    logo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    distanceLabel: '2.3 km away',
    feesLabel: 'R1,250 per month',
    age_groups: ['0-2', '2-4', '5-6'],
    rating: 4.9,
  },
  {
    id: 'centre-2',
    slug: 'sunrise-cottage',
    name: 'Sunrise Cottage',
    tagline: 'Every sunrise starts with gentle care.',
    city: 'Johannesburg',
    suburb: 'Bramley',
    cover_image_url: 'https://images.unsplash.com/photo-1507878866276-a947ef7228f2?auto=format&fit=crop&w=1600&q=80',
    logo_url: 'https://images.unsplash.com/photo-1527128556379-917f3a4065a0?auto=format&fit=crop&w=400&q=80',
    distanceLabel: '4.1 km away',
    feesLabel: 'R1,050 per month',
    age_groups: ['2-4', '5-6'],
    rating: 4.7,
  },
  {
    id: 'centre-3',
    slug: 'luna-kindergarten',
    name: 'Luna Learning Garden',
    tagline: 'Intentional play, mindful mornings.',
    city: 'Johannesburg',
    suburb: 'Randburg',
    cover_image_url: 'https://images.unsplash.com/photo-1603252428510-281c4b9e57c8?auto=format&fit=crop&w=1400&q=80',
    logo_url: 'https://images.unsplash.com/photo-1602526218342-7fcc3b4de5a5?auto=format&fit=crop&w=400&q=80',
    distanceLabel: '6.8 km away',
    feesLabel: 'R1,480 per month',
    age_groups: ['3-5', '6-7'],
    rating: 5.0,
  },
]

export default function ParentDiscoverClient() {
  const [query, setQuery] = useState('')

  const filteredCentres = useMemo(() => {
    if (!query.trim()) return mockCentres
    const needle = query.toLowerCase().trim()
    return mockCentres.filter(
      (centre) =>
        centre.name.toLowerCase().includes(needle) ||
        centre.suburb?.toLowerCase().includes(needle)
    )
  }, [query])

  useEffect(() => {
    const originalZoom = document.documentElement.style.zoom
    document.documentElement.style.zoom = '1'
    return () => {
      document.documentElement.style.zoom = originalZoom
    }
  }, [])

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>

      <div className="min-h-screen bg-slate-950 px-4 pb-24 pt-8 md:px-6 md:pb-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="space-y-3 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-900/60 p-6 shadow-[0_25px_60px_rgba(2,6,23,0.65)]">
            <p className="text-xs uppercase tracking-[0.4em] text-amber-200">Parent discovery</p>
            <h1
              style={{ fontFamily: 'Orbitron, sans-serif' }}
              className="text-3xl font-black uppercase tracking-[0.3em] text-amber-50 md:text-4xl"
            >
              Discover calm crèches
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Browse community-loved crèches with Orbitron precision, warm details, and care-first values. Search, filter, and keep CTAs above the nav.
            </p>
            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <label className="relative flex-1">
                <Input
                  placeholder="Search by suburb or crèche name"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="bg-slate-900/80 text-white placeholder:text-slate-500"
                />
              </label>
              <Button variant="outline" className="min-h-[48px] rounded-2xl text-xs font-semibold tracking-widest text-white border-white/40 bg-white/5 hover:bg-white/10">
                Filter by vibe
              </Button>
            </div>
          </header>

          {filteredCentres.length === 0 ? (
            <section className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-200 shadow-[0_30px_60px_rgba(15,23,42,0.35)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" className="h-32 w-32 text-amber-300">
                <circle cx="80" cy="80" r="70" fill="currentColor" opacity="0.2" />
                <path d="M40 100c0-22 18-40 40-40s40 18 40 40" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M60 72c4-8 12-12 20-12s16 4 20 12" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
              <h2 className="text-xl font-semibold text-slate-100">No matches yet</h2>
              <p className="max-w-xs text-sm text-slate-400">
                Try adjusting your search or clearing filters—we will keep your CTAs visible no matter what.
              </p>
              <Button
                variant="outline"
                className="rounded-2xl border-white/30 bg-white/5 px-6 text-sm font-semibold text-white hover:border-white hover:bg-white/20"
                onClick={() => setQuery('')}
              >
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
    </>
  )
}
