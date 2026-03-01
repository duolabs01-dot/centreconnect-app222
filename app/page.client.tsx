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
    <div className="min-h-screen bg-white pb-28 md:pb-0">
      {/* SECTION 1 — Sticky Glass Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-display text-xl font-bold tracking-tight text-white">CentreConnect</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1" />
          </Link>
          
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-medium text-white/70 transition hover:text-white">Find a Centre</Link>
            <Link href="/for-centres" className="text-sm font-medium text-white/70 transition hover:text-white">For ECDs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button size="sm" className="font-bold" asChild>
              <Link href={isSignedIn ? '/parent/dashboard' : '/login'}>
                {isSignedIn ? 'Dashboard' : 'Sign In'}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-12 sm:space-y-20">
          
          {/* SECTION 2 — New Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-[#001E2B] px-8 py-16 sm:px-12 sm:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(6,182,212,0.15),transparent_60%)]" />
            
            <div className="relative z-10 max-w-4xl">
              <h2 className="font-display text-5xl font-extrabold tracking-[-0.04em] text-white leading-[1.03] sm:text-6xl lg:text-7xl">
                Every child deserves a <span className="text-cyan-400 italic">great start</span> in life.
              </h2>
              <p className="mt-6 max-w-xl text-lg text-white/60 leading-relaxed sm:text-xl">
                CentreConnect connects <span className="text-white font-semibold">{locationHint}</span> families with quality ECD centres — and gives centres the tools to run better.
              </p>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <Button size="lg" className="h-14 px-8 text-base font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl" asChild>
                  <Link href="/directory">Find a Centre</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold border-white/20 text-white hover:bg-white/10 rounded-xl" asChild>
                  <Link href="/for-centres">I Run a Centre &rarr;</Link>
                </Button>
              </div>

              {/* Stats row */}
              <div className="mt-16 grid grid-cols-2 gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
                <div>
                  <p className="font-display text-3xl font-bold text-white">300+</p>
                  <p className="mt-1 text-sm font-medium text-white/40 uppercase tracking-wider">Centres Listed</p>
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
          <section className="py-8">
            <div className="grid gap-12 md:grid-cols-3">
              <div className="relative">
                <span className="font-display text-7xl font-black text-cyan-50 opacity-50">1</span>
                <div className="absolute top-8 left-2">
                  <p className="text-xl font-bold text-slate-900">Search your area</p>
                  <p className="mt-1 text-slate-600">Find verified centres in Johannesburg and beyond.</p>
                </div>
              </div>
              <div className="relative">
                <span className="font-display text-7xl font-black text-cyan-50 opacity-50">2</span>
                <div className="absolute top-8 left-2">
                  <p className="text-xl font-bold text-slate-900">Apply in 5 minutes</p>
                  <p className="mt-1 text-slate-600">One profile, multiple applications. No paperwork.</p>
                </div>
              </div>
              <div className="relative">
                <span className="font-display text-7xl font-black text-cyan-50 opacity-50">3</span>
                <div className="absolute top-8 left-2">
                  <p className="text-xl font-bold text-slate-900">Track every update</p>
                  <p className="mt-1 text-slate-600">Know exactly where your application stands.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4 — Safety feature callout */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-teal-900 px-8 py-12 text-white sm:px-12 sm:py-16">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h3 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Every child is verified before leaving.</h3>
                <p className="mt-6 text-lg text-teal-100/70 leading-relaxed sm:text-xl">
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

          {/* SECTION 5 — For ECD Owners */}
          <section className="rounded-3xl bg-[#001E2B] p-8 text-white sm:p-16">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Professional ECD Management</p>  
              <h3 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Built for South African ECD centres. Starting in Alexandra.</h3>
              <p className="mt-6 text-lg text-white/60 leading-relaxed sm:text-xl">
                Not imported. Not adapted. Built from scratch for how ECDs actually work here. Manage your entire operation from one screen.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                {['Applications', 'Compliance', 'Communication', 'Transport', 'Marketplace'].map(feat => (
                  <div key={feat} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="text-sm font-semibold text-white/80">{feat}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="mt-12 h-14 px-8 text-base font-bold bg-white text-slate-950 hover:bg-cyan-50 rounded-xl" asChild>
                <Link href="/for-centres">Register Your Centre &rarr;</Link>
              </Button>
            </div>
          </section>

          {/* SECTION 6 — Jobs strip */}
          <section id="active-jobs" className="rounded-3xl border border-slate-100 bg-slate-50/50 p-8 sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-3xl font-bold text-slate-900">Work in Early Childhood Education</h3>   
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
                      className="group block rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-900/5"
                    >
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
                        {job.closesAt ? (
                          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Closes {formatDate(job.closesAt)}
                          </span>
                        ) : null}
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
