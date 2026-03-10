import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, Clock3, FileCheck2, ShieldCheck, Share2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'

export type HomeActiveCentre = {
  id: string
  name: string
  slug: string | null
  suburb: string | null
  primaryAgeGroup: string | null
  isRegistered: boolean
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

const steps = [
  {
    number: '1',
    title: 'Search by area',
    body: 'Find trusted crèches near you with the details parents actually need to decide.',
  },
  {
    number: '2',
    title: 'Save documents once',
    body: 'Keep your child’s documents in one secure place and reuse them for every application.',
  },
  {
    number: '3',
    title: 'Get updates in one place',
    body: 'See replies, next steps, and reminders without bouncing between calls and WhatsApp chats.',
  },
] as const

const parentPromises = [
  {
    title: 'Fees and hours upfront',
    body: 'Know monthly fees, hours, and available age groups before you visit.',
  },
  {
    title: 'Safety you can see',
    body: 'Pickup verification and authorised adults stay visible in your account.',
  },
  {
    title: 'Your docs stay private',
    body: 'Only the centres you apply to can view your child’s documents.',
  },
] as const

const applyChecklist = [
  'Child’s birth certificate or clinic card',
  'Parent/guardian ID or passport',
  'Proof of address (if required by the centre)',
  'Immunisation record or clinic card',
] as const

const faqItems = [
  {
    title: 'Is this free for parents?',
    body: 'Yes. Parents can search and apply without payment details.',
  },
  {
    title: 'How do I know a centre is legitimate?',
    body: 'We highlight registered centres and verified partners before you apply.',
  },
  {
    title: 'Can I apply to more than one crèche?',
    body: 'Yes. Save your profile once and apply to multiple centres faster.',
  },
] as const

const safetyPoints = [
  'Every pickup uses a secure code.',
  'Staff see who is authorised before release.',
  'Parents get notified as soon as collection happens.',
] as const

function suburbHref(suburb: string) {
  return `/directory?suburb=${encodeURIComponent(suburb)}`
}

type SuburbPill = typeof suburbPills[number]

function centreHref(centre: HomeActiveCentre) {
  if (centre.slug) return `/c/${centre.slug}`
  if (centre.suburb) return suburbHref(centre.suburb)
  return '/directory'
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

  const featuredHeroImage = featuredCentre
    ? getCentreHeroImage(featuredCentre.slug, featuredCentre.coverImage)
    : 'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'

  return (
    <div
      className="min-h-screen overflow-x-clip bg-[var(--cream)] text-[#22312E] overscroll-none selection:bg-teal-100 selection:text-teal-950"
      style={{
        fontFamily: 'var(--font-dm-sans)',
        ['--teal' as string]: '#0D9488',
        ['--amber' as string]: '#D4935A',
        ['--amber-light' as string]: '#FDF0E6',
        ['--forest' as string]: '#1A2E1F',
        ['--cream' as string]: '#FAF8F4',
        ['--warm-white' as string]: '#FFFDF9',
      }}
    >
      <main className="pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <section className="relative overflow-hidden border-b border-[#E9DED1] bg-[var(--warm-white)]">
          <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(212,147,90,0.18),transparent_48%),radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_34%)]" />
          <div className="absolute -left-20 top-16 h-40 w-40 rounded-full bg-[rgba(212,147,90,0.10)] blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-12">
              <div className="min-w-0 max-w-3xl">
                <div
                  className="inline-flex items-center rounded-full border px-4 py-2 text-[13px] font-semibold sm:text-sm"
                  style={{
                    backgroundColor: 'var(--amber-light)',
                    borderColor: 'rgba(212,147,90,0.28)',
                    color: 'var(--amber)',
                  }}
                >
                  Now live in Alexandra, Johannesburg
                </div>

                <h1
                  className="mt-5 text-[2.45rem] leading-[1.04] tracking-[-0.04em] text-[#1E2C28] sm:max-w-[12ch] sm:text-[4rem] sm:leading-[0.98] lg:max-w-none lg:text-[5rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Finding the right crèche near you just got simpler.
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-[#5D6966] sm:text-[18px] sm:leading-8">
                  Search trusted crèches across Johannesburg, compare the details that matter, and apply without starting
                  from scratch each time.
                </p>

                <p className="mt-3 text-[13px] italic leading-6 text-[#7B827E] sm:text-[15px] sm:leading-7">
                  Finally, no more asking the same questions on three WhatsApp chats.
                </p>

                <div className="mt-5 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                  <div className="flex min-w-max gap-2 pb-1">
                    {suburbPills.map((suburb) => (
                      <Link
                        key={suburb.name}
                        href={suburbHref(suburb.name)}
                        className="inline-flex items-center whitespace-nowrap rounded-full border border-[#D9D8CF] bg-[var(--cream)] px-4 py-2 text-sm font-medium text-[#485654] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
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
                    <Link href="/directory">Search Crèches Near Me</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-[1.05rem] border-[#DED2C5] bg-white px-7 text-base font-semibold text-[#22312E] shadow-[0_10px_26px_rgba(34,49,46,0.05)] hover:bg-[#F8F3EC] sm:w-auto"
                    asChild
                  >
                    <Link href="/register">
                      <span>Save My Parent Profile</span>
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
                  Apply in under 2 minutes — documents ready? You&apos;re halfway there.
                </p>

                <p className="mt-4 text-[11px] font-medium tracking-[0.01em] text-[#7B817C] sm:text-[12px]">
                  Free for parents. No payment details needed.
                </p>
                <p className="mt-2 text-[11px] font-medium tracking-[0.01em] text-[#7B817C] sm:text-[12px]">
                  Starting in Alexandra. Growing across Johannesburg.
                </p>
              </div>

              <div className="min-h-[320px] lg:min-h-0">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-[#E8DDD0] bg-white shadow-xl sm:rounded-[2rem]">
                  <Image
                    src={featuredHeroImage}
                    alt={featuredCentre?.name ?? 'ECD Centre'}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#132320]/60 via-transparent to-transparent" />
                  
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90 sm:text-xs">Featured partner</p>
                    <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{featuredCentre?.name}</h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#E8DDD0] bg-white shadow-[0_32px_80px_rgba(27,40,36,0.06)]">
            <div className="grid lg:grid-cols-2 lg:items-stretch">
              <div className="relative min-h-[320px] bg-[#EEF6F5] lg:min-h-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.15),transparent_70%)]" />
                <div className="relative flex h-full flex-col items-center justify-center p-8 text-center sm:p-12">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white shadow-xl">
                    <span className="text-3xl font-black text-[var(--teal)]">B</span>
                  </div>
                  <h3
                    className="text-[2rem] leading-tight text-[#1F2D29] sm:text-[2.6rem]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    Bajabulile ECD
                  </h3>
                  <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#7B827E]">Alexandra Pilot Partner</p>
                  
                  <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:max-w-md">
                    <div className="rounded-2xl border border-[#D1E2E0] bg-white/50 p-4 backdrop-blur-sm">
                      <p className="text-2xl font-bold text-[var(--teal)]">35+</p>
                      <p className="mt-1 text-xs font-medium text-[#5F6C68]">Children enrolled</p>
                    </div>
                    <div className="rounded-2xl border border-[#D1E2E0] bg-white/50 p-4 backdrop-blur-sm">
                      <p className="text-2xl font-bold text-[var(--teal)]">100%</p>
                      <p className="mt-1 text-xs font-medium text-[#5F6C68]">Digital records</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">Pilot Success Story</p>
                <h2
                  className="mt-4 text-[2.2rem] leading-[1.04] tracking-[-0.035em] text-[#1F2D29] sm:text-[2.8rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  &quot;Now I spend my time with children, not with paper.&quot;
                </h2>
                <blockquote className="mt-6 border-l-2 border-[#D4935A] pl-6 text-[17px] italic leading-8 text-[#5F6C68] sm:text-[19px]">
                  Before CentreConnect, Mama Bajabulile managed attendance and parent updates on paper. Today, Bajabulile Day Care is the first fully digital pilot centre in Alexandra — proving that technology can work for every local crèche.
                </blockquote>
                
                <div className="mt-10 flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="h-14 rounded-2xl bg-[var(--teal)] px-8 font-semibold text-white shadow-[0_16px_34px_rgba(13,148,136,0.22)] hover:bg-[#0B857A]"
                    asChild
                  >
                    <Link href="/c/bajabulile">View Bajabulile Profile</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">How it works</p>
              <h2
                className="mt-3 text-[2rem] leading-[1.04] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.9rem] sm:leading-[1]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                One calm flow from search to application.
              </h2>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.title}
                  className="rounded-[1.5rem] border border-[#E8DDD0] bg-white p-5 shadow-[0_12px_28px_rgba(31,44,39,0.05)] sm:rounded-[1.7rem] sm:p-6"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'var(--amber-light)', color: 'var(--amber)' }}
                  >
                    <span className="text-2xl leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[1.35rem] leading-tight text-[#21302D] sm:text-[1.45rem]" style={{ fontFamily: 'var(--font-serif)' }}>
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#616E6B]">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#E9DED1] bg-[var(--warm-white)] p-6 shadow-[0_20px_50px_rgba(31,44,39,0.05)] sm:rounded-[2.4rem] sm:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--amber)]">Parent answers</p>
              <h2
                className="mt-3 text-[2rem] leading-[1.04] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.8rem] sm:leading-[1]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Everything you want to know before you apply.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#616E6B] sm:text-base">
                Real details upfront so parents can make a calm, confident choice.
              </p>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {parentPromises.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.4rem] border border-[#E8DDD0] bg-white p-5 shadow-[0_10px_26px_rgba(31,44,39,0.04)]"
                >
                  <h3 className="text-lg font-semibold text-[#21302D]">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#616E6B]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#E8DDD0] bg-white shadow-[0_24px_64px_rgba(31,44,39,0.06)]">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="p-6 sm:p-10 lg:p-12">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">Apply prep</p>
                <h2
                  className="mt-3 text-[2rem] leading-[1.04] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.6rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  What you need to apply.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-[#616E6B] sm:text-base">
                  Keep these on your phone once, then reuse them for every application.
                </p>
                <div className="mt-6 space-y-3">
                  {applyChecklist.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-[#E8DDD0] bg-[var(--warm-white)] px-4 py-3 text-sm font-medium text-[#37433F]"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--teal)] text-xs font-bold text-white">
                        ✓
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#F5EFE7] p-6 sm:p-10 lg:p-12">
                <div className="rounded-[1.8rem] border border-[#E2D6C9] bg-white p-6 shadow-[0_16px_40px_rgba(31,44,39,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7B827E]">Parent FAQs</p>
                  <div className="mt-4 space-y-4">
                    {faqItems.map((item) => (
                      <div key={item.title}>
                        <p className="text-sm font-semibold text-[#1F2D29]">{item.title}</p>
                        <p className="mt-2 text-[15px] leading-7 text-[#616E6B]">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {showProofBand ? (
          <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-[#E9DDD0] bg-[var(--warm-white)] p-5 shadow-[0_18px_40px_rgba(31,44,39,0.05)] sm:rounded-[2rem] sm:p-8">
              <div className="max-w-2xl">
                <h2
                  className="text-[1.95rem] leading-[1.05] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.8rem] sm:leading-[1]"
                  style={{ fontFamily: 'var(--font-serif)' }}
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
                        src={getCentreHeroImage(centre.slug, centre.coverImage)}
                        alt={centre.name}
                        fill
                        className="object-cover"
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
                  style={{ fontFamily: 'var(--font-serif)' }}
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

        <section className="border-y border-[#E5D9CC] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-center text-sm leading-6 text-[#64716D]">
              Trusted by registered crèches in Alexandra, Marlboro, and across Johannesburg.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[1.9rem] bg-[linear-gradient(135deg,#0D9488_0%,#107F78_100%)] px-5 py-9 text-white shadow-[0_24px_60px_rgba(13,148,136,0.24)] sm:rounded-[2.2rem] sm:px-10 sm:py-12 lg:px-14">
            <div className="max-w-3xl">
              <h2
                className="text-[1.95rem] leading-[1.05] tracking-[-0.03em] text-white sm:text-[3rem] sm:leading-[1]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Start with your area. Save your profile when you’re ready.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-teal-50 sm:text-[17px] sm:leading-8">
                Browse what is near you first, then keep one parent profile ready for every application that follows.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="h-14 w-full justify-center rounded-[1.05rem] bg-white px-7 text-base font-semibold text-[var(--teal)] shadow-none hover:bg-[#F3FBF9] sm:w-auto"
                asChild
              >
                <Link href="/directory">
                  <span>Search Crèches Near Me</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 w-full rounded-[1.05rem] border border-white/30 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
                asChild
              >
                <Link href="/register">Create My Parent Profile</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
