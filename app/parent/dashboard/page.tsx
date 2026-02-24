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

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    submitted: { label: 'Submitted', classes: 'border-blue-200 bg-blue-50 text-blue-700' },
    in_review: { label: 'In Review', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
    waitlisted: { label: 'Waitlisted', classes: 'border-orange-200 bg-orange-50 text-orange-700' },
    approved: { label: 'Approved', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    enrolled: { label: 'Enrolled', classes: 'border-green-200 bg-green-50 text-green-700' },
    rejected: { label: 'Not Accepted', classes: 'border-rose-200 bg-rose-50 text-rose-700' },
    offer_pending: { label: 'Offer Waiting', classes: 'border-violet-200 bg-violet-50 text-violet-700' },
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

export default async function ParentDashboardPage() {
  const perf = startRoutePerf('/parent/dashboard')
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [profileResult, childrenResult, applicationsResult] = await Promise.all([
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

    const enrolledApplication = applications.find((application) => application.status === 'enrolled')
    const hasApplications = applications.length > 0
    const screenState: 'empty' | 'pending' | 'enrolled' =
      !hasApplications ? 'empty' : enrolledApplication ? 'enrolled' : 'pending'

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
          <section className="glass-card animate-fade-in relative overflow-hidden rounded-2xl p-5 sm:p-7">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-50/80 via-cyan-50/50 to-white" />
            <div className="relative space-y-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-500">
                <Heart className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {greeting}, {parentName}
                </p>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Find a centre for {firstChildName}</h1>
                <p className="max-w-xl text-sm text-slate-600 sm:text-base">
                  Search trusted ECD centres nearby, compare fit, and apply when you are ready.
                </p>
              </div>
              <form action="/directory" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="relative block flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="q"
                    type="search"
                    placeholder="Search by suburb, centre name, or programme"
                    className="cc-native-field h-11 rounded-xl pl-10"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                >
                  Browse Centres
                </button>
              </form>
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
              <EnrolledConfetti />
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
