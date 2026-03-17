'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, MapPin, Share2, ShieldCheck, Smartphone, Users2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GovernmentRegisteredBadge, PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'

export type HomeActiveCentre = {
  id: string
  name: string
  slug: string | null
  suburb: string | null
  primaryAgeGroup: string | null
  isRegistered: boolean
  isClaimed?: boolean
  isPilot?: boolean
  isFeatured?: boolean
  coverImage?: string | null
  latitude?: number | null
  longitude?: number | null
}

type HomeClientPageProps = {
  activeCentres: HomeActiveCentre[]
}

const suburbPills: Array<{ name: string; count: number }> = [
  { name: 'Alexandra', count: 3 },
  { name: 'Marlboro', count: 2 },
  { name: 'Wynberg', count: 1 },
  { name: 'Tembisa', count: 2 },
  { name: 'Sandton', count: 4 },
]

const safetyPoints = [
  'Every pickup uses a secure code.',
  'Staff see who is authorised before release.',
  'Parents get notified as soon as collection happens.',
] as const

const parentMoments = [
  'See nearby centres fast',
  'Check fees, ages, and hours quickly',
  'Apply online or contact the centre right away',
] as const

const centreMoments = [
  'See new applications clearly',
  'Reply once and keep the parent updated',
  'Run attendance and pickup with less paper',
] as const

const parentTrustChecks = [
  {
    title: 'Browse without signing up',
    body: 'Create an account only when you want to apply. Everything else is open.',
  },
  {
    title: "You'll always know what to do next",
    body: 'Apply online on CentreConnect centres. Call or WhatsApp public listings.',
  },
  {
    title: 'Pickup stays in your pocket',
    body: 'Pickup codes and collection updates stay clear after your child joins.',
  },
] as const
function suburbHref(suburb: string) {
  return `/directory?suburb=${encodeURIComponent(suburb)}`
}


function centreHref(centre: HomeActiveCentre) {
  if (centre.slug) return `/c/${centre.slug}`
  if (centre.suburb) return suburbHref(centre.suburb)
  return '/directory'
}

function getLandingCentreImage(centre: HomeActiveCentre | null) {
  if (!centre) {
    return 'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'
  }

  if (centre.coverImage && centre.coverImage.trim().length > 0) {
    return getCentreHeroImage(centre.slug, centre.coverImage)
  }

  return buildCentrePreviewImage({
    name: centre.name,
    suburb: centre.suburb,
    isClaimed: centre.isClaimed ?? false,
  })
}

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function metersToMinutes(meters: number, speedKmh: number = 30) {
  const hours = meters / 1000 / speedKmh
  const minutes = Math.round(hours * 60)
  if (minutes < 1) return '< 1 min'
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}

