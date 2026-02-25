import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ProfileCompleteness } from '@/components/ecd/TodayWidgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { cn, getJohannesburgNowParts, isSameJohannesburgDay } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Daily Operations - CentreConnect',
  description: 'Daily operations first: attendance, pickup security, and admissions inbox.',
}

type PendingApplicationRow = {
  id: string
  status: string
  submitted_at: string
  reviewed_at: string | null
}

type TransportConfigSnapshot = {
  offers_transport: boolean
  fee_per_month: number | null
  fee_description: string | null
  coverage_areas: string[] | null
  notes: string | null
}
function pct(part: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

function trendLabel(current: number, previous: number, period = 'vs last week') {
  const diff = current - previous
  if (diff > 0) return `+${diff} ${period}`
  if (diff < 0) return `${diff} ${period}`
  return `No change ${period}`
}

function trendTone(current: number, previous: number) {
  if (current > previous) return { arrow: '^', className: 'text-emerald-600' }
  if (current < previous) return { arrow: 'v', className: 'text-rose-600' }
  return { arrow: '-', className: 'text-slate-400' }
}

function TrendText({
  current,
  previous,
  period = 'vs last week',
}: {
  current: number
  previous: number
  period?: string
}) {
  const trend = trendTone(current, previous)
  return (
    <p className={`mt-1 text-[11px] font-semibold ${trend.className}`}>
      {trend.arrow} {trendLabel(current, previous, period)}
    </p>
  )
}

function formatTransportFee(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return 'Quote-based'
  return `R${(cents / 100).toFixed(0)} / month`
}

export default async function EcdDashboardPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('logo_url,cover_image_url,description,phone,address,suburb')
    .eq('id', ecdId)
    .maybeSingle()
  const nowJhb = getJohannesburgNowParts()
  const todayDate = `${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}`
  const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const previousMonthStartIso = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()

  const pendingQuery = supabase
    .from('applications')
    .select('id,status,submitted_at,reviewed_at')
    .eq('ecd_id', ecdId)
    .in('status', ['submitted', 'in_review', 'waitlisted'])
    .order('submitted_at', { ascending: true })
    .limit(30)

  const [
    pendingApplicationsResult,
    snapshotResult,
    transportResult,
    enrolledResult,
    revenueResult,
    staffResult,
    previousRevenueResult,
  ] = await Promise.all([
    pendingQuery,
    supabase.rpc('get_ecd_dashboard_snapshot', { p_ecd_id: ecdId, p_today: todayDate }),
    supabase
      .from('transport_configs')
      .select('offers_transport,fee_per_month,fee_description,coverage_areas,notes')
      .eq('ecd_id', ecdId)
      .maybeSingle(),
    supabase.from('applications').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId).eq('status', 'enrolled'),
    supabase.from('invoices').select('total').eq('ecd_id', ecdId).eq('status', 'paid').gte('paid_at', monthStartIso),
    supabase.from('ecd_admins').select('user_id', { count: 'exact', head: true }).eq('ecd_id', ecdId),
    supabase
      .from('invoices')
      .select('total')
      .eq('ecd_id', ecdId)
      .eq('status', 'paid')
      .gte('paid_at', previousMonthStartIso)
      .lt('paid_at', monthStartIso),
  ])
  const snapshot = (snapshotResult.data?.[0] ?? {}) as {
    submitted_count?: number
    in_review_count?: number
    waitlisted_count?: number
    attendance_today_count?: number
    picked_up_today_count?: number
    active_pickup_codes_count?: number
    admissions_current_7_count?: number
    admissions_previous_7_count?: number
    attendance_current_7_count?: number
    attendance_previous_7_count?: number
    unverified_guardians_count?: number
  }
  const transportConfig = (transportResult.data ?? null) as TransportConfigSnapshot | null
  const enrolledCount = enrolledResult.count ?? 0
  const revenueThisMonth = (revenueResult.data ?? []).reduce((sum, inv) => sum + Number(inv.total), 0)
  const revenuePreviousMonth = (previousRevenueResult.data ?? []).reduce((sum, inv) => sum + Number(inv.total), 0)
  const staffCount = staffResult.count ?? 0

  const applications = (pendingApplicationsResult.data ?? []) as PendingApplicationRow[]
  const nowTs = Date.now()
  const stale24h = applications.filter((app) => {
    if (!['submitted', 'in_review'].includes(app.status)) return false
    return nowTs - new Date(app.submitted_at).getTime() > 24 * 60 * 60 * 1000
  }).length
  const stale72h = applications.filter((app) => {
    if (!['submitted', 'in_review'].includes(app.status)) return false
    return nowTs - new Date(app.submitted_at).getTime() > 72 * 60 * 60 * 1000
  }).length

  const submittedCount = snapshot.submitted_count ?? 0
  const inReviewCount = snapshot.in_review_count ?? 0
  const waitlistedApplications = snapshot.waitlisted_count ?? 0
  const attendanceToday = snapshot.attendance_today_count ?? 0
  const pickedUpToday = snapshot.picked_up_today_count ?? 0
  const activePickupCodes = snapshot.active_pickup_codes_count ?? 0
  const unverifiedGuardians = snapshot.unverified_guardians_count ?? 0
  const pendingApplications = submittedCount + inReviewCount
  const pickupCompletionPct = pct(pickedUpToday, attendanceToday)
  const pickupOutstanding = Math.max(0, attendanceToday - pickedUpToday)
  const admissionsCurrent7 = snapshot.admissions_current_7_count ?? 0
  const admissionsPrevious7 = snapshot.admissions_previous_7_count ?? 0
  const attendanceCurrent7 = snapshot.attendance_current_7_count ?? 0
  const attendancePrevious7 = snapshot.attendance_previous_7_count ?? 0

  const newToday = applications?.filter(
    (a) => isSameJohannesburgDay(a.submitted_at)
  ).length ?? 0

  const reviewedApps = applications?.filter((a) => a.reviewed_at) ?? []
  const avgResponseHours = reviewedApps.length > 0
    ? Math.round(reviewedApps.reduce((sum, a) => {
        return sum + (new Date(a.reviewed_at as string).getTime() - new Date(a.submitted_at).getTime()) / 3600000
      }, 0) / reviewedApps.length)
    : 0

  const profileItems = [
    { id: 'logo', label: 'Upload centre logo', done: !!centre?.logo_url, href: '/ecd/website' },
    { id: 'cover', label: 'Add cover photo', done: !!centre?.cover_image_url, href: '/ecd/website' },
    { id: 'desc', label: 'Write centre bio', done: !!centre?.description, href: '/ecd/website' },
    { id: 'phone', label: 'Add phone number', done: !!centre?.phone, href: '/ecd/profile' },
    { id: 'address', label: 'Complete address', done: !!(centre?.address && centre?.suburb), href: '/ecd/profile' },
  ]
  const profileDone = profileItems.filter((item) => item.done).length
  const profilePct = pct(profileDone, profileItems.length)
  const recommendationItems = [
    stale72h > 0
      ? {
          id: 'sla-critical',
          label: `${stale72h} applications older than 72h`,
          detail: 'Prioritize these first to reduce parent churn risk.',
          href: '/ecd/applications?tab=pending',
          level: 'critical' as const,
        }
      : null,
    stale24h > 0
      ? {
          id: 'sla-warning',
          label: `${stale24h} applications older than 24h`,
          detail: 'Respond today to keep response-time metrics healthy.',
          href: '/ecd/applications?tab=pending',
          level: 'warning' as const,
        }
      : null,
    unverifiedGuardians > 0
      ? {
          id: 'guardian-verification',
          label: `${unverifiedGuardians} unverified guardian records`,
          detail: 'Verification reduces pickup-day friction and risk.',
          href: '/ecd/profile',
          level: 'warning' as const,
        }
      : null,
    profilePct < 100
      ? {
          id: 'profile-readiness',
          label: `Profile completeness is ${profilePct}%`,
          detail: 'Complete profile details to improve parent conversion.',
          href: '/ecd/website',
          level: 'info' as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string
    label: string
    detail: string
    href: string
    level: 'critical' | 'warning' | 'info'
  }>
  const topActions = recommendationItems.slice(0, 3)

  return (
    <EcdOsShell
      title="Daily Operations"
      description="Attendance, pickup flow, and admissions in one operational view."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <div className="space-y-6">
        <Card className="glass-card border border-border bg-card/95 shadow-[var(--shadow-elevation-4)] text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Top 3 Actions Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topActions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-3 text-sm text-slate-300">
              No urgent blockers right now. Keep admissions moving and monitor pickup completion.
            </div>
            ) : (
              topActions.map((item, index) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card/80 p-3 text-foreground transition-colors hover:border-cyan-500/30 hover:bg-white/10"
                >
                  <span
                  className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-foreground ${
                      item.level === 'critical' ? 'bg-rose-600' : item.level === 'warning' ? 'bg-amber-600' : 'bg-cyan-700'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </Link>
              ))
            )}
            <p className="text-xs text-muted-foreground">
              Good {nowJhb.hour < 12 ? 'morning' : 'afternoon'}. You have {pendingApplications} admissions to work through and{' '}
              {pickupOutstanding} children still pending pickup today.
            </p>
          </CardContent>
        </Card>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Card className="glass-card rounded-2xl border border-border bg-card/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolled</p>
            <p className="mt-2 text-3xl font-black text-cyan-700">{enrolledCount}</p>
            <p className="text-xs text-slate-500">Active children</p>
            <TrendText current={enrolledCount} previous={enrolledCount} />
          </Card>
          <Card className="glass-card rounded-2xl border border-border bg-card/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">R{revenueThisMonth.toLocaleString()}</p>
            <p className="text-xs text-slate-500">This month paid</p>
            <TrendText current={revenueThisMonth} previous={revenuePreviousMonth} period="vs last month" />
          </Card>
          <Card className="glass-card rounded-2xl border border-border bg-card/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</p>
            <p className="mt-2 text-3xl font-black text-foreground">{staffCount}</p>
            <p className="text-xs text-slate-500">Team members</p>
            <TrendText current={staffCount} previous={staffCount} />
          </Card>
          <Card className="glass-card rounded-2xl border border-border bg-card/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{attendanceCurrent7}</p>
            <p className="text-xs text-slate-500">Logs this week</p>
            <TrendText current={attendanceCurrent7} previous={attendancePrevious7} />
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="glass-card border border-border bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">New Admissions (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-cyan-700">{admissionsCurrent7}</p>
              <TrendText current={admissionsCurrent7} previous={admissionsPrevious7} />
            </CardContent>
          </Card>
          <Card className="glass-card border border-border bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Attendance Logged (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-emerald-700">{attendanceCurrent7}</p>
              <TrendText current={attendanceCurrent7} previous={attendancePrevious7} />
            </CardContent>
          </Card>
          <Card className="glass-card border border-border bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Pickup Completion Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-amber-300">{pickupCompletionPct}%</p>
              <p className="text-xs text-slate-400">
                {pickedUpToday}/{attendanceToday} picked up, {activePickupCodes} active codes
              </p>
              <TrendText current={pickupCompletionPct} previous={pickupCompletionPct} period="today" />
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border border-border bg-card/90 text-foreground">
          <CardHeader>
            <CardTitle>Transport Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Status:</span>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  transportConfig?.offers_transport
                    ? 'bg-emerald-600/20 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                )}
              >
                {transportConfig?.offers_transport ? 'Active transport' : 'Not yet configured'}
              </span>
            </div>
            <p className="text-base font-semibold text-foreground">
              {formatTransportFee(transportConfig?.fee_per_month)}
            </p>
            <p className="text-sm text-muted-foreground">
              {transportConfig?.fee_description ?? 'Publish a transparent monthly fee or keep it quote-based.'}
            </p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coverage areas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {transportConfig?.coverage_areas?.length ? (
                  transportConfig.coverage_areas.map((area: string) => (
                    <span key={area} className="rounded-full bg-white/10 px-3 py-1 text-xs text-foreground">
                      {area}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Define suburbs or zones so parents know if you cover their route.</span>
                )}
              </div>
            </div>
            {transportConfig?.notes ? (
              <p className="text-xs text-muted-foreground">{transportConfig.notes}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link href="/ecd/transport">Open Transport Desk</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/ecd/communications">Message drivers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card className="glass-card border border-border bg-card/90 text-foreground">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>Admissions at a Glance</CardTitle>
                    <Link href="/ecd/applications" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600">
                      View All
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-card/80 p-3 text-center">
                      <p className="text-2xl font-black text-foreground">{submittedCount}</p>
                      <p className="text-xs font-semibold text-slate-500">New</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                      <p className="text-2xl font-black text-amber-700">{inReviewCount}</p>
                      <p className="text-xs font-semibold text-amber-700">In Review</p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                      <p className="text-2xl font-black text-rose-700">{stale24h}</p>
                      <p className="text-xs font-semibold text-rose-700">Waiting over 24h</p>
                    </div>
                  </div>
                  {stale72h > 0 ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      {stale72h} applications are waiting longer than 72h and need urgent review.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          <div>
            <ProfileCompleteness items={profileItems} />
            <Card className="mt-4 glass-card border border-border bg-card/90 text-foreground">
              <CardHeader>
                <CardTitle>Operational Scorecard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-card/80 p-3 text-center">
                    <p className="text-2xl font-black text-cyan-700">{avgResponseHours}h</p>
                    <p className="text-xs font-semibold text-slate-500">Avg Response</p>
                    <TrendText current={avgResponseHours} previous={avgResponseHours} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/80 p-3 text-center">
                    <p className="text-2xl font-black text-foreground">{newToday}</p>
                    <p className="text-xs font-semibold text-slate-500">New Today</p>
                    <TrendText current={newToday} previous={newToday} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/80 p-3 text-center">
                    <p className="text-2xl font-black text-amber-700">{waitlistedApplications}</p>
                    <p className="text-xs font-semibold text-slate-500">Waitlisted</p>
                    <TrendText current={waitlistedApplications} previous={waitlistedApplications} />
                  </div>
                  <div className="rounded-xl border border-border bg-card/80 p-3 text-center">
                    <p className="text-2xl font-black text-rose-700">{unverifiedGuardians}</p>
                    <p className="text-xs font-semibold text-slate-500">Unverified</p>
                    <TrendText current={unverifiedGuardians} previous={unverifiedGuardians} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EcdOsShell>
  )
}



