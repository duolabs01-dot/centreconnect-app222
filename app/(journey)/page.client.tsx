import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const trustItems = ['Free for parents', 'Registered centres only', 'No WhatsApp chasing'] as const

const steps = [
  {
    title: 'Search by suburb',
    body: 'Find registered crèches with real details - capacity, age groups, fees. No outdated Google listings.',
  },
  {
    title: 'Upload once',
    body: 'Upload your documents once. Birth certificate, ID, proof of address - securely stored, ready to share with any centre.',
  },
  {
    title: 'Track on your phone',
    body: 'Apply to multiple crèches with one tap. Get notified the moment a centre responds.',
  },
] as const

export default function HomeClientPage() {
  return (
    <div
      className="min-h-screen overflow-x-clip bg-[#FAF8F4] overscroll-none selection:bg-teal-100 selection:text-teal-950"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      <main className="pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-6 sm:pt-8">
        <div className="space-y-14 sm:space-y-20">
          <section className="-mx-4 border-y border-[#E7DED2] bg-[#FFFDF9] px-4 py-14 sm:-mx-6 sm:px-6 sm:py-20 lg:-mx-8 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE7E0] bg-[#EAF6F2] px-4 py-2 text-sm font-semibold text-[#0D9488] shadow-[0_6px_18px_rgba(13,148,136,0.08)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                  <span>Now live in Alexandra, Johannesburg</span>
                </div>

                <h1
                  className="mt-6 text-[3rem] leading-[0.96] tracking-[-0.04em] text-[#1D2C29] sm:text-[4rem] lg:text-[58px]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Find the right crèche for your child.
                </h1>

                <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[#5E6B67]">
                  Search registered crèches near you, upload your documents once, and apply to multiple centres from your
                  phone. Free for parents - always.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    className="h-14 rounded-2xl bg-[#0D9488] px-7 text-base font-semibold text-white shadow-[0_14px_30px_rgba(13,148,136,0.18)] hover:bg-[#0B8479]"
                    asChild
                  >
                    <Link href="/directory">Search Crèches Near Me</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-2xl border-[#D8E1DE] bg-white px-7 text-base font-semibold text-[#24312E] shadow-none hover:bg-[#F8F4EC]"
                    asChild
                  >
                    <Link href="/for-centres">
                      <span>I run a crèche</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#E7DED2] pt-6 text-sm text-[#41514D]">
                  {trustItems.map((item) => (
                    <div key={item} className="inline-flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DDF3EE] text-[#0D9488]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-3xl px-0 sm:px-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0D9488]">How it works</p>
                <h2
                  className="mt-3 text-[2.35rem] leading-[1] tracking-[-0.03em] text-[#1D2C29] sm:text-[3rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  One calm flow from search to application.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#64736F]">
                  Built for busy parents on their phone, not for long forms, lost papers, or outdated listings.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {steps.map((step, index) => (
                  <article
                    key={step.title}
                    className="rounded-[2rem] border border-[#E8E0D6] bg-white p-7 shadow-[0_12px_28px_rgba(29,44,41,0.06)]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF3EE] text-[#0D9488] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <span className="text-3xl leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-[1.55rem] leading-tight text-[#1F2A27]" style={{ fontFamily: 'var(--font-serif)' }}>
                      {step.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-7 text-[#61706C]">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#123B38] px-6 py-12 text-white shadow-[0_28px_70px_rgba(18,59,56,0.22)] sm:px-10 sm:py-16 lg:px-16">
              <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div className="max-w-xl">
                  <h2
                    className="text-[2.4rem] leading-[1.02] tracking-[-0.03em] text-white sm:text-[3.2rem]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    Your child only leaves with someone you approved.
                  </h2>
                  <p className="mt-5 text-[17px] leading-8 text-[#D7E7E2]">
                    Every pickup is verified with a secure code. The crèche sees who is authorised. You get a
                    notification the moment your child is collected.
                  </p>
                </div>

                <div className="relative mx-auto w-full max-w-[360px] rounded-[3rem] border-[12px] border-slate-800 bg-slate-900/95 p-6 shadow-[0_36px_80px_rgba(0,0,0,0.35)]">
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
                  Attendance, admissions, parent communication, and DSD compliance - built for how South African crèches
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

          <section className="px-4 pb-2 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-[2.25rem] bg-[#0D9488] px-6 py-10 text-white shadow-[0_24px_60px_rgba(13,148,136,0.24)] sm:px-10 sm:py-12 lg:px-14">
              <div className="max-w-3xl">
                <h2
                  className="text-[2.3rem] leading-[1] tracking-[-0.03em] text-white sm:text-[3rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Find your child&apos;s crèche today.
                </h2>
                <p className="mt-4 max-w-2xl text-[17px] leading-8 text-teal-50">
                  Create a free parent profile. Upload once. Apply anywhere in Johannesburg.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-14 rounded-2xl bg-white px-7 text-base font-semibold text-[#0D9488] shadow-none hover:bg-[#F3FBF9]"
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
                  className="h-14 rounded-2xl border border-white/25 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

