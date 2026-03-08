import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Check,
  Clock3,
  FileCheck2,
  HeartHandshake,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const trustItems = ['Free for parents', 'Registered centres first', 'No WhatsApp chasing'] as const

const benefitCards = [
  {
    icon: MapPinned,
    title: 'Search with real details',
    body: 'See suburb, age groups, fees and availability signals in one place instead of piecing it together from old listings.',
    tone: 'bg-[#FFF8EE] border-[#E9DAC6]',
  },
  {
    icon: FileCheck2,
    title: 'Keep documents ready',
    body: 'Upload once, then reuse the same birth certificate, ID and proof of address whenever you apply again.',
    tone: 'bg-white border-[#E8DED2]',
  },
  {
    icon: BellRing,
    title: 'Know what happens next',
    body: 'Application updates come back to your phone, so you are not chasing replies across calls, emails and WhatsApp chats.',
    tone: 'bg-white border-[#E8DED2]',
  },
  {
    icon: HeartHandshake,
    title: 'Feel safer every day',
    body: 'Collection is verified and authorised pickups are clear, giving parents one less thing to worry about after drop-off.',
    tone: 'bg-[#EFF7F5] border-[#D6E8E3]',
  },
] as const

const steps = [
  {
    number: '1',
    title: 'Search by suburb',
    body: 'Find registered crèches with real details like fees, age groups and the kind of day-to-day information parents usually have to ask for one by one.',
  },
  {
    number: '2',
    title: 'Upload once',
    body: 'Save your child’s documents once and keep them ready. No resending the same forms every time a centre asks.',
  },
  {
    number: '3',
    title: 'Track on your phone',
    body: 'Apply to multiple crèches and get a clear update as soon as a centre responds, so you always know where things stand.',
  },
] as const

const safetyPoints = [
  'Every pickup uses a secure code.',
  'Staff see who is authorised before release.',
  'Parents get a notification the moment collection happens.',
] as const

