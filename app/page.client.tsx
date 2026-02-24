'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Map, FileCheck2, Activity, MessageCircle, FolderLock, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PwaInstallCard } from '@/components/pwa/pwa-install-card'
import { formatDate, getDisplayNameFromEmail, getJohannesburgGreeting } from '@/lib/utils'

type HomeClientPageProps = {
  userEmail: string | null
  role: 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'parent_user' | null
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

const features = [
  { icon: Map, title: 'Find Centres', desc: 'Browse ECDs near you' },
  { icon: FileCheck2, title: 'Apply Online', desc: 'No paperwork needed' },
  { icon: Activity, title: 'Track Progress', desc: 'Real-time status updates' },
  { icon: MessageCircle, title: 'Communicate', desc: 'Direct centre messaging' },
  { icon: FolderLock, title: 'Store Documents', desc: 'Secure document vault' },
  { icon: Bell, title: 'Get Notified', desc: 'Instant decision alerts' },
]

export default function HomeClientPage({ userEmail, jobOpportunities }: HomeClientPageProps) {
  const isSignedIn = Boolean(userEmail)
  const parentName = getDisplayNameFromEmail(userEmail)
  const [timeGreeting, setTimeGreeting] = useState(getJohannesburgGreeting())
  const activeJobs = jobOpportunities.slice(0, 6)
  const title = useMemo(
    () => (isSignedIn ? `Welcome back, ${parentName}` : 'Find the right ECD for your child'),
    [isSignedIn, parentName]
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeGreeting(getJohannesburgGreeting())
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,rgba(14,165,233,0.16),transparent_55%),linear-gradient(to_bottom,#f0f9ff,#f8fafc_35%,#ffffff)] pb-28 md:pb-0">
      <header className="glass-nav sticky top-0 z-30 border-b border-cyan-100/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-700">CentreConnect</p>
            <h1 className="mt-1 truncate text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            {isSignedIn ? (
              <p className="text-xs text-slate-600">{timeGreeting}</p>
            ) : (
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">South Africa&apos;s ECD Platform</p>
            )}
          </div>
          <Button size="sm" className="shrink-0 font-semibold" variant={isSignedIn ? 'outline' : 'default'} asChild>
            <Link href={isSignedIn ? '/parent/dashboard' : '/login'}>{isSignedIn ? 'Open Dashboard' : 'Sign in'}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="cc-page">
          <section className="glass-card rounded-2xl p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" />
              Parent Hub
            </div>
            <h2 className="mt-3 text-[2.6rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 md:text-5xl lg:text-6xl">
              Finally, a parent experience that actually understands the pressure.
            </h2>
            <p className="mt-3 max-w-2xl text-lg font-medium leading-relaxed text-slate-700/90 md:text-xl">
              Compare with confidence, track every response, and know your next best move without chasing updates.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="font-semibold" asChild>
                <Link href="/directory">Browse Centres</Link>
              </Button>
              {isSignedIn ? (
                <Button className="font-semibold" variant="outline" asChild>
                  <Link href="/parent/applications">My Applications</Link>
                </Button>
              ) : (
                <Button className="font-semibold" variant="outline" asChild>
                  <Link href="/register">Create Free Account &rarr;</Link>
                </Button>
              )}
            </div>
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-4 text-left sm:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <PwaInstallCard />

          <section className="rounded-2xl bg-gradient-to-br from-cyan-700 via-sky-700 to-blue-800 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">For ECD Centres</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Get found by parents in your area</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cyan-100">
              Manage applications, communicate with parents, and run your centre — from one dashboard.
              Built for South African ECD owners.
            </p>
            <Link
              href="/for-centres"
              className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-cyan-800 transition-colors hover:bg-cyan-50"
            >
              Register Your Centre &rarr;
            </Link>
          </section>

          <section id="active-jobs" className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-slate-800">Employment Opportunities (Optional)</h3>
              <span className="text-sm text-slate-500">{activeJobs.length} open</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {activeJobs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
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
                      className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-[var(--shadow-elevation-1)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-900">{job.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{job.centreName}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                          Details
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {job.roleType.replace(/_/g, ' ')}
                        </span>
                        {location ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                            {location}
                          </span>
                        ) : null}
                        {job.closesAt ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                            Closes {formatDate(job.closesAt)}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm font-semibold text-cyan-700 transition-colors group-hover:text-cyan-800">
                        Open full role details and apply -&gt;
                      </p>
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
