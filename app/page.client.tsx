'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock3, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, getDisplayNameFromEmail, getJohannesburgGreeting } from '@/lib/utils'
import { ApplicationProgressSection } from '@/components/landing/application-progress-section'

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

function distanceScore(
  userLat: number,
  userLng: number,
  centreLat: number,
  centreLng: number
) {
  const latDelta = userLat - centreLat
  const lngDelta = userLng - centreLng
  return latDelta * latDelta + lngDelta * lngDelta
}

export default function HomeClientPage({ userEmail, parentItems, jobOpportunities, shortlistCentres }: HomeClientPageProps) {
  const isSignedIn = Boolean(userEmail)
  const parentName = getDisplayNameFromEmail(userEmail)
  const [timeGreeting, setTimeGreeting] = useState(getJohannesburgGreeting())
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const activeItems = parentItems.slice(0, 4)
  const activeJobs = jobOpportunities.slice(0, 6)
  const fallbackSuburb = useMemo(
    () => shortlistCentres.find((centre) => centre.suburb)?.suburb ?? '',
    [shortlistCentres]
  )
  const shortlistSuburb = useMemo(() => {
    if (!fallbackSuburb) return ''
    if (!userCoords) return fallbackSuburb

    const nearest = shortlistCentres
      .filter(
        (centre) =>
          typeof centre.latitude === 'number' &&
          typeof centre.longitude === 'number' &&
          Boolean(centre.suburb)
      )
      .sort(
        (a, b) =>
          distanceScore(
            userCoords.latitude,
            userCoords.longitude,
            a.latitude as number,
            a.longitude as number
          ) -
          distanceScore(
            userCoords.latitude,
            userCoords.longitude,
            b.latitude as number,
            b.longitude as number
          )
      )[0]

    return nearest?.suburb ?? fallbackSuburb
  }, [fallbackSuburb, shortlistCentres, userCoords])
  const shortlistCards = useMemo(() => {
    const fallbackReasons = [
      'Strong parent communication',
      'Balanced routine and play',
      'Consistent application feedback',
      'Great fit for first-time families',
    ]

    const suburbKey = shortlistSuburb.toLowerCase()
    const localCentres = shortlistCentres.filter(
      (centre) => centre.suburb?.toLowerCase() === suburbKey
    )
    const usedIds = new Set(localCentres.map((centre) => centre.id))
    const backupCentres = shortlistCentres.filter((centre) => !usedIds.has(centre.id))

    return [...localCentres, ...backupCentres].slice(0, 4).map((centre, index) => ({
      ...centre,
      reason: centre.tagline || fallbackReasons[index % fallbackReasons.length],
    }))
  }, [shortlistCentres, shortlistSuburb])
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

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300000,
      }
    )
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,rgba(14,165,233,0.16),transparent_55%),linear-gradient(to_bottom,#f0f9ff,#f8fafc_35%,#ffffff)] pb-28 md:pb-0">
      <header className="cc-glass-nav sticky top-0 z-30 border-b border-cyan-100/60">
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
          <Button size="sm" className="shrink-0" variant={isSignedIn ? 'outline' : 'default'} asChild>
            <Link href={isSignedIn ? '/parent/dashboard' : '/login'}>{isSignedIn ? 'Open Dashboard' : 'Sign in'}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="cc-page">
          <section className="cc-glass-strong rounded-3xl p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" />
              Parent Hub
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Finally, a parent experience that actually understands the pressure.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Compare with confidence, track every response, and know your next best move without chasing updates.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/directory">Browse Centres</Link>
              </Button>
              {isSignedIn ? (
                <Button variant="outline" asChild>
                  <Link href="/parent/applications">My Applications</Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/register">Create Free Account &rarr;</Link>
                </Button>
              )}
            </div>
            {!isSignedIn ? (
              <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-4 text-left sm:grid-cols-3">
                {[
                  { emoji: '📍', title: 'Find Centres', desc: 'Browse ECDs near you' },
                  { emoji: '📝', title: 'Apply Online', desc: 'No paperwork needed' },
                  { emoji: '📊', title: 'Track Progress', desc: 'Real-time status updates' },
                  { emoji: '💬', title: 'Communicate', desc: 'Direct centre messaging' },
                  { emoji: '🗂️', title: 'Store Documents', desc: 'Secure document vault' },
                  { emoji: '🔔', title: 'Get Notified', desc: 'Instant decision alerts' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur-sm"
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Clock3 className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-semibold uppercase tracking-[0.08em]">Save Time</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">No more calling centres for status updates.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold uppercase tracking-[0.08em]">Trust Signals</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">See registered centres and compare clearly.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <HeartHandshake className="h-4 w-4 text-fuchsia-600" />
                    <p className="text-xs font-semibold uppercase tracking-[0.08em]">Parent First</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Built around real family decision moments.</p>
                </div>
              </div>
            )}
          </section>

          {isSignedIn && <ApplicationProgressSection />}

          {isSignedIn && shortlistSuburb ? (
            <section className="cc-glass-soft rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">Shortlist-Worthy In {shortlistSuburb}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {shortlistCards.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">No shortlisted centres yet</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Browse the full directory to find centres near you.
                    </p>
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/directory">Browse Centres</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  shortlistCards.map((item) => (
                    <Link
                      key={item.id}
                      href={`/centre/${item.slug}`}
                      className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {[item.suburb, item.city].filter(Boolean).join(', ')}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{item.reason}</p>
                      <p className="mt-3 text-xs font-semibold text-cyan-700 group-hover:text-cyan-800">
                        View centre -&gt;
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ) : null}

          <section id="active-jobs" className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-800">Employment Opportunities (Optional)</h3>
              <span className="text-xs text-slate-500">{activeJobs.length} open</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {activeJobs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-900">No active jobs yet</p>
                  <p className="mt-1 text-xs text-slate-600">Check back soon for new centre opportunities.</p>
                </div>
              ) : (
                activeJobs.map((job) => {
                  const jobHref = job.centreSlug ? `/c/${job.centreSlug}/jobs/${job.id}` : `/c/centre/jobs/${job.id}`
                  const location = [job.suburb, job.city].filter(Boolean).join(', ')

                  return (
                    <Link
                      key={job.id}
                      href={jobHref}
                      className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{job.title}</p>
                          <p className="mt-1 text-xs text-slate-600">{job.centreName}</p>
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

                      <p className="mt-3 text-xs font-semibold text-cyan-700 transition-colors group-hover:text-cyan-800">
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
