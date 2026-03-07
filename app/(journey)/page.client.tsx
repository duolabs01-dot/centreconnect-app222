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
  
  // Use first centre's suburb as location hint if available, else Alexandra
  const locationHint = shortlistCentres.length > 0 && shortlistCentres[0].suburb 
    ? shortlistCentres[0].suburb 
    : 'Alexandra'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeGreeting(getJohannesburgGreeting())
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="bg-slate-50 overflow-x-hidden">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-12 sm:space-y-20">
          
          {/* SECTION 2 — New Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-teal-900 px-4 py-10 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(6,182,212,0.15),transparent_60%)]" />
            
            <div className="relative z-10 max-w-4xl">
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.04em] text-white leading-[1.03] sm:text-5xl lg:text-6xl">
                Every child deserves a great start in life.
              </h2>
              <p className="mt-6 max-w-xl text-base text-white/60 leading-relaxed sm:text-lg lg:text-xl">
                Find the right crèche for your child — compare, apply, and track updates. Free for parents.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4 sm:mt-10">
                <Button size="lg" className="h-14 rounded-2xl bg-cyan-500 px-8 text-base font-bold text-slate-950 hover:bg-cyan-400" asChild>
                  <Link href="/directory">Find a Crèche Near You</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 rounded-2xl border-white/20 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10" asChild>
                  <Link href="/for-centres">I Run a Centre &rarr;</Link>
                </Button>
              </div>

              {/* Hero highlights */}
              <div className="mt-10 grid grid-cols-2 gap-5 border-t border-white/10 pt-6 sm:mt-14 sm:grid-cols-3 sm:gap-8 sm:pt-10">
                <div>
                  <p className="font-display text-3xl font-bold text-white">Search</p>
                  <p className="mt-1 text-sm font-medium text-white/40 uppercase tracking-wider">Browse centres near you</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-white">{locationHint}</p>
                  <p className="mt-1 text-sm font-medium text-white/40 uppercase tracking-wider">Starting Here</p>
                </div>
                <div className="hidden sm:block">
                  <p className="font-display text-3xl font-bold text-white">R0</p>
                  <p className="mt-1 text-sm font-medium text-white/40 uppercase tracking-wider">For Parents</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3 — Parent journey strip */}
          <section className="py-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Search your area',
                  body: 'Find trusted creches near your home or work.',
                },
                {
                  title: 'Apply in minutes',
                  body: 'One profile, then apply to multiple centres quickly.',
                },
                {
                  title: 'Track every update',
                  body: 'See status changes the moment a centre responds.',
                },
              ].map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="font-display text-4xl font-black text-cyan-100 sm:text-5xl">{index + 1}</span>
                  <p className="mt-3 text-xl font-bold text-slate-900">{step.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* SECTION 4 — Safety feature callout */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-teal-900 px-4 py-8 text-white sm:px-8 sm:py-12 lg:px-12 lg:py-16">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h3 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Every child is verified before leaving.</h3>
                <p className="mt-6 text-base text-teal-100/70 leading-relaxed sm:text-lg lg:text-xl">
                  Our secure pickup code system means only authorised guardians can collect. Parents get notified instantly on their phones.
                </p>
              </div>
              
              {/* Mock UI for pickup verify */}
              <div className="relative mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[8px] border-slate-800 bg-slate-950 p-4 shadow-2xl">
                <div className="h-6 w-24 mx-auto mb-6 rounded-full bg-slate-800" />
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Security Check</p>
                    <p className="mt-1 text-sm font-bold">Child Pickup Verification</p>
                  </div>
                  <div className="flex justify-center py-6">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-12 w-10 rounded-lg border-2 border-teal-500/50 flex items-center justify-center text-xl font-bold text-teal-400">
                          {i === 1 ? '8' : i === 2 ? '4' : '•'}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-teal-500/20 p-3 text-center border border-teal-500/30">
                    <p className="text-xs font-bold text-teal-200">Guardian Verified: Sipho Gumede</p>
                  </div>
                  <div className="h-10 w-full rounded-xl bg-teal-500 flex items-center justify-center text-xs font-bold text-slate-950">
                    Confirm Release
                  </div>
                </div>
              </div>
            </div>
          </section>

          <PwaInstallCard />

          {/* SECTION 4.5 — Family value */}
          <section className="py-12 border-t border-slate-100">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h3 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">How CentreConnect helps families</h3>
              <p className="mt-4 text-slate-600">Search, apply, and keep track of centre responses in one place.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: 'Find nearby options',
                  body: 'Browse centres in Alexandra and nearby areas from one place.',
                },
                {
                  title: 'Apply with one profile',
                  body: 'Create your details once and reuse them when you apply to centres.',
                },
                {
                  title: 'Track every response',
                  body: 'Follow application updates and next steps from your parent dashboard.',
                }
              ].map((t, i) => (
                <div key={i} className="rounded-2xl bg-slate-50 p-8 border border-slate-100 text-slate-700">
                  <div className="mb-4 h-1 w-12 rounded-full bg-cyan-200" />
                  <p className="text-lg font-bold text-slate-900">{t.title}</p>
                  <div className="mt-3">
                    <p className="text-base leading-relaxed text-slate-600">{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 4.6 — FAQ */}
          <section className="py-12 border-t border-slate-100">
            <div className="max-w-3xl mx-auto">
              <h3 className="font-display text-3xl font-bold text-slate-900 mb-10 text-center">Frequently Asked Questions</h3>
              <div className="space-y-6">
                {[
                  {
                    q: "Is CentreConnect free for parents?",
                    a: "Yes! Searching for centres, submitting applications, and receiving updates is 100% free for parents and guardians."
                  },
                  {
                    q: "How do I know the centres are safe?",
                    a: "We list centres that are registered or in the process of registration. We also provide safety features like verified pickup codes for added security."
                  },
                  {
                    q: "Can I apply to more than one crèche?",
                    a: "Absolutely. You create one child profile and can use it to apply to as many centres as you like with just a few taps."
                  },
                  {
                    q: "What if I don't have a smartphone?",
                    a: "Our platform is designed to work on basic smartphones and uses very little data. You can also access it from a computer or tablet."
                  }
                ].map((faq, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-6 hover:border-cyan-400 transition-colors">
                    <h4 className="font-bold text-slate-900 text-lg mb-2">{faq.q}</h4>
                    <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5 — For ECD Owners */}
          <section className="rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-800 p-5 text-white sm:p-8 lg:p-12">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Professional ECD Management</p>  
              <h3 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Built for South African ECD centres. Starting in Alexandra.</h3>
              <p className="mt-6 text-base text-white/60 leading-relaxed sm:text-lg lg:text-xl">
                Not imported. Not adapted. Built from scratch for how ECDs actually work here. Manage your entire operation from one screen.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                {['Applications', 'Compliance', 'DSD Subsidy Export', 'Transport', 'Marketplace', 'Daily Reports'].map(feat => (
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

          {/* SECTION 6 — Jobs strip */}
          <section id="active-jobs" className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Work in Early Childhood Education</h3>   
              <span className="rounded-full bg-cyan-100 px-4 py-1.5 text-xs font-bold text-cyan-800">{activeJobs.length} roles open</span>
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
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-900/5 min-h-[160px]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-bold text-slate-900">{job.title}</p>      
                            <p className="mt-1 text-sm text-slate-500 font-medium">{job.centreName}</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                            View
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {job.roleType.replace(/_/g, ' ')}
                          </span>
                          {location ? (
                            <span className="rounded-lg border border-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                              {location}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {job.closesAt ? (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Closes {formatDate(job.closesAt)}
                          </span>
                        </div>
                      ) : null}
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
