import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  ArrowRight,
  CalendarDays,
  MessageSquare,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SurfaceCard } from '@/components/ui/surface-card'
import { SuggestedCentresSection } from './_sections/suggested-centres-section'
import { ParentDashboardRealtimeBridge } from './_sections/parent-dashboard-realtime-bridge'
import { getParentProgress } from '@/lib/parent/progress'
import { formatDate } from '@/lib/utils'
import {
  deriveParentHomeState,
  hasEnrolledChildStatus,
  hasPendingParentApplicationStatus,
  isEnrolledApplicationStatus,
  type ParentHomeState,
} from '@/lib/parent/home-state'
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
  childId: string | null
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
  child_id: string | null
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

function formatEventTime(startTime: string | null | undefined) {
  const value = normalizeText(startTime)
  if (!value) return null
  return value.slice(0, 5)
}

function getMoodLabel(mood: string | null | undefined) {
  const normalized = normalizeText(mood)
  if (!normalized) return null
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

/** Map raw application status to plain English */
function statusToPlainEnglish(status: string): string {
  const normalized = String(status ?? '').trim().toLowerCase()
  switch (normalized) {
    case 'submitted':
    case 'partial':
    case 'draft':
      return 'Application sent'
    case 'in_review':
      return 'The crèche is reviewing your application'
    case 'awaiting_documents':
      return 'Documents needed'
    case 'offer_made':
    case 'offer_sent':
    case 'offer_pending':
      return 'Crèche has made an offer — respond now'
    case 'approved':
    case 'accepted':
      return 'Accepted — confirm your start date'
    case 'enrolled':
      return 'Enrolled'
    case 'rejected':
      return 'Not accepted this time'
    case 'withdrawn':
      return 'Application withdrawn'
    default:
      return normalizeText(status).replaceAll('_', ' ') || 'Application sent'
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDayName(): string {
  return new Date().toLocaleDateString('en-ZA', { weekday: 'long' })
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
        centreName: centre?.name?.trim() || 'Your crèche',
        centreSlug: centre?.slug ?? null,
        childName,
        missingDocuments: normalizeMissingDocuments(application.missing_documents),
      } satisfies DashboardApplication
    })

    const activeApplications = applications.filter((application) => hasPendingParentApplicationStatus(application.status))
    const enrolledApplication = applications.find((application) => isEnrolledApplicationStatus(application.status)) ?? null
    const enrolledChildren = childRows.filter(
      (child) => Boolean(child.ecdId) && hasEnrolledChildStatus(child.enrollmentStatus)
    )
    const enrolledPrimaryChild = enrolledChildren[0] ?? null
    const homeState: ParentHomeState = deriveParentHomeState({
      hasPendingApplications: activeApplications.length > 0,
      hasEnrolledChild: enrolledChildren.length > 0 || Boolean(enrolledApplication),
    })

    // Get unified parent progress for next action
    const progress = user ? await getParentProgress(user.id) : null

    const enrolledChildIds = Array.from(
      new Set([
        ...enrolledChildren.map((child) => child.id),
        ...applications
          .filter((application) => isEnrolledApplicationStatus(application.status))
          .map((application) => application.childId)
          .filter((value): value is string => Boolean(value)),
      ])
    )
    const enrolledCentreIds = Array.from(
      new Set([
        ...enrolledChildren.map((child) => child.ecdId).filter((value): value is string => Boolean(value)),
        ...applications
          .filter((application) => isEnrolledApplicationStatus(application.status))
          .map((application) => application.ecdId)
          .filter((value): value is string => Boolean(value)),
      ])
    )

    const [notificationsResult, dailyReportsResult, eventsResult, enrolledCentresResult] = await Promise.all([
      supabase
        .from('parent_notifications')
        .select('id,title,message,is_read,created_at,ecd_centres(name)')
        .eq('parent_id', user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(homeState === 'discover' ? 3 : 6),
      enrolledChildIds.length > 0
        ? supabase
            .from('child_daily_reports')
            .select('id,child_id,report_date,mood,teacher_notes,activities,children(first_name,last_name)')
            .in('child_id', enrolledChildIds)
            .not('published_at', 'is', null)
            .order('report_date', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(Math.max(enrolledChildIds.length * 4, 12))
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
      message: normalizeText(item.message, 'Open your inbox to read the latest update from your crèche.'),
      isRead: item.is_read === true,
      createdAt: item.created_at,
      centreName: normalizeOne<{ name?: string | null }>(item.ecd_centres)?.name?.trim() || null,
    }))

    const unreadNotifications = notifications.filter((item) => !item.isRead)
    const dailyReportItems = ((dailyReportsResult.data ?? []) as RawDailyReportRow[]).map((report) => {
      const child = normalizeOne<{ first_name?: string | null; last_name?: string | null }>(report.children)
      return {
        id: String(report.id),
        childId: report.child_id ? String(report.child_id) : null,
        childName: `${child?.first_name ?? ''} ${child?.last_name ?? ''}`.trim() || enrolledPrimaryChild?.displayName || enrolledApplication?.childName || 'your child',
        reportDate: report.report_date,
        teacherNotes: report.teacher_notes ?? null,
        mood: report.mood ?? null,
        activities: Array.isArray(report.activities) ? report.activities.map((activity) => String(activity).trim()).filter(Boolean) : [],
      } satisfies DailyUpdateItem
    })

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
          name: centre.name?.trim() || 'Your crèche',
          slug: centre.slug?.trim() || null,
        },
      ])
    )
    const childById = new Map(childRows.map((child) => [child.id, child] as const))

    const firstChildName =
      childRows[0]?.displayName ||
      applications[0]?.childName ||
      'your child'

    const latestDailyUpdateByChildId = new Map<string, DailyUpdateItem>()
    for (const report of dailyReportItems) {
      if (report.childId && !latestDailyUpdateByChildId.has(report.childId)) {
        latestDailyUpdateByChildId.set(report.childId, report)
      }
    }

    const enrolledDailyUpdateCards = enrolledChildIds.map((childId) => {
      const child = childById.get(childId) ?? null
      const enrolledApplicationForChild =
        applications.find((application) => application.childId === childId && isEnrolledApplicationStatus(application.status)) ?? null
      const childCentreMeta =
        (child?.ecdId ? enrolledCentreMap.get(child.ecdId) : null) ??
        (enrolledApplicationForChild?.ecdId ? enrolledCentreMap.get(enrolledApplicationForChild.ecdId) : null) ??
        null

      return {
        childId,
        childName: child?.displayName || enrolledApplicationForChild?.childName || 'your child',
        centreName: childCentreMeta?.name ?? enrolledApplicationForChild?.centreName ?? null,
        report: latestDailyUpdateByChildId.get(childId) ?? null,
      }
    })
    const latestDailyUpdate = enrolledDailyUpdateCards[0]?.report ?? dailyReportItems.at(0) ?? null
    const primaryDailyUpdateCard = enrolledDailyUpdateCards[0] ?? null

    const enrolledCentreMeta =
      (enrolledApplication?.ecdId ? enrolledCentreMap.get(enrolledApplication.ecdId) : null) ??
      (enrolledPrimaryChild?.ecdId ? enrolledCentreMap.get(enrolledPrimaryChild.ecdId) : null) ??
      null
    const pickupHref =
      enrolledChildIds.length > 1
        ? '/parent/applications'
        : enrolledApplication
          ? `/parent/applications/${enrolledApplication.id}#pickup-code-section`
          : '/parent/children'

    const enrolledChildName = enrolledApplication?.childName ?? enrolledPrimaryChild?.displayName ?? firstChildName
    const enrolledCentreName = enrolledApplication?.centreName ?? enrolledCentreMeta?.name ?? 'your crèche'

    // Build mood chips for enrolled state
    const moodChips: string[] = []
    if (latestDailyUpdate) {
      const mood = getMoodLabel(latestDailyUpdate.mood)
      if (mood) moodChips.push(mood)
      for (const activity of latestDailyUpdate.activities.slice(0, 2)) {
        moodChips.push(activity)
      }
    }

    return (
      <div className="min-h-screen bg-surface-secondary px-4 pb-24 pt-4">
        <div className="cc-stack">
          {user?.id ? <ParentDashboardRealtimeBridge parentId={user.id} /> : null}

          {/* ─────────────────────────────────────────────── */}
          {/* STATE: DISCOVER                                 */}
          {/* ─────────────────────────────────────────────── */}
          {homeState === 'discover' ? (
            <div className="space-y-6">
              {/* Warm welcome header */}
              <div className="pt-2">
                <h1
                  className="text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-slate-900 sm:text-[2rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {getGreeting()}, {parentFirstName}.{' '}
                  <span className="text-slate-600">Find the right crèche for your child.</span>
                </h1>
                <div className="mt-5">
                  <Link
                    href="/parent/discover"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
                  >
                    Find crèches near me
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Suggested centres — the primary content */}
              <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-slate-100" />}>
                <SuggestedCentresSection />
              </Suspense>

              {/* Trust line */}
              <p className="text-center text-sm text-slate-500">
                No registration fees. Apply to any crèche for free.
              </p>
            </div>

          /* ─────────────────────────────────────────────── */
          /* STATE: PENDING                                  */
          /* ─────────────────────────────────────────────── */
          ) : homeState === 'pending' ? (
            <div className="space-y-5">
              {/* Header acknowledging the wait */}
              <div className="pt-2">
                <h1
                  className="text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-slate-900 sm:text-[2rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  You are waiting to hear back from {activeApplications.length} crèche{activeApplications.length === 1 ? '' : 's'}.
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Most cr&egrave;ches respond within 3&ndash;5 days. We&rsquo;ll let you know the moment something changes.
                </p>
              </div>

              {/* One card per active application */}
              <div className="space-y-3">
                {activeApplications.map((app) => (
                  <SurfaceCard key={app.id} className="p-5">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{app.centreName}</h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {app.childName}
                        </p>
                      </div>

                      <p className="text-sm font-medium text-slate-700">
                        {statusToPlainEnglish(app.status)}
                      </p>

                      {/* Missing documents amber card */}
                      {app.missingDocuments.length > 0 ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <Upload className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-amber-900">
                              Documents needed
                            </p>
                            <p className="mt-1 text-sm text-amber-800">
                              {app.missingDocuments.slice(0, 3).map((item) => item.replaceAll('_', ' ')).join(', ')}
                            </p>
                            <Link
                              href="/parent/profile/documents"
                              className="mt-3 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                            >
                              Upload
                            </Link>
                          </div>
                        </div>
                      ) : null}

                      <p className="text-xs text-slate-400">
                        Updated {formatDate(app.lastUpdatedAt)}
                      </p>
                    </div>
                  </SurfaceCard>
                ))}
              </div>

              {/* Inbox card — only if unread */}
              {unreadNotifications.length > 0 ? (
                <SurfaceCard className="p-5">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-cyan-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        The crèche sent you {unreadNotifications.length === 1 ? 'a message' : `${unreadNotifications.length} messages`}
                      </p>
                    </div>
                    <Link
                      href="/parent/notifications"
                      className="shrink-0 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
                    >
                      Open
                    </Link>
                  </div>
                </SurfaceCard>
              ) : null}

              {/* Secondary browse link */}
              <div className="text-center">
                <Link
                  href="/parent/discover"
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                >
                  Browse more crèches
                </Link>
              </div>
            </div>

          /* ─────────────────────────────────────────────── */
          /* STATE: ENROLLED                                 */
          /* ─────────────────────────────────────────────── */
          ) : (
            <div className="space-y-5">
              {/* Header — window into the child's day */}
              <div className="pt-2">
                <h1
                  className="text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-slate-900 sm:text-[2rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Today, {getDayName()}.{' '}
                  <span className="text-slate-600">{enrolledChildName}&apos;s day at {enrolledCentreName}.</span>
                </h1>

                {/* Mood chips */}
                {moodChips.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moodChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Teacher's note */}
              <SurfaceCard className="p-5">
                {latestDailyUpdate?.teacherNotes ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      From {latestDailyUpdate.childName}&apos;s teacher
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {latestDailyUpdate.teacherNotes}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Today&apos;s report hasn&apos;t been posted yet. Check back after lunch.
                  </p>
                )}
              </SurfaceCard>

              {/* Pickup code */}
              <SurfaceCard className="border-2 border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-cyan-600" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={pickupHref}
                      className="text-base font-bold text-slate-900 hover:text-cyan-700"
                    >
                      View pickup code
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Show this at the gate when collecting {enrolledChildName}
                    </p>
                  </div>
                  <Link
                    href={pickupHref}
                    className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                  >
                    Open
                  </Link>
                </div>
              </SurfaceCard>

              {/* Next event */}
              {nextEvent ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-cyan-600" />
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{nextEvent.title}</span>
                    {' — '}
                    {formatDate(nextEvent.eventDate)}
                    {formatEventTime(nextEvent.startTime) ? ` at ${formatEventTime(nextEvent.startTime)}` : ''}
                  </p>
                </div>
              ) : null}

              {/* Message button */}
              <Link
                href="/parent/notifications"
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
              >
                <MessageSquare className="h-4 w-4" />
                Message {enrolledCentreName}
              </Link>

              {/* Divider + secondary links */}
              <div className="flex items-center gap-4 border-t border-slate-200 pt-4">
                <Link
                  href="/parent/daily-reports"
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                >
                  Past reports
                </Link>
                <span className="text-slate-300">·</span>
                <Link
                  href="/parent/discover"
                  className="text-sm font-medium text-slate-500 hover:text-cyan-600"
                >
                  Browse crèches
                </Link>
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
