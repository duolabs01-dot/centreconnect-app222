import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ProfileCompleteness } from '@/components/ecd/TodayWidgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { cn, getJohannesburgNowParts, isSameJohannesburgDay } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { AdminStatCard } from '@/components/ui/admin-stat-card'
import { Users, TrendingUp, UserCheck, ShieldAlert, Truck, Info, Zap, ChevronRight } from 'lucide-react'

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

  const revenueChange = revenueThisMonth - revenuePreviousMonth
  const revenueTrend = revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral'
  const revenueChangePct = revenuePreviousMonth > 0 
    ? `${Math.abs(Math.round((revenueChange / revenuePreviousMonth) * 100))}%`
    : '0%'

  return (
    <EcdOsShell
      title="Daily Operations"
      description="Attendance, pickup flow, and admissions in one operational view."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <div className="space-y-6">
        <Card className="admin-card border-t-4 border-t-admin-accent overflow-hidden">
          <CardHeader className="bg-admin-surface-hover/50 pb-4">
            <CardTitle className="text-admin-text flex items-center gap-2">
              <Zap className="w-5 h-5 text-admin-accent" />
              Critical Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {topActions.length === 0 ? (
            <div className="rounded-xl border border-admin-border bg-admin-bg p-4 text-sm text-admin-text-muted">
              No urgent blockers right now. Keep admissions moving and monitor pickup completion.
            </div>
            ) : (
              topActions.map((item, index) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 rounded-xl border border-admin-border bg-admin-bg p-4 text-admin-text transition-all hover:border-admin-accent/50 hover:bg-admin-surface-hover group"
                >
                  <span
                  className={cn(
                    "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black",
                    item.level === 'critical' ? 'bg-admin-danger text-white' : 
                    item.level === 'warning' ? 'bg-admin-warning text-black' : 
                    'bg-admin-accent text-black'
                  )}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold group-hover:text-admin-accent transition-colors">{item.label}</p>
                    <p className="mt-1 text-xs text-admin-text-muted leading-relaxed">{item.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-admin-border group-hover:text-admin-accent" />
                </Link>
              ))
            )}
            <div className="mt-4 pt-4 border-t border-admin-border flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-admin-text-muted">
                Pulse: {pendingApplications} pending • {pickupOutstanding} remaining
              </p>
              <p className="text-[11px] font-bold text-admin-text-muted">
                Good {nowJhb.hour < 12 ? 'morning' : 'afternoon'}
              </p>
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <AdminStatCard
            label="Enrolled"
            value={enrolledCount}
            icon={<Users className="w-4 h-4" />}
            className="border-t-admin-accent"
          />
          <AdminStatCard
            label="Revenue"
            value={`R${revenueThisMonth.toLocaleString()}`}
            change={`${revenueChangePct} vs last month`}
            trend={revenueTrend as any}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <AdminStatCard
            label="Staff"
            value={staffCount}
            icon={<UserCheck className="w-4 h-4" />}
          />
          <AdminStatCard
            label="Attendance"
            value={attendanceCurrent7}
            icon={<ShieldAlert className="w-4 h-4" />}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-admin-text-muted">New Admissions (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-admin-text">{admissionsCurrent7}</p>
              <p className="mt-2 text-xs font-bold text-admin-accent flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {admissionsCurrent7 - admissionsPrevious7} from previous week
              </p>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-admin-text-muted">Attendance (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-admin-text">{attendanceCurrent7}</p>
              <p className="mt-2 text-xs font-bold text-admin-success">
                Healthy engagement
              </p>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-admin-text-muted">Pickup Rate Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-admin-accent">{pickupCompletionPct}%</p>
              <p className="mt-2 text-xs font-bold text-admin-text-muted">
                {pickedUpToday}/{attendanceToday} completed
              </p>
            </CardContent>
          </Card>
        </div>

        {transportConfig?.offers_transport ? (
          <Card className="admin-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-admin-text flex items-center gap-2">
                <Truck className="w-5 h-5 text-admin-accent" />
                Transport Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-admin-bg border border-admin-border">
                <div>
                  <p className="text-xl font-bold text-admin-text">{formatTransportFee(transportConfig?.fee_per_month)}</p>
                  <p className="text-xs text-admin-text-muted mt-1">{transportConfig?.fee_description}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-admin-accent-glow text-admin-accent text-[10px] font-black uppercase tracking-widest">
                  Active
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-admin-text-muted mb-2">Coverage</p>
                  <div className="flex flex-wrap gap-2">
                    {transportConfig?.coverage_areas?.map((area: string) => (
                      <span key={area} className="px-2 py-1 rounded-md bg-admin-surface-hover text-admin-text text-xs border border-admin-border">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <Button asChild className="admin-button-primary w-full h-11">
                    <Link href="/ecd/transport">Transport Desk</Link>
                  </Button>
                  <Button variant="outline" asChild className="border-admin-border text-admin-text hover:bg-admin-surface-hover h-11 rounded-xl font-bold">
                    <Link href="/ecd/communications">Message Drivers</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="admin-card p-6 flex items-center justify-between bg-gradient-to-r from-admin-surface to-admin-bg">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-admin-accent-glow flex items-center justify-center">
                <Info className="w-6 h-6 text-admin-accent" />
              </div>
              <div>
                <p className="text-base font-bold text-admin-text">Transport setup pending</p>
                <p className="text-xs text-admin-text-muted">Set up routes and drivers to start tracking pickups.</p>
              </div>
            </div>
            <Button asChild className="admin-button-primary h-11 px-6">
              <Link href="/ecd/transport">Configure Now</Link>
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className="admin-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-admin-border pb-4">
                <CardTitle className="text-admin-text">Admissions Pipeline</CardTitle>
                <Link href="/ecd/applications" className="text-[10px] font-black uppercase tracking-widest text-admin-accent hover:text-admin-accent-hover">
                  Full Pipeline →
                </Link>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-admin-bg border border-admin-border text-center">
                    <p className="text-3xl font-black text-admin-text">{submittedCount}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-admin-text-muted mt-1">New</p>
                  </div>
                  <div className="p-4 rounded-xl bg-admin-bg border border-admin-accent/20 text-center">
                    <p className="text-3xl font-black text-admin-accent">{inReviewCount}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-admin-accent/60 mt-1">Review</p>
                  </div>
                  <div className="p-4 rounded-xl bg-admin-danger/5 border border-admin-danger/20 text-center">
                    <p className="text-3xl font-black text-admin-danger">{stale24h}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-admin-danger/60 mt-1">Stale</p>
                  </div>
                </div>
                {stale72h > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-admin-danger text-black font-bold text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{stale72h} applications require immediate attention (over 72h)</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <ProfileCompleteness items={profileItems} />
            <Card className="admin-card">
              <CardHeader className="border-b border-admin-border pb-4">
                <CardTitle className="text-sm font-bold text-admin-text uppercase tracking-widest">Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-admin-accent">{avgResponseHours}h</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-admin-text-muted">Avg Response</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-admin-text">{newToday}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-admin-text-muted">New Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-admin-warning">{waitlistedApplications}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-admin-text-muted">Waitlisted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-admin-danger">{unverifiedGuardians}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-admin-text-muted">Unverified</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EcdOsShell>
  )
}
