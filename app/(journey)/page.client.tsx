import Link from 'next/link'
import { ArrowRight, Clock3, FileCheck2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type HomeActiveCentre = {
  id: string
  name: string
  slug: string | null
  suburb: string | null
  primaryAgeGroup: string | null
  isRegistered: boolean
  isPilot?: boolean
  isFeatured?: boolean
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
  const showProofBand = activeCentres.length > 0

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
                  Search registered crèches across Johannesburg, compare the details that matter, and apply without
                  starting from scratch each time.
                </p>

                <p className="mt-3 text-[13px] italic leading-6 text-[#7B827E] sm:text-[15px] sm:leading-7">
                  Finally, no more asking the same questions on three WhatsApp chats.
                </p>

                <div className="mt-5 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                  <div className="flex min-w-max gap-2 pb-1">
                    {suburbPills.map((suburb) => (
                      <Link
                        key={suburb}
                        href={suburbHref(suburb)}
                        className="inline-flex items-center whitespace-nowrap rounded-full border border-[#D9D8CF] bg-[var(--cream)] px-4 py-2 text-sm font-medium text-[#485654] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                      >
                        {suburb}
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
                      <span>Create Parent Profile</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <p className="mt-4 text-[11px] font-medium tracking-[0.01em] text-[#7B817C] sm:text-[12px]">
                  Starting in Alexandra. Growing across Johannesburg.
                </p>
              </div>

              <div className="min-w-0 lg:pl-4">
                <div className="rounded-[1.75rem] border border-[#E8DDD0] bg-white p-4 shadow-[0_24px_60px_rgba(27,40,36,0.08)] sm:rounded-[2rem] sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--teal)] sm:text-xs">One real centre near you</p>

                  {featuredCentre ? (
                    <Link
                      href={centreHref(featuredCentre)}
                      className="mt-4 block rounded-[1.4rem] border border-[#EBE0D2] bg-[var(--warm-white)] p-4 transition-transform hover:-translate-y-0.5 hover:border-[var(--teal)]/20 sm:rounded-[1.6rem] sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7D847F]">
                            {featuredCentre.suburb ?? 'Johannesburg'}
                          </p>
                          <h2
                            className="mt-2 text-[1.5rem] leading-[1.08] text-[#21302C] sm:text-[1.9rem]"
                            style={{ fontFamily: 'var(--font-serif)' }}
                          >
                            {featuredCentre.name}
                          </h2>
                        </div>
                        {featuredCentre.isFeatured ? (
                          <span
                            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md"
                            style={{ backgroundColor: '#f59e0b' }}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Recommended Partner
                          </span>
                        ) : featuredCentre.isPilot ? (
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: 'var(--teal)' }}
                          >
                            Pilot Partner
                          </span>
                        ) : null}
                        {featuredCentre.isRegistered ? (
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'var(--amber-light)', color: 'var(--amber)' }}
                          >
                            Verified
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[rgba(13,148,136,0.10)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                          {featuredCentre.primaryAgeGroup ?? 'Mixed age groups'}
                        </span>
                        <span className="rounded-full bg-[#EEF6F5] px-3 py-1 text-xs font-semibold text-[#4C6762]">
                          Centre profile live
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.1rem] border border-[#E8DDD0] bg-white px-4 py-3 sm:rounded-[1.2rem]">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#44524F]">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ backgroundColor: 'var(--amber-light)', color: 'var(--amber)' }}
                            >
                              <FileCheck2 className="h-4 w-4" />
                            </span>
                            Documents ready once
                          </div>
                        </div>
                        <div className="rounded-[1.1rem] border border-[#E8DDD0] bg-white px-4 py-3 sm:rounded-[1.2rem]">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#44524F]">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ backgroundColor: 'var(--amber-light)', color: 'var(--amber)' }}
                            >
                              <Clock3 className="h-4 w-4" />
                            </span>
                            Faster follow-up on your phone
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="mt-4 rounded-[1.4rem] border border-[#EBE0D2] bg-[var(--warm-white)] p-4 sm:rounded-[1.6rem] sm:p-5">
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
                  Every centre on CentreConnect is registered and verified before parents can apply.
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {activeCentres.map((centre) => (
                  <Link
                    key={centre.id}
                    href={centreHref(centre)}
                    className="rounded-[1.35rem] border border-[#E9DED1] bg-white p-4 transition-transform hover:-translate-y-0.5 hover:border-[var(--teal)]/20 sm:rounded-[1.5rem]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7D837F]">
                      {centre.suburb ?? 'Johannesburg'}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-[#21302D]">{centre.name}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {centre.isFeatured ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                          <ShieldCheck className="h-3 w-3" />
                          Recommended Partner
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
