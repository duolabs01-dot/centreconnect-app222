'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PwaInstallCard } from '@/components/pwa/pwa-install-card'
import { formatDate, getJohannesburgGreeting } from '@/lib/utils'

type HomeClientPageProps = {
  userEmail: string | null
  role: 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user' | null
  parentItems: Array<{
    id: string
    centreName: string
    childName: string
    status: string
  }>
  jobOpportunities: Array<{
    id: string
    title: string
    roleType: string
    closesAt: string | null
    centreName: string
    centreSlug: string | null
    suburb: string | null
    city: string | null
  }>
  shortlistCentres: Array<{
    id: string
    name: string
    slug: string
    suburb: string | null
    city: string | null
    tagline: string | null
    latitude: number | null
    longitude: number | null
  }>
}

export default function HomeClientPage({ userEmail, jobOpportunities, shortlistCentres }: HomeClientPageProps) {
  const isSignedIn = Boolean(userEmail)
  const [, setTimeGreeting] = useState(getJohannesburgGreeting())
  const activeJobs = jobOpportunities.slice(0, 6)

  // Use first centre's suburb as location hint if available, else Alexandra.
  const locationHint = shortlistCentres.length > 0 && shortlistCentres[0].suburb ? shortlistCentres[0].suburb : 'Alexandra'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeGreeting(getJohannesburgGreeting())
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen snap-y snap-mandatory overflow-x-hidden bg-slate-50 overscroll-none">
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+3rem)] sm:px-6 lg:px-8">
        <div className="space-y-12 sm:space-y-20">
          {/* SECTION 2 - New Hero */}
          <section className="relative snap-start overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-teal-900 px-4 py-10 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(6,182,212,0.15),transparent_60%)]" />

            <div className="relative z-10 max-w-4xl">
              <h2 className="font-display text-3xl font-extrabold leading-[1.03] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                Calm the chaos and get your little one into the right creche.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg lg:text-xl">
                We help parents find trusted centres, submit every application, and follow every reply - all in one place without the telecom drama.
              </p>

              <div className="mt-8 flex flex-wrap gap-4 sm:mt-10">
                <Button size="lg" className="h-14 rounded-2xl bg-cyan-500 px-8 text-base font-bold text-slate-950 hover:bg-cyan-400" asChild>
                  <Link href="/directory">Find a Creche Near You</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 rounded-2xl border-white/20 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10" asChild>
                  <Link href="/for-centres">I Run a Centre &rarr;</Link>
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-5 border-t border-white/10 pt-6 sm:mt-14 sm:grid-cols-3 sm:gap-8 sm:pt-10">
                <div>
                  <p className="font-display text-3xl font-bold text-white">Search</p>
                  <p className="mt-1 text-sm font-medium uppercase tracking-wider text-white/40">Browse centres near you</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-white">{locationHint}</p>
                  <p className="mt-1 text-sm font-medium uppercase tracking-wider text-white/40">Starting Here</p>
                </div>
                <div className="hidden sm:block">
                  <p className="font-display text-3xl font-bold text-white">R0</p>
                  <p className="mt-1 text-sm font-medium uppercase tracking-wider text-white/40">For Parents</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3 - Parent journey strip */}
          <section className="snap-start py-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Search the best near home',
                  body: 'See trusted centres with real reviews, responsive staff, and verified pickup options nearby.',
                },
                {
                  title: 'Apply once',
                  body: 'Build a profile, upload docs, and reuse it for every centre without repeating yourself.',
                },
                {
                  title: 'Know the next move',
                  body: 'We ping you the moment a centre replies, so you never miss the call.',
                },
              ].map((step, index) => (
                <article key={step.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="font-display text-4xl font-black text-cyan-100 sm:text-5xl">{index + 1}</span>
                  <p className="mt-3 text-xl font-bold text-slate-900">{step.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* SECTION 4 - Safety feature callout */}
          <section className="snap-start overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-teal-900 px-4 py-8 text-white sm:px-8 sm:py-12 lg:px-12 lg:py-16">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h3 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Sleep easier knowing only your approved people arrive.</h3>
                <p className="mt-6 text-base leading-relaxed text-teal-100/80 sm:text-lg lg:text-xl">
                  Pickup codes, instant alerts, and live check-ins keep strangers out of the gate and your mind focused on the day ahead.
                </p>
              </div>

              <div className="relative mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[8px] border-slate-800 bg-slate-950 p-4 shadow-2xl">
                <div className="mx-auto mb-6 h-6 w-24 rounded-full bg-slate-800" />
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Security Check</p>
                    <p className="mt-1 text-sm font-bold">Child Pickup Verification</p>
                  </div>
                  <div className="flex justify-center py-6">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex h-12 w-10 items-center justify-center rounded-lg border-2 border-teal-500/50 text-xl font-bold text-teal-400">
                          {i === 1 ? '8' : i === 2 ? '4' : '*'}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/20 p-3 text-center">
                    <p className="text-xs font-bold text-teal-200">Approved guardian verified</p>
                  </div>
                  <div className="flex h-10 w-full items-center justify-center rounded-xl bg-teal-500 text-xs font-bold text-slate-950">
                    Confirm Release
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="snap-start">
            <PwaInstallCard />
          </section>

          <section className="snap-start rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-cyan-900/10 backdrop-blur-2xl">
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-500">New to CentreConnect?</p>
              <h3 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Don't wait to secure your child's seat.</h3>
              <p className="text-sm text-slate-600">
                Create a parent profile today so every application, message, and update flows into one calm place. No data gets lost, no queues.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="rounded-2xl bg-cyan-500 px-6 py-3 text-base font-bold text-slate-950 hover:bg-cyan-400" asChild>
                  <Link href="/register">Create my parent profile</Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl border-cyan-500 px-6 py-3 text-base font-semibold text-cyan-600" asChild>
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* SECTION 4.5 - Family value */}
          <section className="snap-start border-t border-slate-100 py-12">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h3 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">CentreConnect keeps your parenting days feeling human.</h3>
              <p className="mt-4 text-slate-600">Every button, alert, and notification is focused on keeping you calm, informed, and ahead of the next big morning.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: 'Find the right neighbours',
                  body: 'See only reviewed, verified, and trusted ECD centres within your reach.',
                },
                {
                  title: 'One profile, every application',
                  body: 'Upload your documents once and apply to as many centres as it makes sense - no paperwork pile-ups.',
                },
                {
                  title: 'Responses in real time',
                  body: 'We tell you when a centre replies, asks for a meeting, or offers a spot so you can relax.',
                },
              ].map((t, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-slate-700">
                  <div className="mb-4 h-1 w-12 rounded-full bg-cyan-200" />
                  <p className="text-lg font-bold text-slate-900">{t.title}</p>
                  <div className="mt-3">
                    <p className="text-base leading-relaxed text-slate-600">{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 4.6 - FAQ */}
          <section className="snap-start border-t border-slate-100 py-12">
            <div className="mx-auto max-w-3xl">
              <h3 className="mb-10 text-center font-display text-3xl font-bold text-slate-900">Frequently Asked Questions</h3>
              <div className="space-y-6">
                {[
                  {
                    q: 'Is CentreConnect free for parents?',
                    a: 'Yes - finding, applying, and chasing updates is completely free so you can focus on making mornings calmer.',
                  },
                  {
                    q: 'How can I trust these centres?',
                    a: 'Every centre we share is either registered or actively improving; pickup codes, real-time updates, and verified families keep you in control.',
                  },
                  {
                    q: 'Can I apply to more than one creche?',
                    a: 'Absolutely. One parent profile covers every child and every application, so you never duplicate forms.',
                  },
                  {
                    q: 'What if I use a basic phone?',
                    a: 'Our site works on low-data phones and on desktop, so you can check admission news wherever you are.',
                  },
                ].map((faq, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-6 transition-colors hover:border-cyan-400">
                    <h4 className="mb-2 text-lg font-bold text-slate-900">{faq.q}</h4>
                    <p className="leading-relaxed text-slate-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5 - For ECD Owners */}
          <section className="snap-start rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-800 p-5 text-white sm:p-8 lg:p-12">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Professional ECD Management</p>
              <h3 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Built for South African ECD centres. Starting in Alexandra.</h3>
              <p className="mt-6 text-base leading-relaxed text-white/60 sm:text-lg lg:text-xl">
                Not imported. Not adapted. Built from scratch for how ECDs actually work here. Manage your entire operation from one screen.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                {['Applications', 'Compliance', 'DSD Subsidy Export', 'Transport', 'Marketplace', 'Daily Reports'].map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="text-sm font-semibold text-white/80">{feat}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="mt-8 h-14 rounded-2xl bg-white px-8 text-base font-bold text-slate-950 hover:bg-cyan-50 sm:mt-10" asChild>
                <Link href="/for-centres">Register Your Centre &rarr;</Link>
              </Button>
            </div>
          </section>

          {/* SECTION 6 - Jobs strip */}
          <section id="active-jobs" className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 sm:p-8 lg:p-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Work in Early Childhood Education</h3>
                <span className="rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-800">{activeJobs.length} roles open</span>
              </div>
              <p className="text-sm text-slate-500">
                Find paid shifts that respect your time, with centres that know what parents expect - trust, safety, and transparency.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {activeJobs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:col-span-2">
                  <p className="text-base font-bold text-slate-900">No active jobs yet</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">Check back soon for new centre opportunities.</p>
                </div>
              ) : (
                activeJobs.map((job) => {
                  const jobHref = job.centreSlug ? `/c/${job.centreSlug}/jobs/${job.id}` : `/c/centre/jobs/${job.id}`
                  const location = [job.suburb, job.city].filter(Boolean).join(', ')

                  return (
                    <Link
                      key={job.id}
                      href={jobHref}
                      className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg shadow-cyan-900/10 transition-all hover:translate-y-0.5 hover:border-cyan-300"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-slate-900">{job.title}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{job.centreName}</p>
                        </div>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
                          Sponsored
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-500">
                        {job.roleType.replace(/_/g, ' ')} - {location || 'Johannesburg'}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-500">Featured</span>
                          {job.closesAt ? <p className="text-sm text-slate-400">Closes {formatDate(job.closesAt)}</p> : null}
                        </div>
                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" asChild>
                          <span className="px-4 py-2 text-sm font-bold uppercase tracking-widest">Apply now</span>
                        </Button>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
