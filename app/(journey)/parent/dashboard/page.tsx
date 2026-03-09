import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getJohannesburgGreeting } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import {
  Building2,
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

// Sections
import { DashboardSummary, DashboardSummarySkeleton } from './_sections/summary-section'
import { ProfileReadinessCard, ProfileReadinessCardSkeleton } from './_sections/profile-readiness-card'
import { ActivityFeedSection } from './_sections/activity-feed-section'
import { SuggestedCentresSection } from './_sections/suggested-centres-section'
import { ParentJobsSection } from './_sections/parent-jobs-section'
import { PushPermissionRequest } from '@/components/notifications/PushPermissionRequest'

export const metadata: Metadata = {
  title: 'Parent Dashboard | CentreConnect',
  description: 'Your parent home for applications, enrolment milestones, and quick actions.',
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
    const greeting = getJohannesburgGreeting()

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
    const screenState: 'empty' | 'pending' | 'enrolled' = !hasApplications ? 'empty' : enrolledApplication ? 'enrolled' : 'pending'

    const firstChildName =
      `${childrenResult.data?.[0]?.first_name ?? ''} ${childrenResult.data?.[0]?.last_name ?? ''}`.trim() ||
      applications[0]?.childName ||
      'your child'
    const enrolledChildName = enrolledApplication?.childName ?? firstChildName
    const enrolledCentreName = enrolledApplication?.centreName ?? 'their creche'
    const centreInfoHref = enrolledApplication?.centreSlug ? `/c/${enrolledApplication.centreSlug}` : '/directory'

    const quickActions = [
      {
        label: "Today's Report",
        description: 'See meals, mood, and activities for today.',
        href: '/parent/daily-reports',
        icon: Sparkles,
      },
      {
        label: 'Report Cards',
        description: 'View term progress reports and teacher feedback.',
        href: '/parent/report-cards',
        icon: FileText,
      },
      {
        label: 'Messages',
        description: 'Open your parent inbox and creche notifications.',
        href: '/parent/notifications',
        icon: MessageSquare,
      },
      {
        label: 'Creche Info',
        description: 'View hours, contacts, and programme details.',
        href: centreInfoHref,
        icon: Building2,
      },
      {
        label: 'Profile',
        description: 'Manage child and family profile information.',
        href: '/parent/profile',
        icon: UserRound,
      },
    ]

    return (
      <div className="min-h-screen bg-surface-secondary px-4 pb-24 pt-4">
        <div className="cc-stack">
          <PushPermissionRequest />

          {/* Header Section - Suspended for instant shell */}
          <Suspense fallback={<DashboardSummarySkeleton />}>
            <DashboardSummary />
          </Suspense>
          <Suspense fallback={<ProfileReadinessCardSkeleton />}>
            <ProfileReadinessCard />
          </Suspense>

          {screenState === 'empty' ? (
            <div className="cc-stack">
              <SurfaceCard className="animate-fade-in relative overflow-hidden p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/70 via-cyan-50/40 to-white" />
                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50">
                      <Heart className="h-7 w-7 text-cyan-600" />
                    </div>
                    <a
                      href="https://wa.me/27123456789?text=Hello%20CentreConnect%2C%20I%20need%20help%20finding%20a%20creche%20in%20Alexandra."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp Help
                    </a>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                    {greeting}, {parentName}
                  </p>
                  <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl" style={{ fontFamily: "var(--font-serif)" }}>
                    {`Find a creche near you`}
                    <br />
                    in Alexandra.
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                    Browse trusted creches in Alexandra, compare options, and apply for {firstChildName} - all in one place.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <form action="/directory" className="flex flex-1 gap-2">
                      <label className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          name="q"
                          type="search"
                          placeholder="Search by suburb or creche name"
                          className="cc-native-field h-11 w-full rounded-2xl pl-10"
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex h-11 min-h-[44px] shrink-0 items-center justify-center rounded-2xl bg-cyan-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                      >
                        Browse
                      </button>
                    </form>
                  </div>
                </div>
              </SurfaceCard>

              <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-slate-100" />}>
                <SuggestedCentresSection />
              </Suspense>

              <Suspense fallback={null}>
                <ParentJobsSection />
              </Suspense>
            </div>
          ) : screenState === 'pending' ? (
            <div className="cc-stack">
              <SurfaceCard className="animate-fade-in p-5 sm:p-6">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Your applications are in progress</h1>
                <p className="mt-2 text-sm text-slate-600">Keep an eye on updates from each creche while decisions are pending.</p>
              </SurfaceCard>

              <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-slate-100" />}>
                <ActivityFeedSection />
              </Suspense>

              <div className="animate-fade-in" style={{ animationDelay: '180ms' }}>
                <Link href="/directory" className="group block">
                  <SurfaceCard className="flex items-center justify-between p-4 transition-all duration-300 hover:border-cyan-300">
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-slate-400 group-hover:text-cyan-600" />
                      <span className="text-sm font-semibold text-slate-600 group-hover:text-cyan-700">Browse more creches</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-700" />
                  </SurfaceCard>
                </Link>
              </div>

              <Suspense fallback={null}>
                <ParentJobsSection />
              </Suspense>
            </div>
          ) : (
            <div className="cc-stack">
              <SurfaceCard className="animate-fade-in relative overflow-hidden p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-cyan-100/40 to-white" />
                <EnrolledConfetti applicationId={enrolledApplication?.id ?? 'enrolled'} />
                <div className="relative">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Celebration</p>
                  <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    {enrolledChildName} is learning at {enrolledCentreName}!
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">You are all set. Use the shortcuts below to stay connected every day.</p>
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
