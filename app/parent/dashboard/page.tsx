import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, getJohannesburgGreeting } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Heart,
  MessageSquare,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { EnrolledConfetti } from './_components/enrolled-confetti'

export const metadata: Metadata = {
  title: 'Parent Command Centre | CentreConnect',
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

type DashboardApplicationSummary = {
  id: string
  status: string | null
  submitted_at: string | null
}

type DashboardStatusHistory = {
  application_id: string | null
  created_at: string | null
  new_status: string | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function formatDurationDays(days: number | null) {
  if (days === null) return 'No responses yet'
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24))
    return `${hours}h`
  }
  if (days < 10) return `${days.toFixed(1)}d`
  return `${Math.round(days)}d`
}

function formatAgeFromNow(iso: string | null) {
  if (!iso) return 'No unread'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'No unread'
  const diff = Math.max(0, Date.now() - then)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  return `${Math.floor(diff / day)}d ago`
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    submitted: { label: 'Submitted', classes: 'border-blue-200 bg-blue-50 text-blue-700' },
    in_review: { label: 'In Review', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
    waitlisted: { label: 'Waitlisted', classes: 'border-orange-200 bg-orange-50 text-orange-700' },
    approved: { label: 'Approved ✓', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    enrolled: { label: 'Enrolled ', classes: 'border-green-200 bg-green-50 text-green-700' },
    rejected: { label: 'Unsuccessful', classes: 'border-rose-200 bg-rose-50 text-rose-700' },
    offer_pending: { label: 'Offer Waiting', classes: 'border-violet-200 bg-violet-50 text-violet-700' },
    withdrawn: { label: 'Withdrawn', classes: 'border-slate-200 bg-slate-50 text-slate-500' },
  }
  const pill = map[status] ?? { label: status, classes: 'border-slate-200 bg-slate-50 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${pill.classes}`}>
      {pill.label}
    </span>
  )
}

function ApplicationStatusCard({
  application,
  delayMs = 0,
}: {
  application: DashboardApplication
  delayMs?: number
}) {
  return (
    <Link
      href={`/parent/applications/${application.id}`}
      className="glass-card animate-fade-in group block rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[var(--shadow-elevation-4)]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{application.centreName}</p>
          <p className="mt-1 truncate text-sm text-slate-600">{application.childName}</p>
          <p className="mt-2 text-xs text-slate-500">Last updated {formatDate(application.lastUpdatedAt)}</p>
        </div>
        <div className="shrink-0 pl-2">
          <StatusPill status={application.status} />
          <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-slate-500 transition-colors group-hover:text-cyan-700">
            <span>View Details</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function TrendSnapshot({
  responseRatePct,
  respondedApplicationsForTrends,
  totalApplicationsForTrends,
  firstResponseLabel,
  unreadNotificationsCount,
  oldestUnreadAgeLabel,
}: {
  responseRatePct: number
  respondedApplicationsForTrends: number
  totalApplicationsForTrends: number
  firstResponseLabel: string
  unreadNotificationsCount: number
  oldestUnreadAgeLabel: string
}) {
  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trend Snapshot</p>
        <p className="text-[11px] text-slate-500">30d response + live inbox</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Response Rate</p>
          <p className="mt-1 text-xl font-bold text-cyan-700">{responseRatePct}%</p>
          <p className="text-xs text-slate-500">
            {respondedApplicationsForTrends} of {totalApplicationsForTrends} responded
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">First Response</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{firstResponseLabel}</p>
          <p className="text-xs text-slate-500">Median time from submission</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inbox Pulse</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{unreadNotificationsCount}</p>
          <p className="text-xs text-slate-500">Oldest unread: {oldestUnreadAgeLabel}</p>
        </div>
      </div>
    </section>
  )
}

export default async function ParentDashboardPage() {
  const perf = startRoutePerf('/parent/dashboard')
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [profileResult, childrenResult, applicationsResult, applicationSummaryResult, unreadNotificationsResult] =
      await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user?.id ?? '')
          .maybeSingle(),
        supabase
          .from('children')
          .select('id,first_name,last_name')
          .eq('parent_id', user?.id ?? '')
          .limit(8),
        supabase
          .from('applications')
          .select('id,status,submitted_at,updated_at,child_id,ecd_centres(name,slug),children(first_name,last_name)')
          .eq('parent_id', user?.id ?? '')
          .order('submitted_at', { ascending: false })
          .limit(8),
        supabase
          .from('applications')
          .select('id,status,submitted_at')
          .eq('parent_id', user?.id ?? '')
          .gte('submitted_at', thirtyDaysAgoIso),
        supabase
          .from('parent_notifications')
          .select('id,created_at', { count: 'exact' })
          .eq('parent_id', user?.id ?? '')
          .eq('is_read', false)
          .order('created_at', { ascending: true })
          .limit(1),
      ])

    const parentName = profileResult.data?.full_name?.trim() || 'Parent'
    const greeting = getJohannesburgGreeting()

    const children =
      (childrenResult.data ?? []) as Array<{
        id: string
        first_name: string | null
        last_name: string | null
      }>

    const childNameById = new Map(
      children.map((child) => [
        child.id,
        `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'Child profile',
      ])
    )

    const applications = ((applicationsResult.data ?? []) as any[]).map((application) => {
      const centre = normalizeOne<{ name?: string | null; slug?: string | null }>(application.ecd_centres)
      const child = normalizeOne<{ first_name?: string | null; last_name?: string | null }>(application.children)
      const childName =
        `${child?.first_name ?? ''} ${child?.last_name ?? ''}`.trim() ||
        childNameById.get(String(application.child_id ?? '')) ||
        'Child profile'

      return {
        id: String(application.id ?? ''),
        status: String(application.status ?? ''),
        lastUpdatedAt: String(application.updated_at ?? application.submitted_at ?? ''),
        centreName: centre?.name?.trim() || 'Centre pending',
        centreSlug: centre?.slug ?? null,
        childName,
      } satisfies DashboardApplication
    })

    const applicationSummaries = (applicationSummaryResult.data ?? []) as DashboardApplicationSummary[]
    const summaryIds = applicationSummaries.map((item) => item.id).filter(Boolean)
    const statusHistoryResult =
      summaryIds.length > 0
        ? await supabase
            .from('application_status_history')
            .select('application_id,created_at,new_status')
            .in('application_id', summaryIds)
            .order('created_at', { ascending: true })
        : { data: [] as DashboardStatusHistory[] }

    const statusHistoryRows = (statusHistoryResult.data ?? []) as DashboardStatusHistory[]
    const firstResponseByApplication = new Map<string, string>()
    for (const row of statusHistoryRows) {
      if (!row.application_id || !row.created_at) continue
      if (firstResponseByApplication.has(row.application_id)) continue
      if ((row.new_status ?? 'submitted') === 'submitted') continue
      firstResponseByApplication.set(row.application_id, row.created_at)
    }

    const firstResponseDurations = applicationSummaries
      .map((application) => {
        const submittedAt = application.submitted_at ? new Date(application.submitted_at).getTime() : NaN
        const firstResponseAt = firstResponseByApplication.get(application.id)
        const firstResponseMs = firstResponseAt ? new Date(firstResponseAt).getTime() : NaN
        if (!Number.isFinite(submittedAt) || !Number.isFinite(firstResponseMs) || firstResponseMs < submittedAt) {
          return null
        }
        return (firstResponseMs - submittedAt) / (1000 * 60 * 60 * 24)
      })
      .filter((value): value is number => typeof value === 'number')

    const totalApplicationsForTrends = applicationSummaries.length
    const respondedApplicationsForTrends = applicationSummaries.filter(
      (application) => (application.status ?? 'submitted') !== 'submitted'
    ).length
    const responseRatePct =
      totalApplicationsForTrends > 0
        ? Math.round((respondedApplicationsForTrends / totalApplicationsForTrends) * 100)
        : 0
    const medianFirstResponseDays = median(firstResponseDurations)
    const firstResponseLabel = formatDurationDays(medianFirstResponseDays)
    const unreadNotificationsCount = unreadNotificationsResult.count ?? 0
    const oldestUnreadCreatedAt = unreadNotificationsResult.data?.[0]?.created_at ?? null
    const oldestUnreadAgeLabel = formatAgeFromNow(oldestUnreadCreatedAt)

    const enrolledApplication = applications.find((application) => application.status === 'enrolled')
    const hasApplications = applications.length > 0
    const screenState: 'empty' | 'pending' | 'enrolled' =
      !hasApplications ? 'empty' : enrolledApplication ? 'enrolled' : 'pending'
    const respondedCount = applications.filter((a) => !['submitted'].includes(a.status)).length
    const progressPct = applications.length > 0 ? Math.round((respondedCount / applications.length) * 100) : 0

    const firstChildName =
      `${children[0]?.first_name ?? ''} ${children[0]?.last_name ?? ''}`.trim() ||
      applications[0]?.childName ||
      'your child'
    const enrolledChildName = enrolledApplication?.childName ?? firstChildName
    const enrolledCentreName = enrolledApplication?.centreName ?? 'their centre'
    const centreInfoHref = enrolledApplication?.centreSlug ? `/c/${enrolledApplication.centreSlug}` : '/directory'

    const quickActions = [
      {
        label: 'Check-in',
        description: "See today's attendance and drop-off updates.",
        href: '/parent/applications',
        icon: CheckCircle2,
      },
      {
        label: 'Messages',
        description: 'Open your parent inbox and centre notifications.',
        href: '/parent/notifications',
        icon: MessageSquare,
      },
      {
        label: 'Centre Info',
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
      <div className="cc-page">
        {screenState === 'empty' ? (
          <section className="glass-card animate-fade-in relative overflow-hidden rounded-2xl p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/70 via-cyan-50/40 to-white" />
            <div className="relative">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50">
                <Heart className="h-7 w-7 text-cyan-600" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">{greeting}, {parentName}</p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {`Let's find the right ECD`}<br />for {firstChildName}.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                Browse trusted centres nearby, compare your options, and apply — all in one place. Most families find
                their match within a week.
              </p>

              {/* Journey steps */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { step: '1', label: 'Browse', desc: 'Find centres near you', color: 'bg-cyan-100 text-cyan-700' },
                  { step: '2', label: 'Apply', desc: 'One-click application', color: 'bg-amber-100 text-amber-700' },
                  { step: '3', label: 'Enrol', desc: 'Accept your offer', color: 'bg-emerald-100 text-emerald-700' },
                ].map((item) => (
                  <div key={item.step} className="rounded-xl border border-white bg-white/80 p-3 text-center">
                    <div
                      className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${item.color}`}
                    >
                      {item.step}
                    </div>
                    <p className="text-xs font-bold text-slate-800">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <form action="/directory" className="flex flex-1 gap-2">
                  <label className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="q"
                      type="search"
                      placeholder="Search by suburb or centre name"
                      className="cc-native-field h-11 w-full rounded-xl pl-10"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                  >
                    Browse
                  </button>
                </form>
              </div>
            </div>
          </section>
        ) : screenState === 'pending' ? (
          <div className="cc-stack">
            <section className="glass-card animate-fade-in rounded-2xl p-5 sm:p-6">
              <p className="text-sm font-medium text-slate-500">
                {greeting}, {parentName}
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Your applications are in progress</h1>
              <p className="mt-2 text-sm text-slate-600">
                Keep an eye on updates from each centre while decisions are pending.
              </p>
            </section>

            <section className="glass-card rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Application Progress</p>
                <p className="text-xs font-semibold text-cyan-700">
                  {respondedCount} of {applications.length} responded
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500">
                  Submitted: {applications.filter((a) => a.status === 'submitted').length}
                </span>
                <span className="text-xs font-medium text-amber-600">
                  In Review: {applications.filter((a) => a.status === 'in_review').length}
                </span>
                <span className="text-xs font-medium text-emerald-600">
                  Approved: {applications.filter((a) => a.status === 'approved').length}
                </span>
              </div>
            </section>

            <TrendSnapshot
              responseRatePct={responseRatePct}
              respondedApplicationsForTrends={respondedApplicationsForTrends}
              totalApplicationsForTrends={totalApplicationsForTrends}
              firstResponseLabel={firstResponseLabel}
              unreadNotificationsCount={unreadNotificationsCount}
              oldestUnreadAgeLabel={oldestUnreadAgeLabel}
            />

            <section className="cc-stack">
              {applications.map((application, index) => (
                <ApplicationStatusCard key={application.id} application={application} delayMs={index * 70} />
              ))}
            </section>

            <div className="animate-fade-in" style={{ animationDelay: '180ms' }}>
              <Link
                href="/directory"
                className="glass-card group flex items-center justify-between rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300"
              >
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-slate-400 group-hover:text-cyan-600" />
                  <span className="text-sm font-semibold text-slate-600 group-hover:text-cyan-700">Browse Centres</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-700" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="cc-stack">
            <section className="glass-card animate-fade-in relative overflow-hidden rounded-2xl p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-cyan-100/40 to-white" />
              <EnrolledConfetti applicationId={enrolledApplication?.id ?? 'enrolled'} />
              <div className="relative">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Celebration</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  {enrolledChildName} is learning at {enrolledCentreName}!
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  You are all set. Use the shortcuts below to stay connected every day.
                </p>
              </div>
            </section>

            <TrendSnapshot
              responseRatePct={responseRatePct}
              respondedApplicationsForTrends={respondedApplicationsForTrends}
              totalApplicationsForTrends={totalApplicationsForTrends}
              firstResponseLabel={firstResponseLabel}
              unreadNotificationsCount={unreadNotificationsCount}
              oldestUnreadAgeLabel={oldestUnreadAgeLabel}
            />

            <section className="grid grid-cols-2 gap-3 sm:gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="glass-card animate-fade-in group rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[var(--shadow-elevation-4)]"
                    style={{ animationDelay: `${80 + index * 60}ms` }}
                  >
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                    <p className="mt-1 text-xs text-slate-600">{action.description}</p>
                  </Link>
                )
              })}
            </section>
          </div>
        )}
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
