import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  Heart,
  MessageSquare,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { EnrolledConfetti } from './_components/enrolled-confetti'
import { SurfaceCard } from '@/components/ui/surface-card'

import { ActivityFeedSection } from './_sections/activity-feed-section'
import { SuggestedCentresSection } from './_sections/suggested-centres-section'
import { ParentJobsSection } from './_sections/parent-jobs-section'

export const metadata: Metadata = {
  title: 'Parent Home | CentreConnect',
  description: 'Your parent home for applications, updates, and quick next steps.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

type DashboardApplication = {
  id: string
  status: string
  lastUpdatedAt: string
  centreName: string
  centreSlug: string | null
  childName: string
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

interface RawApplicationRow {
  id: string
  status: string
  updated_at: string | null
  submitted_at: string
  child_id: string
  ecd_centres: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null
  children: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
}

export default async function ParentDashboardPage() {
  const perf = startRoutePerf('/parent/dashboard')
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [profileResult, childrenResult, applicationsResult] = await Promise.all([
      supabase.from('user_profiles').select('full_name').eq('id', user?.id ?? '').maybeSingle(),
      supabase.from('children').select('id,first_name,last_name').eq('parent_id', user?.id ?? '').limit(1),
      supabase
        .from('applications')
        .select('id,status,updated_at,submitted_at,child_id,ecd_centres(name,slug),children(first_name,last_name)')
        .eq('parent_id', user?.id ?? '')
        .order('submitted_at', { ascending: false })
        .limit(8),
    ])

    const parentName = profileResult.data?.full_name?.trim() || 'Parent'

    const applications = ((applicationsResult.data ?? []) as unknown as RawApplicationRow[]).map((application) => {
      const centre = normalizeOne<{ name?: string | null; slug?: string | null }>(application.ecd_centres)
      const child = normalizeOne<{ first_name?: string | null; last_name?: string | null }>(application.children)
      const childName = `${child?.first_name ?? ''} ${child?.last_name ?? ''}`.trim() || 'Child profile'

      return {
        id: String(application.id ?? ''),
        status: String(application.status ?? ''),
        lastUpdatedAt: String(application.updated_at ?? application.submitted_at ?? ''),
        centreName: centre?.name?.trim() || 'Creche pending',
        centreSlug: centre?.slug ?? null,
        childName,
      } satisfies DashboardApplication
    })

    const enrolledApplication = applications.find((application) => application.status === 'enrolled')
    const hasApplications = applications.length > 0
    const activeApplications = applications.filter((application) => application.status !== 'enrolled')
    const screenState: 'empty' | 'pending' | 'enrolled' = !hasApplications ? 'empty' : enrolledApplication ? 'enrolled' : 'pending'

    const firstChildName =
      `${childrenResult.data?.[0]?.first_name ?? ''} ${childrenResult.data?.[0]?.last_name ?? ''}`.trim() ||
      applications[0]?.childName ||
      'your child'
    const enrolledChildName = enrolledApplication?.childName ?? firstChildName
    const enrolledCentreName = enrolledApplication?.centreName ?? 'their creche'
    const centreInfoHref = enrolledApplication?.centreSlug ? `/c/${enrolledApplication.centreSlug}` : '/parent/discover'
    const latestPendingApplication = activeApplications[0] ?? null

    const quickActions = [
      {
        label: "Today's Report",
        description: 'Meals, mood, and activities from today.',
        href: '/parent/daily-reports',
        icon: Sparkles,
      },
      {
        label: 'Messages',
        description: 'Open your inbox and centre replies.',
        href: '/parent/notifications',
        icon: MessageSquare,
      },
      {
        label: 'Applications',
        description: 'Track every application in one place.',
        href: '/parent/applications',
        icon: FileText,
      },
      {
        label: 'Creche Info',
        description: 'Hours, contacts, and daily details.',
        href: centreInfoHref,
        icon: Building2,
      },
      {
        label: 'Profile',
        description: 'Keep family and child details ready.',
        href: '/parent/profile',
        icon: UserRound,
      },
    ]

    return (
      <div className="min-h-screen bg-surface-secondary px-4 pb-24 pt-4">
        <div className="cc-stack">
          {screenState === 'empty' ? (
            <div className="cc-stack">
              <SurfaceCard className="relative overflow-hidden border border-[#D9ECE7] bg-[linear-gradient(180deg,#F6FCFA_0%,#FFFFFF_100%)] p-6 sm:p-7">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_55%),radial-gradient(circle_at_top_right,rgba(212,147,90,0.12),transparent_38%)]" />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                    <Heart className="h-6 w-6" />
                  </div>
                  <h1 className="mt-4 text-[1.9rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[2.3rem]" style={{ fontFamily: 'var(--font-display)' }}>
                    Let&apos;s find the right creche for {firstChildName}.
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                    Start with nearby creches, compare quickly, and apply only when you feel ready.
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/parent/discover"
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                    >
                      Find a creche
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/parent/shortlist"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                    >
                      View saved creches
                    </Link>
                    <Link
                      href="/parent/support"
                      className="inline-flex min-h-[48px] items-center justify-center text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Need help choosing?
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      'Browse first. No pressure to apply.',
                      'Verified and DSD registered creches are easier to trust fast.',
                      'Public listings still show the fastest call or WhatsApp path.',
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-[#E8DDD0] bg-white/90 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </SurfaceCard>

              <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-slate-100" />}>
                <SuggestedCentresSection />
              </Suspense>

            </div>
          ) : screenState === 'pending' ? (
            <div className="cc-stack">
              <SurfaceCard className="border border-[#D9ECE7] bg-[linear-gradient(180deg,#F6FCFA_0%,#FFFFFF_100%)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">Applications in progress</p>
                    <h1 className="mt-2 text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[2rem]" style={{ fontFamily: 'var(--font-display)' }}>
                      You&apos;re waiting on {activeApplications.length} application{activeApplications.length === 1 ? '' : 's'}.
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Keep an eye on updates, reply quickly when a creche needs something, and keep browsing if you want more options.
                    </p>
                    {latestPendingApplication ? (
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Most recent: <span className="font-semibold text-slate-900">{latestPendingApplication.childName}</span> at{' '}
                        <span className="font-semibold text-slate-900">{latestPendingApplication.centreName}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:w-auto sm:min-w-[220px]">
                    <Link
                      href="/parent/applications"
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                    >
                      View applications
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/parent/discover"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                    >
                      Find more creches
                    </Link>
                  </div>
                </div>
              </SurfaceCard>

              <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-slate-100" />}>
                <ActivityFeedSection />
              </Suspense>

              <Suspense fallback={null}>
                <ParentJobsSection />
              </Suspense>
            </div>
          ) : (
            <div className="cc-stack">
              <SurfaceCard className="relative overflow-hidden border border-emerald-200 bg-[linear-gradient(180deg,#F4FCF8_0%,#FFFFFF_100%)] p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_52%),radial-gradient(circle_at_top_right,rgba(13,148,136,0.10),transparent_38%)]" />
                <EnrolledConfetti applicationId={enrolledApplication?.id ?? 'enrolled'} />
                <div className="relative">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">You&apos;re in</p>
                  <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    {enrolledChildName} is enrolled at {enrolledCentreName}.
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">Use the shortcuts below for daily updates, messages, and centre details.</p>
                </div>
              </SurfaceCard>

              <section className="grid grid-cols-2 gap-3 sm:gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="animate-fade-in group block min-h-[44px]"
                      style={{ animationDelay: `${80 + index * 60}ms` }}
                    >
                      <SurfaceCard className="h-full p-4 transition-all duration-300 hover:border-cyan-300">
                        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                        <p className="mt-1 text-xs text-slate-600">{action.description}</p>
                      </SurfaceCard>
                    </Link>
                  )
                })}
              </section>

              <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-slate-100" />}>
                <ActivityFeedSection />
              </Suspense>

              <Suspense fallback={null}>
                <ParentJobsSection />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