export default function HomeClientPage() {
  return (
    <div
      className="min-h-screen overflow-x-clip bg-[#FAF8F4] text-[#21302D] overscroll-none selection:bg-teal-100 selection:text-teal-950"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      <main className="pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        <section className="relative overflow-hidden border-b border-[#E6DDD2] bg-[linear-gradient(180deg,#FFFDF9_0%,#FAF8F4_62%,#F4ECE2_100%)]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(255,235,204,0.75),transparent_48%),radial-gradient(circle_at_top_right,rgba(184,230,223,0.55),transparent_34%)]" />
          <div className="absolute -left-16 top-24 h-44 w-44 rounded-full bg-[#F7E4C9]/80 blur-3xl" />
          <div className="absolute right-0 top-20 h-56 w-56 rounded-full bg-[#DCEFE9] blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE6E0] bg-[#EAF6F2] px-4 py-2 text-sm font-semibold text-[#0D9488] shadow-[0_10px_24px_rgba(13,148,136,0.10)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                <span>Now live in Alexandra, Johannesburg</span>
              </div>

              <h1
                className="mt-6 max-w-4xl text-[3.2rem] leading-[0.94] tracking-[-0.045em] text-[#1C2A27] sm:text-[4.45rem] lg:text-[5.2rem]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Finding the right crèche should feel calm.
              </h1>

              <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[#5C6966] sm:text-[18px]">
                CentreConnect helps parents search registered crèches near them, keep documents in one place, and apply
                without starting from scratch every time. Free for parents, built for Johannesburg families.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-14 rounded-[1.1rem] bg-[#0D9488] px-7 text-base font-semibold text-white shadow-[0_16px_32px_rgba(13,148,136,0.22)] hover:bg-[#0B857A]"
                  asChild
                >
                  <Link href="/directory">Search Crèches Near Me</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-[1.1rem] border-[#DCD4C8] bg-white/90 px-7 text-base font-semibold text-[#21302D] shadow-[0_10px_24px_rgba(35,47,43,0.06)] hover:bg-[#F9F4EC]"
                  asChild
                >
                  <Link href="/for-centres">
                    <span>I run a crèche</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#E6DDD2] pt-6 text-sm text-[#41514D]">
                {trustItems.map((item) => (
                  <div key={item} className="inline-flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DDF3EE] text-[#0D9488]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 max-w-2xl rounded-[1.75rem] border border-[#E8DDD0] bg-white/80 p-5 shadow-[0_14px_36px_rgba(28,42,39,0.06)] backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0D9488]">Made for real life</p>
                <p className="mt-3 text-[15px] leading-7 text-[#5E6D69]">
                  For the parent comparing fees on a lunch break, chasing forms after work, and trying not to miss the one
                  crèche that actually has space.
                </p>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-[33rem] items-center justify-center lg:justify-end">
              <div className="absolute -top-3 right-8 h-28 w-28 rounded-full border border-white/70 bg-white/55 blur-2xl" />

              <div className="relative w-full rounded-[2.3rem] border border-[#E5DBCF] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,250,244,0.92)_100%)] p-5 shadow-[0_28px_70px_rgba(30,45,40,0.10)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0D9488]">Parent profile</p>
                    <h2 className="mt-2 text-[1.7rem] leading-tight text-[#1E2A27]" style={{ fontFamily: 'var(--font-serif)' }}>
                      One place for search, forms and updates.
                    </h2>
                  </div>
                  <div className="rounded-full bg-[#EFF7F5] px-3 py-1 text-xs font-semibold text-[#0D9488]">Alexandra</div>
                </div>

                <div className="mt-6 rounded-[1.7rem] border border-[#E6DACC] bg-white p-4 shadow-[0_10px_22px_rgba(34,49,44,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#20302C]">Little Sunbirds Crèche</p>
                      <p className="mt-1 text-sm text-[#6A7672]">Marlboro Gardens • 18 months to 5 years</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF6F2] px-2.5 py-1 text-[11px] font-semibold text-[#0D9488]">
                      <Sparkles className="h-3 w-3" />
                      Registered
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#4C5C58]">
                    <span className="rounded-full bg-[#F7F0E7] px-3 py-1">Fees from R1 450</span>
                    <span className="rounded-full bg-[#F7F0E7] px-3 py-1">Aftercare available</span>
                    <span className="rounded-full bg-[#F7F0E7] px-3 py-1">Pickup verified</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-[1.5rem] border border-[#E8DED2] bg-[#FFF9F2] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0D9488]">Documents</p>
                    <div className="mt-4 space-y-3">
                      {['Birth certificate', 'Parent ID', 'Proof of address'].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-[#42524E]">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0D9488] shadow-sm">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#DCEAE5] bg-[#EFF7F5] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0D9488]">Application flow</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-[#21302D]">Profile complete</p>
                        <p className="mt-1 text-sm text-[#667571]">Ready to send to more centres</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-[#21302D]">3 applications sent</p>
                        <p className="mt-1 text-sm text-[#667571]">Waiting for the next response</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-4 bottom-7 rounded-[1.4rem] border border-[#E2D4C4] bg-[#FFF8ED] px-4 py-3 shadow-[0_18px_32px_rgba(26,39,35,0.08)] sm:-left-8">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0D9488] shadow-sm">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#21302D]">Saved time this week</p>
                      <p className="text-xs text-[#687572]">No repeating the same forms</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0D9488]">Why it feels different</p>
                <h2
                  className="mt-3 text-[2.5rem] leading-[1] tracking-[-0.035em] text-[#1E2A27] sm:text-[3.25rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Everything sits in one place, so your days feel lighter.
                </h2>
                <p className="mt-5 max-w-lg text-[16px] leading-8 text-[#61706C]">
                  The goal is not to make parenting more digital. It is to remove friction, reduce uncertainty, and help
                  you make decisions with confidence.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {benefitCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <article
                      key={card.title}
                      className={`rounded-[1.9rem] border p-6 shadow-[0_10px_30px_rgba(30,45,40,0.05)] ${card.tone}`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0D9488] shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-[1.5rem] leading-tight text-[#1F2A27]" style={{ fontFamily: 'var(--font-serif)' }}>
                        {card.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-7 text-[#5F6C68]">{card.body}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2.2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-6 shadow-[0_18px_40px_rgba(29,44,41,0.05)] sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="max-w-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0D9488]">How it works</p>
                <h2
                  className="mt-3 text-[2.35rem] leading-[1] tracking-[-0.03em] text-[#1E2A27] sm:text-[3rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  A simple flow that respects how busy parents already are.
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {steps.map((step, index) => (
                  <article
                    key={step.title}
                    className={`rounded-[1.8rem] border p-6 ${index === 1 ? 'border-[#D8E9E4] bg-[#EFF7F5]' : 'border-[#E8DED2] bg-white'}`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF3EE] text-[#0D9488] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <span className="text-3xl leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mt-6 text-[1.5rem] leading-tight text-[#1F2A27]" style={{ fontFamily: 'var(--font-serif)' }}>
                      {step.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-7 text-[#61706C]">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.6rem] bg-[#123B38] px-6 py-12 text-white shadow-[0_30px_80px_rgba(18,59,56,0.24)] sm:px-10 sm:py-16 lg:px-16">
            <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#91DDD4]">Peace of mind at pickup</p>
                <h2
                  className="mt-3 text-[2.55rem] leading-[1.02] tracking-[-0.035em] text-white sm:text-[3.25rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Your child only leaves with someone you approved.
                </h2>
                <p className="mt-5 text-[17px] leading-8 text-[#D7E7E2]">
                  CentreConnect gives crèches a simple, secure collection flow. Parents stay informed, staff know what to
                  check, and the handoff feels safer for everyone involved.
                </p>

                <div className="mt-8 space-y-3">
                  {safetyPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-[#E2F0EC] sm:text-[15px]">
                      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#9CE6D5]">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[380px] rounded-[3rem] border-[12px] border-slate-800 bg-slate-900/95 p-6 shadow-[0_36px_80px_rgba(0,0,0,0.34)]">
                <div className="mx-auto mb-8 h-1.5 w-16 rounded-full bg-slate-800" />
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Pickup code</p>
                    <p className="text-base font-bold text-white">Safe child pickup</p>
                  </div>
                  <div className="flex justify-center py-8">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4].map((item) => (
                        <div
                          key={item}
                          className="flex h-14 w-12 items-center justify-center rounded-2xl border-2 border-cyan-500/25 bg-cyan-500/10 text-2xl font-bold text-cyan-300"
                        >
                          {item === 1 ? '8' : item === 2 ? '4' : '•'}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Identity verified</p>
                  </div>
                  <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-slate-950 shadow-[0_16px_32px_rgba(34,197,94,0.18)]">
                    Confirm release
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#D8E2DE] bg-[#FFFDF9]">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0D9488]">For crèche owners</p>
              <h2
                className="mt-3 text-[2rem] leading-tight tracking-[-0.03em] text-[#1D2C29] sm:text-[2.6rem]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Run your centre from your phone. Replace the paper register.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#61706C]">
                Attendance, admissions, parent communication, and DSD compliance — built for how South African crèches
                actually work.
              </p>
            </div>

            <Link
              href="/for-centres"
              className="inline-flex items-center gap-2 text-base font-semibold text-[#0D9488] transition-colors hover:text-[#0B8479]"
            >
              <span>List my crèche free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2.4rem] bg-[linear-gradient(135deg,#0D9488_0%,#0E7E78_100%)] px-6 py-10 text-white shadow-[0_24px_60px_rgba(13,148,136,0.24)] sm:px-10 sm:py-12 lg:px-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-100">Start with one profile</p>
                <h2
                  className="mt-3 text-[2.45rem] leading-[1] tracking-[-0.03em] text-white sm:text-[3.1rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Find your child’s crèche today.
                </h2>
                <p className="mt-4 max-w-2xl text-[17px] leading-8 text-teal-50">
                  Create a free parent profile, upload your documents once, and apply anywhere in Johannesburg with more
                  confidence and less stress.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <Button
                  size="lg"
                  className="h-14 rounded-[1.1rem] bg-white px-7 text-base font-semibold text-[#0D9488] shadow-none hover:bg-[#F3FBF9]"
                  asChild
                >
                  <Link href="/register">
                    <span>Create My Parent Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-14 rounded-[1.1rem] border border-white/25 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