export default function HomeClientPage({ activeCentres }: HomeClientPageProps) {
  const featuredCentre = activeCentres[0] ?? null
  const pilotCentres = activeCentres.filter((centre) => centre.isPilot).slice(0, 3)
  const bajabulileCentre =
    activeCentres.find((centre) => centre.slug === 'bajabulile-day-care-centre' || centre.slug === 'bajabulile') ?? featuredCentre
  const spotlightCentres = pilotCentres.filter((centre) => centre.id !== bajabulileCentre?.id).slice(0, 2)
  const showProofBand = activeCentres.length > 0

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        setLocationError(error.message)
      }
    )
  }, [])

  function getDistanceMinutes(centre: HomeActiveCentre) {
    if (!userLocation || !centre.latitude || !centre.longitude) return null
    const distanceKm = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      centre.latitude,
      centre.longitude
    )
    const distanceMeters = distanceKm * 1000
    return metersToMinutes(distanceMeters)
  }

  const featuredHeroImage = getLandingCentreImage(featuredCentre)
  const bajabulileHeroImage = getLandingCentreImage(bajabulileCentre)

  return (
    <div
      className="min-h-screen overflow-x-clip bg-[var(--cream)] text-slate-900 overscroll-none selection:bg-teal-100 selection:text-teal-950"
      style={{
        fontFamily: 'var(--font-display)',
        ['--teal' as string]: 'rgb(13,148,136)',
        ['--amber' as string]: 'rgb(212,147,90)',
        ['--coral' as string]: 'rgb(216,108,108)',
        ['--mauve' as string]: 'rgb(139,111,179)',
        ['--amber-light' as string]: 'rgb(253,240,230)',
        ['--forest' as string]: 'rgb(26,46,31)',
        ['--cream' as string]: 'rgb(250,248,244)',
        ['--warm-white' as string]: 'rgb(255,253,249)',
      }}
    >
      <main className="pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-amber-50/60 via-background to-emerald-50/40">
          <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(212,147,90,0.22),transparent_44%),radial-gradient(circle_at_top_right,rgba(13,148,136,0.16),transparent_34%),radial-gradient(circle_at_center_right,rgba(139,111,179,0.12),transparent_28%)]" />
          <div className="absolute -left-20 top-16 h-40 w-40 rounded-full bg-[rgba(212,147,90,0.14)] blur-3xl" />
          <div className="absolute right-[-3rem] top-24 h-44 w-44 rounded-full bg-[rgba(216,108,108,0.10)] blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-12">
              <div className="min-w-0 max-w-3xl">
                <div
                  className="inline-flex items-center rounded-full border px-4 py-2 text-[13px] font-semibold shadow-[0_10px_24px_rgba(212,147,90,0.10)] sm:text-sm"
                  style={{
                    backgroundColor: 'var(--amber-light)',
                    borderColor: 'rgba(212,147,90,0.28)',
                    color: 'var(--amber)',
                  }}
                >
                  Now live in Alexandra, Johannesburg
                </div>

                <h1
                  className="mt-5 text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-950 sm:max-w-[12ch] sm:text-[3.85rem] sm:leading-[1] lg:max-w-none lg:text-[4.85rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Find a creche near you. See everything first.
                </h1>

                <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-600 sm:text-[18px] sm:leading-8">
                  Browse fees, ages, and hours. Apply or contact in one tap. No account needed to start.
                </p>

                <div className="mt-5 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                  <div className="flex min-w-max gap-2 pb-1">
                    {suburbPills.map((suburb) => (
                      <Link
                        key={suburb.name}
                        href={suburbHref(suburb.name)}
                        className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_8px_20px_rgba(31,44,39,0.04)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                      >
                        <span>{suburb.name}</span>
                        <span className="ml-2 rounded-full bg-[var(--teal)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {suburb.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    size="lg"
                    className="h-14 w-full justify-center rounded-[1.05rem] bg-[var(--teal)] px-7 text-base font-semibold text-white shadow-[0_16px_34px_rgba(13,148,136,0.22)] hover:bg-primary/90 sm:w-auto"
                    asChild
                  >
                    <Link href="/directory">Find creches near me</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-[1.05rem] border-slate-200 bg-white px-7 text-base font-semibold text-slate-900 shadow-[0_10px_26px_rgba(34,49,46,0.05)] hover:bg-muted sm:w-auto"
                    asChild
                  >
                    <Link href="/register">
                      <span>Save and apply faster</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-muted sm:w-auto"
                    asChild
                  >
                    <a
                      href="https://wa.me/?text=Check+out+CentreConnect+-+find+cr%C3%A8ches+near+you+in+Alexandra+%F0%9F%98%8A+https://centreconnect.co.za"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share on WhatsApp</span>
                    </a>
                  </Button>
                </div>

                <div className="mt-3">
                  <Link href="/for-centres/intro" className="text-[12px] font-semibold text-teal-700 underline-offset-4 hover:underline">
                    Run your centre on CentreConnect
                  </Link>
                </div>

                <p className="mt-3 text-[11px] font-medium tracking-[0.01em] text-[var(--teal)] sm:text-[12px]">
                  <Clock3 className="mr-1 inline h-3 w-3" />
                  No account needed to browse. Create one only when you want to apply.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {parentTrustChecks.map((item) => (
                    <div key={item.title} className="rounded-[1.25rem] border border-border bg-white/90 px-4 py-4 shadow-[0_8px_20px_rgba(31,44,39,0.04)]">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-[12px] leading-5 text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-[320px] lg:min-h-0">
                <div className="grid gap-4">
                  <div className="overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[0_28px_60px_rgba(31,44,39,0.12)] sm:rounded-[2rem]">
                    <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
                      <div className="p-5 sm:p-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--teal)]">
                          <Smartphone className="h-3.5 w-3.5" />
                          What parents need first
                        </div>
                        <h2 className="mt-4 text-[1.45rem] font-bold leading-tight text-slate-950 sm:text-[1.7rem]">
                          See your options. Know your next step. Keep moving.
                        </h2>
                        <div className="mt-5 space-y-3">
                          {parentMoments.map((item, index) => (
                            <div
                              key={item}
                              className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--teal)] text-xs font-bold text-white">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium leading-6 text-slate-700">{item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-amber-50/60 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Why parents love this
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            You do not need to guess what to do next.
                          </p>
                        </div>
                      </div>

                      <div className="relative min-h-[280px] border-t border-border bg-gradient-to-b from-emerald-50/40 to-amber-50/50 p-5 md:min-h-full md:border-l md:border-t-0 sm:p-6">
                        <div className="rounded-[1.35rem] border border-emerald-100 bg-white/95 p-4 shadow-[0_16px_34px_rgba(31,44,39,0.08)]">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Example centre</p>
                              <p className="mt-1 text-base font-bold text-slate-900">{featuredCentre?.name ?? 'Creche'}</p>
                            </div>
                            <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--teal)]">
                              {featuredCentre?.isClaimed ? 'Live now' : 'Preview'}
                            </div>
                          </div>
                          <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-[1.2rem] border border-border">
                            <Image
                              src={featuredHeroImage}
                              alt={featuredCentre?.name ?? 'Creche'}
                              fill
                              className="object-cover"
                              priority
                              unoptimized={featuredHeroImage.startsWith('data:image/svg+xml')}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,29,26,0.04)_0%,rgba(17,29,26,0.14)_45%,rgba(17,29,26,0.48)_100%)]" />
                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">Parent sees first</p>
                              <p className="mt-1 text-sm font-semibold text-white">Fees, area, and what to do next</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[1.35rem] border border-slate-800 bg-slate-900 p-4 text-white shadow-[0_18px_40px_rgba(31,44,39,0.18)]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">Centre side</p>
                          <div className="mt-3 space-y-2">
                            {centreMoments.map((item) => (
                              <div key={item} className="flex items-start gap-2 rounded-xl bg-white/6 px-3 py-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                                <span className="text-sm leading-5 text-emerald-50">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {showProofBand ? (
          <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-border bg-gradient-to-br from-background via-emerald-50/40 to-amber-50/60 p-5 shadow-[0_18px_40px_rgba(31,44,39,0.07)] sm:rounded-[2rem] sm:p-8">
              <div className="max-w-2xl">
                <h2
                  className="text-[1.95rem] leading-[1.05] tracking-[-0.03em] text-slate-950 sm:text-[2.8rem] sm:leading-[1]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Start with centres you can act on today.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">
                  Creches on CentreConnect let you apply online. Public listings show the fastest direct contact option.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {activeCentres.map((centre) => (
                  <Link
                    key={centre.id}
                    href={centreHref(centre)}
                    className="overflow-hidden rounded-[1.35rem] border border-border bg-white transition-transform hover:-translate-y-0.5 hover:border-[var(--teal)]/20 sm:rounded-[1.5rem]"
                  >
                    <div className="relative aspect-[16/9] w-full">
                      <Image
                        src={getLandingCentreImage(centre)}
                        alt={centre.name}
                        fill
                        className="object-cover"
                        unoptimized={getLandingCentreImage(centre).startsWith('data:image/svg+xml')}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          {centre.suburb ?? 'Johannesburg'}
                        </p>
                        {getDistanceMinutes(centre) && (
                          <span className="flex items-center gap-1 text-xs font-bold text-[var(--teal)]">
                            <MapPin className="h-3 w-3" />
                            {getDistanceMinutes(centre)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold leading-snug text-slate-900">{centre.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {centre.isClaimed ? <PremiumVerifiedBadge compact  /> : null}
                        {centre.isRegistered ? <GovernmentRegisteredBadge compact /> : null}
                        {centre.isFeatured ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                            <ShieldCheck className="h-3 w-3" />
                            Recommended
                          </span>
                        ) : centre.isPilot ? (
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                            Pilot Partner
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[rgba(13,148,136,0.10)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                          {centre.primaryAgeGroup ?? 'Mixed age groups'}
                        </span>
                      </div>
                      <div
                        className={`mt-3 rounded-[1.05rem] border px-3 py-2 ${centre.isClaimed ? 'border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-emerald-100/40' : 'border-border bg-[var(--cream)]'}`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {centre.isClaimed ? 'Why parents choose this faster' : 'What this profile helps with'}
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-slate-600">
                          {centre.isClaimed
                            ? 'Apply online or send one quick message in the app.'
                            : 'Call or WhatsApp the centre directly from the listing.'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--forest)] px-5 py-10 text-white shadow-[0_30px_80px_rgba(26,46,31,0.24)] sm:rounded-[2.4rem] sm:px-10 sm:py-16 lg:px-16">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
              <div className="max-w-xl">
                <h2
                  className="text-[2rem] leading-[1.04] tracking-[-0.035em] text-white sm:text-[3.1rem] sm:leading-[1.02]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Pickup should feel safe, even on a busy day.
                </h2>
                <p className="mt-5 text-[15px] leading-7 text-emerald-100 sm:text-[17px] sm:leading-8">
                  You should know who can collect your child, what code is needed, and when pickup happened.
                </p>

                <div className="mt-7 space-y-3">
                  {safetyPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-emerald-50 sm:text-[15px]">
                      <span
                        className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10"
                        style={{ color: 'var(--amber)' }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[12px] border-slate-950 bg-slate-900 p-5 shadow-[0_32px_72px_rgba(0,0,0,0.34)] sm:max-w-[360px] sm:rounded-[3rem] sm:p-6">
                <div className="mx-auto mb-8 h-1.5 w-16 rounded-full bg-slate-700" />
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--amber)' }}>
                      Pickup code
                    </p>
                    <p className="text-base font-bold text-white">Safe child pickup</p>
                  </div>
                  <div className="flex justify-center py-8">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4].map((item) => (
                        <div
                          key={item}
                          className="flex h-12 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/50 text-2xl font-bold text-amber-200 sm:h-14 sm:w-12"
                        >
                          {item === 1 ? '8' : item === 2 ? '4' : '•'}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/30 p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">Identity verified</p>
                  </div>
                  <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--teal)] text-sm font-bold text-white">
                    Confirm release
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-gradient-to-r from-amber-50/60 via-background to-emerald-50/40">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-center text-sm leading-6 text-slate-600">
              Trusted by registered creches in Alexandra, Marlboro, and across Johannesburg.{locationError ? ' Location access is optional for quick nearby estimates.' : ''}
            </p>
          </div>
        </section>

        <section className="px-4 pb-4 pt-10 sm:px-6 sm:pb-6 sm:pt-14 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[1.9rem] border border-border bg-gradient-to-br from-amber-50/60 via-background to-emerald-50/50 px-5 py-8 shadow-[0_18px_44px_rgba(31,44,39,0.06)] sm:rounded-[2.2rem] sm:px-10 sm:py-10 lg:px-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--teal)]">For creche owners</p>
                <h2
                  className="mt-2 text-[1.85rem] leading-[1.06] tracking-[-0.03em] text-slate-950 sm:text-[2.6rem] sm:leading-[1.02]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Bring your creche onto CentreConnect.
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-base">
                  Show parents your creche properly, take applications in one place, and claim your listing if parents can already see you here.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:min-w-[240px]">
                <Button
                  size="lg"
                  className="h-12 w-full justify-center rounded-[1.05rem] bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto lg:w-full"
                  asChild
                >
                  <Link href="/for-centres">For creche owners</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-[1.05rem] border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 hover:bg-muted sm:w-auto lg:w-full"
                  asChild
                >
                  <Link href="/for-centres/register?flow=confirm">Claim your creche</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[1.9rem] bg-gradient-to-br from-teal-600 to-teal-700 px-5 py-9 text-white shadow-[0_24px_60px_rgba(13,148,136,0.24)] sm:rounded-[2.2rem] sm:px-10 sm:py-12 lg:px-14">
            <div className="max-w-3xl">
              <h2
                className="text-[1.95rem] leading-[1.05] tracking-[-0.03em] text-white sm:text-[3rem] sm:leading-[1]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Ready to look? Start here.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-teal-50 sm:text-[17px] sm:leading-8">
                Browse first, then create an account only when you want to apply.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="h-14 w-full justify-center rounded-[1.05rem] bg-white px-7 text-base font-semibold text-[var(--teal)] shadow-none hover:bg-emerald-50/50 sm:w-auto"
                asChild
              >
                <Link href="/directory">
                  <span>Find creches near me</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 w-full rounded-[1.05rem] border border-white/30 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
                asChild
              >
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}



