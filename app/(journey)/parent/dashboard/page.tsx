import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SurfaceCard } from '@/components/ui/surface-card'
import { SuggestedCentresSection } from './_sections/suggested-centres-section'
import { ProfileReadinessCard, ProfileReadinessCardSkeleton } from './_sections/profile-readiness-card'
import { evaluateParentIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { formatDate } from '@/lib/utils'
import { deriveParentHomeState, type ParentHomeState } from '@/lib/parent/home-state'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Parent Home | CentreConnect',
  description: 'Your parent home for applications, daily updates, and quick next steps.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

type DashboardApplication = {
  id: string
  childId: string | null
  ecdId: string | null
  status: string
  lastUpdatedAt: string
  startDate: string | null
  centreName: string
  centreSlug: string | null
  childName: string
  missingDocuments: string[]
}

type ParentNotificationItem = {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  centreName: string | null
}

type DailyUpdateItem = {
  id: string
  childName: string
  reportDate: string
  teacherNotes: string | null
  mood: string | null
  activities: string[]
}

type UpcomingEvent = {
  id: string
  title: string
  eventDate: string
  startTime: string | null
  centreName: string | null
}

type RawApplicationRow = {
  id: string
  child_id: string | null
  ecd_id: string | null
  status: string
  updated_at: string | null
  submitted_at: string
  start_date: string | null
  missing_documents: unknown
  ecd_centres: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null
  children: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
}

type RawNotificationRow = {
  id: string
  title: string | null
  message: string | null
  is_read: boolean | null
  created_at: string
  ecd_centres: { name: string | null } | { name: string | null }[] | null
}

type RawDailyReportRow = {
  id: string
  report_date: string
  mood: string | null
  teacher_notes: string | null
  activities: string[] | null
  children: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
}

type RawCalendarEventRow = {
  id: string
  title: string | null
  event_date: string
  start_time: string | null
  ecd_centres: { name: string | null } | { name: string | null }[] | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function normalizeMissingDocuments(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

function formatStatusLabel(status: string) {
  return normalizeText(status).replaceAll('_', ' ') || 'submitted'
}

function formatEventTime(startTime: string | null | undefined) {
  const value = normalizeText(startTime)
  if (!value) return null
  return value.slice(0, 5)
}

function getMoodLabel(mood: string | null | undefined) {
  const normalized = normalizeText(mood)
  if (!normalized) return 'Update shared'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function ReadinessHighlights({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Profile still needs</p>
      <p className="mt-1">{missing.slice(0, 3).join(', ')}</p>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{eyebrow}</p>
      <h1
        className="mt-2 text-[1.6rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[2rem]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

export default async function ParentDashboardPage() {
  const perf = startRoutePerf('/parent/dashboard')
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [profileResult, parentProfileResult, parentDocsResult, childrenResult, applicationsResult] = await Promise.all([
      supabase.from('user_profiles').select('full_name,phone').eq('id', user?.id ?? '').maybeSingle(),
      supabase
        .from('parents')
        .select('guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status')
        .eq('id', user?.id ?? '')
        .maybeSingle(),
      supabase.from('parent_documents').select('doc_type').eq('parent_id', user?.id ?? '').limit(80),
      supabase.from('children').select('id,first_name,last_name,ecd_id,enrollment_status').eq('parent_id', user?.id ?? '').order('created_at', { ascending: false }).limit(6),
      supabase
        .from('applications')
        .select('id,child_id,ecd_id,status,updated_at,submitted_at,start_date,missing_documents,ecd_centres(name,slug),children(first_name,last_name)')
        .eq('parent_id', user?.id ?? '')
        .order('submitted_at', { ascending: false })
        .limit(12),
    ])

    const parentName = profileResult.data?.full_name?.trim() || 'Parent'
    const parentFirstName = parentName.split(' ')[0] || 'there'

    const readiness = evaluateParentIntakeReadiness({
      parent: {
        fullName: parentName,
        phone: profileResult.data?.phone ?? null,
        guardianRelationship: parentProfileResult.data?.guardian_relationship ?? null,
        emergencyContactName: parentProfileResult.data?.emergency_contact_name ?? null,
        emergencyContactPhone: parentProfileResult.data?.emergency_contact_phone ?? null,
        idVerificationStatus: parentProfileResult.data?.id_verification_status ?? null,
      },
      docTypes: (parentDocsResult.data ?? []).map((item) => item.doc_type),
      hasAtLeastOneChild: (childrenResult.data ?? []).length > 0,
    })

    const childRows = ((childrenResult.data ?? []) as Array<{
      id: string
      first_name: string | null
      last_name: string | null
      ecd_id: string | null
      enrollment_status: string | null
    }>).map((child) => ({
      id: String(child.id),
      displayName: `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'your child',
      ecdId: child.ecd_id ? String(child.ecd_id) : null,
      enrollmentStatus: String(child.enrollment_status ?? '').trim().toLowerCase(),
    }))

    const applications = ((applicationsResult.data ?? []) as unknown as RawApplicationRow[]).map((application) => {
      const centre = normalizeOne<{ name?: string | null; slug?: string | null }>(application.ecd_centres)
      const child = normalizeOne<{ first_name?: string | null; last_name?: string | null }>(application.children)
      const childName = `${child?.first_name ?? ''} ${child?.last_name ?? ''}`.trim() || 'your child'

      return {
        id: String(application.id ?? ''),
        childId: application.child_id ? String(application.child_id) : null,
        ecdId: application.ecd_id ? String(application.ecd_id) : null,
        status: String(application.status ?? '').trim().toLowerCase(),
        lastUpdatedAt: String(application.updated_at ?? application.submitted_at ?? ''),
        startDate: application.start_date ?? null,
        centreName: centre?.name?.trim() || 'Your creche',
        centreSlug: centre?.slug ?? null,
        childName,
        missingDocuments: normalizeMissingDocuments(application.missing_documents),
      } satisfies DashboardApplication
    })

    const pendingApplicationStatuses = new Set([
      'submitted',
      'in_review',
      'partial',
      'draft',
      'offer_made',
      'offer_sent',
      'offer_pending',
      'awaiting_documents',
      'accepted',
    ])
    const enrolledChildStatuses = new Set(['active', 'enrolled'])
    const activeApplications = applications.filter((application) => pendingApplicationStatuses.has(application.status))
    const enrolledApplication = applications.find((application) => application.status === 'enrolled') ?? null
    const enrolledChildren = childRows.filter(
      (child) => Boolean(child.ecdId) && enrolledChildStatuses.has(child.enrollmentStatus)
    )
    const enrolledPrimaryChild = enrolledChildren[0] ?? null
    const homeState: ParentHomeState = deriveParentHomeState({
      hasPendingApplications: activeApplications.length > 0,
      hasEnrolledChild: enrolledChildren.length > 0 || Boolean(enrolledApplication),
    })

    const enrolledChildIds = Array.from(
      new Set([
        ...enrolledChildren.map((child) => child.id),
        ...applications
          .filter((application) => application.status === 'enrolled')
          .map((application) => application.childId)
          .filter((value): value is string => Boolean(value)),
      ])
    )
    const enrolledCentreIds = Array.from(
      new Set([
        ...enrolledChildren.map((child) => child.ecdId).filter((value): value is string => Boolean(value)),
        ...applications
          .filter((application) => application.status === 'enrolled')
          .map((application) => application.ecdId)
          .filter((value): value is string => Boolean(value)),
      ])
    )

    const [notificationsResult, dailyReportsResult, eventsResult, enrolledCentresResult] = await Promise.all([
      supabase
        .from('parent_notifications')
        .select('id,title,message,is_read,created_at,ecd_centres(name)')
        .order('created_at', { ascending: false })
        .limit(homeState === 'discover' ? 3 : 6),
      enrolledChildIds.length > 0
        ? supabase
            .from('child_daily_reports')
            .select('id,report_date,mood,teacher_notes,activities,children(first_name,last_name)')
            .in('child_id', enrolledChildIds)
            .not('published_at', 'is', null)
            .order('report_date', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(6)
        : Promise.resolve({ data: [] }),
      enrolledCentreIds.length > 0
        ? supabase
            .from('calendar_events')
            .select('id,title,event_date,start_time,ecd_centres(name)')
            .in('ecd_id', enrolledCentreIds)
            .eq('is_public', true)
            .gte('event_date', new Date().toISOString().slice(0, 10))
            .order('event_date', { ascending: true })
            .limit(4)
        : Promise.resolve({ data: [] }),
      enrolledCentreIds.length > 0
        ? supabase.from('ecd_centres').select('id,name,slug').in('id', enrolledCentreIds)
        : Promise.resolve({ data: [] }),
    ])

    const notifications = ((notificationsResult.data ?? []) as RawNotificationRow[]).map((item) => ({
      id: String(item.id),
      title: normalizeText(item.title, 'New update'),
      message: normalizeText(item.message, 'Open your inbox to read the latest update from your creche.'),
      isRead: item.is_read === true,
      createdAt: item.created_at,
      centreName: normalizeOne<{ name?: string | null }>(item.ecd_centres)?.name?.trim() || null,
    }))

    const unreadNotifications = notifications.filter((item) => !item.isRead)
    const latestDailyUpdate = ((dailyReportsResult.data ?? []) as RawDailyReportRow[])
      .map((report) => {
        const child = normalizeOne<{ first_name?: string | null; last_name?: string | null }>(report.children)
        return {
          id: String(report.id),
          childName: `${child?.first_name ?? ''} ${child?.last_name ?? ''}`.trim() || enrolledPrimaryChild?.displayName || enrolledApplication?.childName || 'your child',
          reportDate: report.report_date,
          teacherNotes: report.teacher_notes ?? null,
          mood: report.mood ?? null,
          activities: Array.isArray(report.activities) ? report.activities.map((activity) => String(activity).trim()).filter(Boolean) : [],
        } satisfies DailyUpdateItem
      })
      .at(0) ?? null

    const nextEvent = ((eventsResult.data ?? []) as RawCalendarEventRow[])
      .map((event) => ({
        id: String(event.id),
        title: normalizeText(event.title, 'Upcoming event'),
        eventDate: event.event_date,
        startTime: event.start_time ?? null,
        centreName: normalizeOne<{ name?: string | null }>(event.ecd_centres)?.name?.trim() || null,
      }) satisfies UpcomingEvent)
      .at(0) ?? null

    const enrolledCentreMap = new Map(
      (((enrolledCentresResult.data ?? []) as Array<{ id: string; name: string | null; slug: string | null }>)).map((centre) => [
        String(centre.id),
        {
          name: centre.name?.trim() || 'Your creche',
          slug: centre.slug?.trim() || null,
        },
      ])
    )

    const firstChildName =
      childRows[0]?.displayName ||
      applications[0]?.childName ||
      'your child'

    const latestPendingApplication = activeApplications[0] ?? null
    const enrolledCentreMeta =
      (enrolledApplication?.ecdId ? enrolledCentreMap.get(enrolledApplication.ecdId) : null) ??
      (enrolledPrimaryChild?.ecdId ? enrolledCentreMap.get(enrolledPrimaryChild.ecdId) : null) ??
      null
    const pickupHref = enrolledApplication ? `/parent/applications/${enrolledApplication.id}#pickup-code-section` : '/parent/children'
    const centreInfoHref = enrolledApplication?.centreSlug
      ? `/c/${enrolledApplication.centreSlug}`
      : enrolledCentreMeta?.slug
        ? `/c/${enrolledCentreMeta.slug}`
        : '/parent/discover'

    return (
      <div className="min-h-screen bg-surface-secondary px-4 pb-24 pt-4">
        <div className="cc-stack">
          {homeState === 'discover' ? (
            <div className="cc-stack">
              <SurfaceCard className="relative overflow-hidden border border-[#D9ECE7] bg-[linear-gradient(180deg,#F6FCFA_0%,#FFFFFF_100%)] p-6 sm:p-7">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_55%),radial-gradient(circle_at_top_right,rgba(212,147,90,0.12),transparent_38%)]" />
                <div className="relative">
                  <SectionHeading
                    eyebrow={`Welcome back, ${parentFirstName}`}
                    title={`Find the right creche for ${firstChildName}.`}
                    description="You have already done the hard part by signing in again. Now use CentreConnect to compare trusted creches quickly and apply when one feels right."
                  />

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

                  <ReadinessHighlights missing={readiness.missing} />
                </div>
              </SurfaceCard>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Suspense fallback={<ProfileReadinessCardSkeleton />}>
                  <ProfileReadinessCard />
                </Suspense>

                <SurfaceCard className="p-5">
                  <div className="flex items-center gap-2 text-slate-900">
                    <BellRing className="h-4 w-4 text-cyan-600" />
                    <h2 className="text-base font-bold">You are ready to move</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Browse first, save what you like, and apply only when a creche feels right for your family.
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">Verified and DSD registered creches are easier to trust fast.</div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">Public listings still show the fastest WhatsApp or call path.</div>
                  </div>
                </SurfaceCard>
              </div>

              <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-slate-100" />}>
                <SuggestedCentresSection />
              </Suspense>
            </div>
          ) : homeState === 'pending' ? (
            <div className="cc-stack">
              <SurfaceCard className="border border-[#D9ECE7] bg-[linear-gradient(180deg,#F6FCFA_0%,#FFFFFF_100%)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <SectionHeading
                      eyebrow="Applications in progress"
                      title={`You are waiting on ${activeApplications.length} application${activeApplications.length === 1 ? '' : 's'}.`}
                      description="Stay close to replies, send anything the creche still needs, and keep browsing if you want another good option in the meantime."
                    />
                    {latestPendingApplication ? (
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Most recent: <span className="font-semibold text-slate-900">{latestPendingApplication.childName}</span> at{' '}
                        <span className="font-semibold text-slate-900">{latestPendingApplication.centreName}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:min-w-[220px]">
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
                      Keep browsing
                    </Link>
                  </div>
                </div>
              </SurfaceCard>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <SurfaceCard className="p-5">
                  <div className="flex items-center gap-2 text-slate-900">
                    <FileText className="h-4 w-4 text-cyan-600" />
                    <h2 className="text-base font-bold">Next step for your family</h2>
                  </div>
                  {latestPendingApplication ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{latestPendingApplication.childName} at {latestPendingApplication.centreName}</p>
                      <p className="mt-1 text-sm text-slate-600">Status: {formatStatusLabel(latestPendingApplication.status)}</p>
                      <p className="mt-1 text-xs text-slate-500">Updated {formatDate(latestPendingApplication.lastUpdatedAt)}</p>
                      {latestPendingApplication.missingDocuments.length > 0 ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          Missing now: {latestPendingApplication.missingDocuments.slice(0, 3).map((item) => item.replaceAll('_', ' ')).join(', ')}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <ReadinessHighlights missing={readiness.missing} />
                </SurfaceCard>

                <div className="space-y-4">
                  <SurfaceCard className="p-5">
                    <div className="flex items-center gap-2 text-slate-900">
                      <MessageSquare className="h-4 w-4 text-cyan-600" />
                      <h2 className="text-base font-bold">Inbox</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {unreadNotifications.length > 0
                        ? `${unreadNotifications.length} unread update${unreadNotifications.length === 1 ? '' : 's'} from creches.`
                        : 'No unread updates right now. We will keep new messages here.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <QuickLink href="/parent/notifications" label="Open inbox" />
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="p-5">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Search className="h-4 w-4 text-cyan-600" />
                      <h2 className="text-base font-bold">Still exploring?</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      It is okay to keep comparing until one creche feels right. CentreConnect keeps your options organised.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <QuickLink href="/parent/discover" label="Find more creches" />
                    </div>
                  </SurfaceCard>
                </div>
              </div>
            </div>
          ) : (
            <div className="cc-stack">
              <SurfaceCard className="relative overflow-hidden border border-emerald-200 bg-[linear-gradient(180deg,#F4FCF8_0%,#FFFFFF_100%)] p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_52%),radial-gradient(circle_at_top_right,rgba(13,148,136,0.10),transparent_38%)]" />
                <div className="relative">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <SectionHeading
                    eyebrow={`Welcome back, ${parentFirstName}`}
                    title={`Today with ${enrolledApplication?.childName ?? enrolledPrimaryChild?.displayName ?? 'your child'}`}
                    description={`You are no longer here to search first. Your main job now is staying close to ${enrolledApplication?.centreName ?? enrolledCentreMeta?.name ?? 'your creche'} through daily updates, messages, pickup, and important reminders.`}
                  />
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/parent/daily-reports"
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                    >
                      Today&apos;s updates
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/parent/notifications"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                    >
                      Family inbox
                    </Link>
                    <Link
                      href={pickupHref}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                    >
                      Pickup &amp; collection
                    </Link>
                  </div>
                  <Link href="/parent/discover" className="mt-4 inline-flex text-sm font-semibold text-slate-500 transition-colors hover:text-cyan-700">
                    Explore other creches only if you are thinking of moving later.
                  </Link>
                </div>
              </SurfaceCard>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <SurfaceCard className="p-5">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Sparkles className="h-4 w-4 text-cyan-600" />
                    <h2 className="text-base font-bold">Latest daily update</h2>
                  </div>
                  {latestDailyUpdate ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{latestDailyUpdate.childName}</p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                            {formatDate(latestDailyUpdate.reportDate)} • {getMoodLabel(latestDailyUpdate.mood)}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                          Daily report ready
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {latestDailyUpdate.teacherNotes || 'Your creche shared a fresh update for today.'}
                      </p>
                      {latestDailyUpdate.activities.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {latestDailyUpdate.activities.slice(0, 4).map((activity) => (
                            <span key={activity} className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                              {activity}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <QuickLink href="/parent/daily-reports" label="Open reports" />
                        <QuickLink href="/parent/report-cards" label="Child reports" />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      Today&apos;s daily update has not been published yet. It will appear here as soon as the creche shares it.
                    </div>
                  )}
                </SurfaceCard>

                <div className="space-y-4">
                  <SurfaceCard className="p-5">
                    <div className="flex items-center gap-2 text-slate-900">
                      <MessageSquare className="h-4 w-4 text-cyan-600" />
                      <h2 className="text-base font-bold">Family inbox</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {unreadNotifications.length > 0
                        ? `${unreadNotifications.length} unread message${unreadNotifications.length === 1 ? '' : 's'} or announcement${unreadNotifications.length === 1 ? '' : 's'} from your creche.`
                        : 'No unread updates right now. New messages and announcements will show here first.'}
                    </p>
                    {notifications[0] ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{notifications[0].title}</p>
                        <p className="mt-1 text-sm text-slate-600">{notifications[0].message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {notifications[0].centreName ? `${notifications[0].centreName} • ` : ''}
                          {formatDate(notifications[0].createdAt)}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <QuickLink href="/parent/notifications" label="Open inbox" />
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="p-5">
                    <div className="flex items-center gap-2 text-slate-900">
                      <CalendarDays className="h-4 w-4 text-cyan-600" />
                      <h2 className="text-base font-bold">Next at your creche</h2>
                    </div>
                    {nextEvent ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{nextEvent.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{formatDate(nextEvent.eventDate)}{formatEventTime(nextEvent.startTime) ? ` • ${formatEventTime(nextEvent.startTime)}` : ''}</p>
                        {nextEvent.centreName ? <p className="mt-1 text-xs text-slate-500">{nextEvent.centreName}</p> : null}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        No upcoming public event has been shared yet.
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <QuickLink href="/parent/calendar" label="Open calendar" />
                      <QuickLink href={centreInfoHref} label="Creche info" />
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="p-5">
                    <div className="flex items-center gap-2 text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-cyan-600" />
                      <h2 className="text-base font-bold">Collection and safety</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Pickup codes and family permissions stay connected to your enrolled child, so collection stays calm and clear.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <QuickLink href={pickupHref} label="Open pickup code" />
                      <QuickLink href="/parent/profile/guardians" label="Manage caregivers" />
                    </div>
                  </SurfaceCard>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
