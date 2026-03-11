'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, MapPin, Share2, ShieldCheck, Smartphone, Users2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApplicationProgressSection } from '@/components/landing/application-progress-section'
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

const connectedFlow = [
  {
    icon: Smartphone,
    eyebrow: 'Parent side',
    title: 'Parents should know what to do straight away.',
    body: 'Working parents do not have time to guess. The next step must be clear on every screen.',
    detail: 'The UI should feel calm, obvious, and mobile-first from the first screen.',
  },
  {
    icon: FileCheck2,
    eyebrow: 'Saved once',
    title: 'What you already did should stay saved.',
    body: 'If a parent already filled something in, the app should remember it and make the next step easier.',
    detail: 'That is what makes CentreConnect feel like a product instead of a collection of forms.',
  },
  {
    icon: Users2,
    eyebrow: 'Centre side',
    title: 'The centre should see the same story clearly.',
    body: 'If a parent applies or sends a message, the centre side should reflect that clearly and fast.',
    detail: 'One action should make sense to both the parent and the centre.',
  },
] as const

const parentMoments = [
  'Search nearby centres and compare quickly',
  'Save your child profile and documents once',
  'Track replies, approvals, and next steps in one place',
] as const

const centreMoments = [
  'Receive a clear application with the right documents',
  'Update status once and reflect it back to the parent',
  'Run attendance and pickup without paper confusion',
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
      className="min-h-screen overflow-x-clip bg-[var(--cream)] text-[#22312E] overscroll-none selection:bg-teal-100 selection:text-teal-950"
      style={{
        fontFamily: 'var(--font-display)',
        ['--teal' as string]: '#0D9488',
        ['--amber' as string]: '#D4935A',
        ['--coral' as string]: '#D86C6C',
        ['--mauve' as string]: '#8B6FB3',
        ['--amber-light' as string]: '#FDF0E6',
        ['--forest' as string]: '#1A2E1F',
        ['--cream' as string]: '#FAF8F4',
        ['--warm-white' as string]: '#FFFDF9',
      }}
    >
      <main className="pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <section className="relative overflow-hidden border-b border-[#E9DED1] bg-[linear-gradient(180deg,#FFF9F3_0%,#FFFDF9_46%,#F8FBFA_100%)]">
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
                  className="mt-5 text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#1E2C28] sm:max-w-[12ch] sm:text-[3.85rem] sm:leading-[1] lg:max-w-none lg:text-[4.85rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Find the right crèche for your child. Fast.
                </h1>

                <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[#5D6966] sm:text-[18px] sm:leading-8">
                  Find a centre near you, check the important details quickly, and apply when you are ready.
                </p>

                <p className="mt-3 text-[13px] italic leading-6 text-[#7B827E] sm:text-[15px] sm:leading-7">
                  Busy parents need clear answers fast. This is built for that.
                </p>

                <div className="mt-5 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                  <div className="flex min-w-max gap-2 pb-1">
                    {suburbPills.map((suburb) => (
                      <Link
                        key={suburb.name}
                        href={suburbHref(suburb.name)}
                        className="inline-flex items-center whitespace-nowrap rounded-full border border-[#D9D8CF] bg-white/90 px-4 py-2 text-sm font-medium text-[#485654] shadow-[0_8px_20px_rgba(31,44,39,0.04)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
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
                    className="h-14 w-full justify-center rounded-[1.05rem] bg-[var(--teal)] px-7 text-base font-semibold text-white shadow-[0_16px_34px_rgba(13,148,136,0.22)] hover:bg-[#0B857A] sm:w-auto"
                    asChild
                  >
                    <Link href="/directory">Directory</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-[1.05rem] border-[#DED2C5] bg-white px-7 text-base font-semibold text-[#22312E] shadow-[0_10px_26px_rgba(34,49,46,0.05)] hover:bg-[#F8F3EC] sm:w-auto"
                    asChild
                  >
                    <Link href="/register">
                      <span>Create account</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-12 w-full rounded-full border border-[#DED2C5] bg-white px-4 text-sm font-medium text-[#22312E] hover:bg-[#F8F3EC] sm:w-auto"
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

                <p className="mt-3 text-[11px] font-medium tracking-[0.01em] text-[var(--teal)] sm:text-[12px]">
                  <Clock3 className="mr-1 inline h-3 w-3" />
                  Start with the directory. Create an account only when you are ready to apply.
                </p>

                <p className="mt-4 text-[11px] font-medium tracking-[0.01em] text-[#7B817C] sm:text-[12px]">
                  Free for parents. No payment details needed.
                </p>
                <p className="mt-2 text-[11px] font-medium tracking-[0.01em] text-[#7B817C] sm:text-[12px]">
                  Starting in Alexandra. Growing across Johannesburg.
                </p>
              </div>

              <div className="min-h-[320px] lg:min-h-0">
                <div className="grid gap-4">
                  <div className="overflow-hidden rounded-[1.75rem] border border-[#E8DDD0] bg-white shadow-[0_28px_60px_rgba(31,44,39,0.12)] sm:rounded-[2rem]">
                    <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
                      <div className="p-5 sm:p-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBE7] bg-[#F3FBF8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--teal)]">
                          <Smartphone className="h-3.5 w-3.5" />
                          Parent journey preview
                        </div>
                        <h2 className="mt-4 text-[1.45rem] font-bold leading-tight text-[#1F2D29] sm:text-[1.7rem]">
                          Search first. Save once. Track everything after.
                        </h2>
                        <div className="mt-5 space-y-3">
                          {parentMoments.map((item, index) => (
                            <div
                              key={item}
                              className="flex items-start gap-3 rounded-2xl border border-[#E8DDD0] bg-[#FFFDF9] px-4 py-3"
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--teal)] text-xs font-bold text-white">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium leading-6 text-[#33423E]">{item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 rounded-2xl border border-[#DCEBE6] bg-[linear-gradient(135deg,#F4FBF8_0%,#FFF8F1_100%)] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6F7E79]">
                            Why this feels like a product
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#4F5E5A]">
                            The next step stays obvious, your saved details carry forward, and updates come back to you
                            without you chasing three different people.
                          </p>
                        </div>
                      </div>

                      <div className="relative min-h-[280px] border-t border-[#E8DDD0] bg-[linear-gradient(180deg,#F8FBFA_0%,#FFF7EF_100%)] p-5 md:min-h-full md:border-l md:border-t-0 sm:p-6">
                        <div className="rounded-[1.35rem] border border-[#E2EEE9] bg-white/95 p-4 shadow-[0_16px_34px_rgba(31,44,39,0.08)]">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A847F]">Featured centre</p>
                              <p className="mt-1 text-base font-bold text-[#20302C]">{featuredCentre?.name ?? 'ECD Centre'}</p>
                            </div>
                            <div className="rounded-full bg-[#EDF8F5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--teal)]">
                              {featuredCentre?.isClaimed ? 'Live now' : 'Preview'}
                            </div>
                          </div>
                          <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-[1.2rem] border border-[#E8DDD0]">
                            <Image
                              src={featuredHeroImage}
                              alt={featuredCentre?.name ?? 'ECD Centre'}
                              fill
                              className="object-cover"
                              priority
                              unoptimized={featuredHeroImage.startsWith('data:image/svg+xml')}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,29,26,0.04)_0%,rgba(17,29,26,0.14)_45%,rgba(17,29,26,0.48)_100%)]" />
                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">Parent sees</p>
                              <p className="mt-1 text-sm font-semibold text-white">Trust, suburb, and the next step to apply</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[1.35rem] border border-[#E8DDD0] bg-[#1E2C28] p-4 text-white shadow-[0_18px_40px_rgba(31,44,39,0.18)]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#CBE1D6]">Centre side</p>
                          <div className="mt-3 space-y-2">
                            {centreMoments.map((item) => (
                              <div key={item} className="flex items-start gap-2 rounded-xl bg-white/6 px-3 py-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8CE1B6]" />
                                <span className="text-sm leading-5 text-[#E7F2EC]">{item}</span>
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
            <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-[#E9DDD0] bg-[linear-gradient(135deg,#FFFDF9_0%,#F7FCFA_44%,#FFF4E9_100%)] p-5 shadow-[0_18px_40px_rgba(31,44,39,0.07)] sm:rounded-[2rem] sm:p-8">
              <div className="max-w-2xl">
                <h2
                  className="text-[1.95rem] leading-[1.05] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.8rem] sm:leading-[1]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Real crèches. Real spaces.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-[#616E6B] sm:text-base">
                  We highlight registered centres and verified partners so parents can apply with confidence.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {activeCentres.map((centre) => (
                  <Link
                    key={centre.id}
                    href={centreHref(centre)}
                    className="overflow-hidden rounded-[1.35rem] border border-[#E9DED1] bg-white transition-transform hover:-translate-y-0.5 hover:border-[var(--teal)]/20 sm:rounded-[1.5rem]"
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
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7D837F]">
                          {centre.suburb ?? 'Johannesburg'}
                        </p>
                        {getDistanceMinutes(centre) && (
                          <span className="flex items-center gap-1 text-xs font-bold text-[var(--teal)]">
                            <MapPin className="h-3 w-3" />
                            {getDistanceMinutes(centre)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold leading-snug text-[#21302D]">{centre.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {centre.isRegistered && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            DSD Registered
                          </span>
                        )}
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
                      <div className={`mt-3 rounded-[1.05rem] border px-3 py-2 ${centre.isClaimed ? 'border-[#DCEEE8] bg-[linear-gradient(180deg,#F8FCFB_0%,#EEF8F5_100%)]' : 'border-[#E7DDD1] bg-[#FAF8F4]'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6A7672]">
                          {centre.isClaimed ? 'Why this feels better for parents' : 'What this profile helps with'}
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-[#4E5D59]">
                          {centre.isClaimed
                            ? 'Daily updates, calmer pickup, and a more organised application journey once your child joins.'
                            : 'A clean preview for comparing the creche now while CentreConnect applications are still coming online.'}
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
                  Your child only leaves with someone you approved.
                </h2>
                <p className="mt-5 text-[15px] leading-7 text-[#D8E5D7] sm:text-[17px] sm:leading-8">
                  Pickup stays simple for the crèche and clear for the parent. The secure code is checked, authorised
                  adults are visible, and you hear about collection straight away.
                </p>

                <div className="mt-7 space-y-3">
                  {safetyPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-[#E4EEE3] sm:text-[15px]">
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

              <div className="relative mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[12px] border-[#111A12] bg-[#111714] p-5 shadow-[0_32px_72px_rgba(0,0,0,0.34)] sm:max-w-[360px] sm:rounded-[3rem] sm:p-6">
                <div className="mx-auto mb-8 h-1.5 w-16 rounded-full bg-[#2A352C]" />
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
                          className="flex h-12 w-11 items-center justify-center rounded-2xl border border-[#3A4C3D] bg-[#1D2720] text-2xl font-bold text-[#F2D6B2] sm:h-14 sm:w-12"
                        >
                          {item === 1 ? '8' : item === 2 ? '4' : '•'}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#5C6E60] bg-[#233027] p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7E7D7]">Identity verified</p>
                  </div>
                  <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--teal)] text-sm font-bold text-white">
                    Confirm release
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E5D9CC] bg-[linear-gradient(90deg,#FFF8F1_0%,#FFFDF9_50%,#F5FBF9_100%)]">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-center text-sm leading-6 text-[#64716D]">
              Trusted by registered crèches in Alexandra, Marlboro, and across Johannesburg.{locationError ? ' Location access is optional for quick nearby estimates.' : ''}
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[1.9rem] bg-[linear-gradient(135deg,#0D9488_0%,#107F78_100%)] px-5 py-9 text-white shadow-[0_24px_60px_rgba(13,148,136,0.24)] sm:rounded-[2.2rem] sm:px-10 sm:py-12 lg:px-14">
            <div className="max-w-3xl">
              <h2
                className="text-[1.95rem] leading-[1.05] tracking-[-0.03em] text-white sm:text-[3rem] sm:leading-[1]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Start with the directory. Create an account when you need it.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-teal-50 sm:text-[17px] sm:leading-8">
                Look first. Decide faster. Save your details once when you are ready to apply.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="h-14 w-full justify-center rounded-[1.05rem] bg-white px-7 text-base font-semibold text-[var(--teal)] shadow-none hover:bg-[#F3FBF9] sm:w-auto"
                asChild
              >
                <Link href="/directory">
                  <span>Directory</span>
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


