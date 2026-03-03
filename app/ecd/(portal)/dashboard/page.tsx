import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ProfileCompleteness } from '@/components/ecd/TodayWidgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, getJohannesburgNowParts, isSameJohannesburgDay, getJohannesburgGreeting } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { StatCard } from '@/components/ui/StatCard'
import { Users, TrendingUp, UserCheck, ShieldAlert, Zap, ChevronRight } from 'lucide-react'

export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
  const { supabase, ecdId } = await requireEcdPortalSession()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()
  const centreName = centre?.name ?? "Crèche"

  return {
    title: `${centreName} Command Crèche | CentreConnect`,
    description: 'Attendance, security protocols, and admissions pipeline management.',
  }
}

type PendingApplicationRow = {
  id: string
  status: string
  submitted_at: string
  reviewed_at: string | null
}

function pct(part: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

export default async function EcdDashboardPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('name,logo_url,cover_image_url,description,phone,address,suburb')
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
    enrolledResult,
    revenueResult,
    staffResult,
    previousRevenueResult,
  ] = await Promise.all([
    pendingQuery,
    supabase.rpc('get_ecd_dashboard_snapshot', { p_ecd_id: ecdId, p_today: todayDate }),
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
  const unverifiedGuardians = snapshot.unverified_guardians_count ?? 0
  const pendingApplications = submittedCount + inReviewCount
  const attendanceCurrent7 = snapshot.attendance_current_7_count ?? 0

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
    { id: 'logo', label: 'Upload crèche logo', done: !!centre?.logo_url, href: '/ecd/website' },
    { id: 'cover', label: 'Add cover photo', done: !!centre?.cover_image_url, href: '/ecd/website' },
    { id: 'desc', label: 'Write crèche bio', done: !!centre?.description, href: '/ecd/website' },
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
  const revenueChangePct = revenuePreviousMonth > 0
    ? `${Math.abs(Math.round((revenueChange / revenuePreviousMonth) * 100))}%`
    : '0%'

  const centreName = centre?.name ?? "Your Crèche"

  return (
    <EcdOsShell
      title={`${centreName} Command Crèche`}
      description="Operational overview: security, attendance and admissions."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <div className="space-y-8 pb-12">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card px-8 py-10 text-foreground shadow-[var(--shadow-elevation-1)]">
          <div className="absolute right-0 top-0 h-64 w-64 -mr-32 -mt-32 bg-teal-500/10" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-400">
              {getJohannesburgGreeting()}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {centreName}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-sm font-bold text-slate-600">{attendanceToday} Children In Today</p>
              </div>
              <div className="hidden h-4 w-px bg-border sm:block" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-400" />
                <p className="text-sm font-bold text-slate-600">{pendingApplications} Applications Pending</p>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Action Hub */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Attendance', icon: UserCheck, href: '/ecd/attendance', color: 'bg-teal-50 text-teal-700 border-teal-100', desc: 'Sign-in/out' },
            { label: 'Security', icon: ShieldAlert, href: '/ecd/pickup', color: 'bg-rose-50 text-rose-700 border-rose-100', desc: 'Verify pickups' },
            { label: 'Pipeline', icon: TrendingUp, href: '/ecd/applications', color: 'bg-blue-50 text-blue-700 border-blue-100', desc: 'New admissions' },
            { label: 'Reports', icon: Zap, href: '/ecd/daily-reports', color: 'bg-amber-50 text-amber-700 border-amber-100', desc: 'Parent updates' },
          ].map(act => (
            <Link
              key={act.label}
              href={act.href}
              className="tile group transition-colors duration-200"
            >
              <Card className={cn("h-full rounded-[2rem] border-none shadow-sm transition-shadow duration-200 group-hover:shadow-md", act.color)}>
                <CardContent className="p-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm transition-colors">
                    <act.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest">{act.label}</p>
                  <p className="mt-1 text-[10px] font-bold opacity-60 uppercase tracking-tight">{act.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {applications.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 flex items-center justify-between gap-6 shadow-sm">
            <div>
              <p className="text-lg font-black text-amber-900 leading-tight">
                {applications.length} Inbox Item{applications.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-700 font-bold mt-1">
                {stale24h > 0 ? `${stale24h} waiting more than 24 hours.` : 'All enquiries are fresh.'}
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-lg shadow-amber-900/20">
              <Link href="/ecd/applications">Process Now</Link>
            </Button>
          </div>
        )}

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <CardTitle className="text-slate-900 flex items-center gap-3 text-lg font-black uppercase tracking-wider">
              <Zap className="w-5 h-5 text-teal-600" />
              Critical Protocol List
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topActions.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center text-slate-500 font-bold italic">
                All operational protocols are green. No urgent blockers.
              </div>
            ) : (
              topActions.map((item, index) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="tile group flex items-center gap-5 rounded-2xl border border-slate-50 bg-white p-5 text-slate-900 transition-colors duration-200 hover:border-teal-100 hover:bg-teal-50/30"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-sm",
                      item.level === 'critical' ? 'bg-rose-100 text-rose-700' :
                        item.level === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-teal-100 text-teal-700'
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black group-hover:text-teal-900 transition-colors tracking-tight">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500 font-medium leading-relaxed">{item.detail}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 transition-colors" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            title="Enrolled"
            value={enrolledCount}
            helper="Active students"
          />
          <StatCard
            title="Revenue"
            value={`R${revenueThisMonth.toLocaleString()}`}
            helper={`${revenueChangePct} vs last month`}
          />
          <StatCard
            title="Staff"
            value={staffCount}
            helper="Active personnel"
          />
          <StatCard
            title="Engagement"
            value={`${attendanceCurrent7}`}
            helper="7-day attendance"
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Card className="shadow-sm border-none rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-8 py-6">
                <CardTitle className="text-slate-900 font-black uppercase tracking-widest text-sm">Admissions Pipeline</CardTitle>
                <Link href="/ecd/applications" className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 transition-colors">
                  Full Pipeline &rarr;
                </Link>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 text-center shadow-inner">
                    <p className="text-4xl font-black text-slate-900">{submittedCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mt-2">New</p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-teal-50/40 border border-teal-100 text-center shadow-inner">
                    <p className="text-4xl font-black text-teal-700">{inReviewCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-600/60 mt-2">Review</p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-rose-50/50 border border-rose-100 text-center shadow-inner">
                    <p className="text-4xl font-black text-rose-600">{stale24h}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500/60 mt-2">Stale</p>
                  </div>
                </div>
                {stale72h > 0 && (
                  <div className="flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-800 shadow-[var(--shadow-elevation-1)]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                    </div>
                    <span>{stale72h} applications require immediate attention (72h SLA breach)</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <ProfileCompleteness items={profileItems} />
            <Card className="shadow-sm border-none rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 px-8 py-6">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent className="p-8 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-3xl font-black text-teal-600">{avgResponseHours}h</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Avg Response</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-slate-900">{newToday}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">New Today</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-amber-600">{waitlistedApplications}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Waitlisted</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-rose-600">{unverifiedGuardians}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Unverified</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EcdOsShell>
  )
}



