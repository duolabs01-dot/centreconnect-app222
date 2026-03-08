import Link from 'next/link'
import { ArrowRight, Check, Clock3, FileCheck2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type HomeActiveCentre = {
  id: string
  name: string
  slug: string | null
  suburb: string | null
  primaryAgeGroup: string | null
  isRegistered: boolean
}

type HomeClientPageProps = {
  activeCentres: HomeActiveCentre[]
}

const suburbPills = ['Alexandra', 'Marlboro', 'Wynberg', 'Tembisa', 'Sandton'] as const

const steps = [
  {
    number: '1',
    title: 'Search by suburb',
    body: 'Find registered crèches near you with clear details, so you are not stitching together answers from outdated listings.',
  },
  {
    number: '2',
    title: 'Upload once',
    body: 'Keep your child’s documents in one place and reuse them whenever you apply to another centre.',
  },
  {
    number: '3',
    title: 'Track on your phone',
    body: 'Follow replies, next steps and updates without chasing the same questions across calls and WhatsApp chats.',
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

function centreHref(centre: HomeActiveCentre) {
  if (centre.slug) return `/c/${centre.slug}`
  if (centre.suburb) return suburbHref(centre.suburb)
  return '/directory'
}

export default function HomeClientPage({ activeCentres }: HomeClientPageProps) {
  const featuredCentre = activeCentres[0] ?? null
  const showProofBand = activeCentres.length >= 2

  return (
    <div
      className="min-h-screen overflow-x-clip bg-[var(--cream)] text-[#22312E] overscroll-none selection:bg-teal-100 selection:text-teal-950"
      style={{
        fontFamily: 'var(--font-dm-sans)',
        ['--teal' as string]: '#0D9488',
        ['--amber' as string]: '#D4935A',
        ['--forest' as string]: '#1A2E1F',
        ['--cream' as string]: '#FAF8F4',
        ['--warm-white' as string]: '#FFFDF9',
      }}
    >
      <main className="pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        <section className="relative overflow-hidden border-b border-[#E9DED1] bg-[var(--warm-white)]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(212,147,90,0.18),transparent_48%),radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_34%)]" />
          <div className="absolute -left-20 top-16 h-40 w-40 rounded-full bg-[rgba(212,147,90,0.10)] blur-3xl" />
          <div className="absolute right-0 top-24 h-48 w-48 rounded-full bg-[rgba(13,148,136,0.08)] blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-12">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-[rgba(212,147,90,0.28)] bg-[rgba(212,147,90,0.14)] px-4 py-2 text-sm font-semibold text-[#9A6234]">
                  Now live in Alexandra, Johannesburg
                </div>

                <h1
                  className="mt-5 text-[3rem] leading-[0.95] tracking-[-0.045em] text-[#1E2C28] sm:text-[4rem] lg:text-[5rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Finding the right crèche near you just got simpler.
                </h1>

                <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[#5D6966] sm:text-[18px]">
                  Search registered crèches across Johannesburg, compare the details that matter, and apply without
                  starting from scratch each time.
                </p>

                <p className="mt-4 text-sm italic leading-7 text-[#7B827E] sm:text-[15px]">
                  Finally, no more asking the same questions on three WhatsApp chats.
                </p>

                <div className="mt-6 -mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
                  <div className="flex min-w-max gap-2.5 pb-1">
                    {suburbPills.map((suburb) => (
                      <Link
                        key={suburb}
                        href={suburbHref(suburb)}
                        className="inline-flex items-center rounded-full border border-[#E6D9CA] bg-white px-4 py-2 text-sm font-medium text-[#485654] transition-colors hover:border-[var(--teal)]/30 hover:text-[var(--teal)]"
                      >
                        {suburb}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    size="lg"
                    className="h-14 rounded-[1.05rem] bg-[var(--teal)] px-7 text-base font-semibold text-white shadow-[0_16px_34px_rgba(13,148,136,0.22)] hover:bg-[#0B857A]"
                    asChild
                  >
                    <Link href="/directory">Search Crèches Near Me</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-[1.05rem] border-[#DED2C5] bg-white px-7 text-base font-semibold text-[#22312E] shadow-[0_10px_26px_rgba(34,49,46,0.05)] hover:bg-[#F8F3EC]"
                    asChild
                  >
                    <Link href="/register">
                      <span>Create Parent Profile</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <p className="mt-4 text-[12px] font-medium tracking-[0.01em] text-[#7B817C]">
                  Starting in Alexandra. Growing across Johannesburg.
                </p>
              </div>

              <div className="lg:pl-4">
                <div className="rounded-[2rem] border border-[#E8DDD0] bg-white p-4 shadow-[0_24px_60px_rgba(27,40,36,0.08)] sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#A86C3A]">One real centre near you</p>

                  {featuredCentre ? (
                    <Link
                      href={centreHref(featuredCentre)}
                      className="mt-4 block rounded-[1.6rem] border border-[#EBE0D2] bg-[var(--warm-white)] p-5 transition-transform hover:-translate-y-0.5 hover:border-[var(--teal)]/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7D847F]">
                            {featuredCentre.suburb ?? 'Johannesburg'}
                          </p>
                          <h2
                            className="mt-2 text-[1.9rem] leading-tight text-[#21302C]"
                            style={{ fontFamily: 'var(--font-serif)' }}
                          >
                            {featuredCentre.name}
                          </h2>
                        </div>
                        {featuredCentre.isRegistered ? (
                          <span className="rounded-full bg-[rgba(212,147,90,0.14)] px-3 py-1 text-xs font-semibold text-[#9A6234]">
                            Verified
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(13,148,136,0.10)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                          {featuredCentre.primaryAgeGroup ?? 'Mixed age groups'}
                        </span>
                        <span className="rounded-full bg-[#F6EEE4] px-3 py-1 text-xs font-semibold text-[#8C603B]">
                          Centre profile live
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-[#E8DDD0] bg-white px-4 py-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#44524F]">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6E8D7] text-[#A86C3A]">
                              <FileCheck2 className="h-4 w-4" />
                            </span>
                            Documents ready once
                          </div>
                        </div>
                        <div className="rounded-[1.2rem] border border-[#E8DDD0] bg-white px-4 py-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#44524F]">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6E8D7] text-[#A86C3A]">
                              <Clock3 className="h-4 w-4" />
                            </span>
                            Faster follow-up on your phone
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="mt-4 rounded-[1.6rem] border border-[#EBE0D2] bg-[var(--warm-white)] p-5">
                      <p className="text-sm font-medium text-[#53615D]">
                        Active crèches are appearing here as the Alexandra launch grows.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {showProofBand ? (
          <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#E9DDD0] bg-[var(--warm-white)] p-5 shadow-[0_18px_40px_rgba(31,44,39,0.05)] sm:p-8">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#A86C3A]">Near you now</p>
                <h2
                  className="mt-3 text-[2.2rem] leading-[1] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.8rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Real crèches. Real spaces.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-[#616E6B] sm:text-base">
                  Every centre is registered and verified before parents can apply.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {activeCentres.map((centre) => (
                  <Link
                    key={centre.id}
                    href={centreHref(centre)}
                    className="rounded-[1.5rem] border border-[#E9DED1] bg-white p-4 transition-transform hover:-translate-y-0.5 hover:border-[var(--teal)]/20"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7D837F]">
                      {centre.suburb ?? 'Johannesburg'}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-[#21302D]">{centre.name}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[rgba(13,148,136,0.10)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                        {centre.primaryAgeGroup ?? 'Mixed age groups'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#A86C3A]">How it works</p>
              <h2
                className="mt-3 text-[2.25rem] leading-[1] tracking-[-0.03em] text-[#1F2D29] sm:text-[2.9rem]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                One calm flow from search to application.
              </h2>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.title}
                  className="rounded-[1.7rem] border border-[#E8DDD0] bg-white p-6 shadow-[0_12px_28px_rgba(31,44,39,0.05)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(212,147,90,0.14)] text-[#A86C3A]">
                    <span className="text-2xl leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[1.45rem] leading-tight text-[#21302D]" style={{ fontFamily: 'var(--font-serif)' }}>
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#616E6B]">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.4rem] bg-[var(--forest)] px-6 py-12 text-white shadow-[0_30px_80px_rgba(26,46,31,0.24)] sm:px-10 sm:py-16 lg:px-16">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="max-w-xl">
                <h2
                  className="text-[2.35rem] leading-[1.02] tracking-[-0.035em] text-white sm:text-[3.1rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Your child only leaves with someone you approved.
                </h2>
                <p className="mt-5 text-[16px] leading-8 text-[#D8E5D7] sm:text-[17px]">
                  Pickup stays simple for the crèche and clear for the parent. The secure code is checked, authorised
                  adults are visible, and you hear about collection straight away.
                </p>

                <div className="mt-8 space-y-3">
                  {safetyPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-[#E4EEE3] sm:text-[15px]">
                      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#E3B37F]">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[360px] rounded-[3rem] border-[12px] border-[#111A12] bg-[#111714] p-6 shadow-[0_32px_72px_rgba(0,0,0,0.34)]">
                <div className="mx-auto mb-8 h-1.5 w-16 rounded-full bg-[#2A352C]" />
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#E3B37F]">Pickup code</p>
                    <p className="text-base font-bold text-white">Safe child pickup</p>
                  </div>
                  <div className="flex justify-center py-8">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4].map((item) => (
                        <div
                          key={item}
                          className="flex h-14 w-12 items-center justify-center rounded-2xl border border-[#3A4C3D] bg-[#1D2720] text-2xl font-bold text-[#F2D6B2]"
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

        <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2.2rem] bg-[linear-gradient(135deg,#0D9488_0%,#107F78_100%)] px-6 py-10 text-white shadow-[0_24px_60px_rgba(13,148,136,0.24)] sm:px-10 sm:py-12 lg:px-14">
            <div className="max-w-3xl">
              <h2
                className="text-[2.3rem] leading-[1] tracking-[-0.03em] text-white sm:text-[3rem]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Start with your area. Save your profile when you’re ready.
              </h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-8 text-teal-50 sm:text-[17px]">
                Browse what is near you first, then keep one parent profile ready for every application that follows.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="h-14 rounded-[1.05rem] bg-white px-7 text-base font-semibold text-[var(--teal)] shadow-none hover:bg-[#F3FBF9]"
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
                className="h-14 rounded-[1.05rem] border border-white/30 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
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
