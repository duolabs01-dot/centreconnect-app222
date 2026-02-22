import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ProfileCompleteness } from '@/components/ecd/TodayWidgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, formatDate, getJohannesburgNowParts, isSameJohannesburgDay } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Daily Operations - CentreConnect',
  description: 'Daily operations first: attendance, pickup security, and admissions inbox.',
}

type DashboardPageProps = {
  searchParams?: {
    status?: string
    q?: string
  }
}

type PendingApplicationRow = {
  id: string
  application_number: string
  status: string
  submitted_at: string
  reviewed_at: string | null
  children:
    | { first_name: string; last_name: string }
    | Array<{ first_name: string; last_name: string }>
    | null
  parents:
    | {
        user_profiles:
          | { full_name: string | null }
          | Array<{ full_name: string | null }>
          | null
      }
    | Array<{
        user_profiles:
          | { full_name: string | null }
          | Array<{ full_name: string | null }>
          | null
      }>
    | null
}

type TransportConfigSnapshot = {
  offers_transport: boolean
  fee_per_month: number | null
  fee_description: string | null
  coverage_areas: string[] | null
  notes: string | null
}
function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function pct(part: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

function trendLabel(current: number, previous: number) {
  const diff = current - previous
  if (diff > 0) return `+${diff} vs last week`
  if (diff < 0) return `${diff} vs last week`
  return 'No change vs last week'
}

function formatTransportFee(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return 'Quote-based'
  return `R${(cents / 100).toFixed(0)} / month`
}

export default async function EcdDashboardPage({ searchParams }: DashboardPageProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('logo_url,cover_image_url,description,phone,address,suburb')
    .eq('id', ecdId)
    .maybeSingle()
  const selectedStatus = ['submitted', 'in_review', 'waitlisted'].includes(searchParams?.status ?? '')
    ? (searchParams?.status as 'submitted' | 'in_review' | 'waitlisted')
    : 'all'
  const searchText = (searchParams?.q ?? '').trim().toLowerCase()
  const nowJhb = getJohannesburgNowParts()
  const todayDate = `${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}`

  let pendingQuery = supabase
    .from('applications')
    .select(
      'id,application_number,status,submitted_at,reviewed_at,children(first_name,last_name),parents(user_profiles(full_name))'
    )
    .eq('ecd_id', ecdId)
    .in('status', ['submitted', 'in_review', 'waitlisted'])
    .order('submitted_at', { ascending: true })
    .limit(30)

  if (selectedStatus !== 'all') {
    pendingQuery = pendingQuery.eq('status', selectedStatus)
  }

  const [
    pendingApplicationsResult,
    snapshotResult,
    transportResult,
  ] = await Promise.all([
    pendingQuery,
    supabase.rpc('get_ecd_dashboard_snapshot', { p_ecd_id: ecdId, p_today: todayDate }),
    supabase
      .from('transport_configs')
      .select('offers_transport,fee_per_month,fee_description,coverage_areas,notes')
      .eq('ecd_id', ecdId)
      .maybeSingle(),
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

  const filteredPendingApplications = applications.filter((app) => {
    if (!searchText) return true
    const child = normalizeOne(app.children)
    const parent = normalizeOne(app.parents)
    const parentProfile = normalizeOne(parent?.user_profiles ?? null)
    const haystack = [
      app.application_number,
      app.status,
      child?.first_name,
      child?.last_name,
      parentProfile?.full_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchText)
  })

  return (
    <EcdOsShell
      title="Daily Operations"
      description="Attendance, pickup flow, and admissions in one operational view."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <div className="space-y-6">
        <Card className="glass border border-border bg-card/95 shadow-2xl text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Top 3 Actions Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topActions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="glass border border-border bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">New Admissions (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-cyan-300">{admissionsCurrent7}</p>
              <p className="text-xs text-slate-400">{trendLabel(admissionsCurrent7, admissionsPrevious7)}</p>
            </CardContent>
          </Card>
          <Card className="glass border border-border bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Attendance Logged (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-emerald-300">{attendanceCurrent7}</p>
              <p className="text-xs text-slate-400">{trendLabel(attendanceCurrent7, attendancePrevious7)}</p>
            </CardContent>
          </Card>
          <Card className="glass border border-border bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Pickup Completion Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-amber-300">{pickupCompletionPct}%</p>
              <p className="text-xs text-slate-400">
                {pickedUpToday}/{attendanceToday} picked up, {activePickupCodes} active codes
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass border border-border bg-card/90 text-foreground">
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
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'bg-amber-600/20 text-amber-300'
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
              <Card className="glass border border-border bg-card/90 text-foreground">
                <CardHeader>
                  <CardTitle>Applications Needing Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <form method="get" action="/ecd/dashboard" className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <Input
                      name="q"
                      defaultValue={searchParams?.q ?? ''}
                      placeholder="Search by child, parent, or application number"
                      className="bg-background border-border text-foreground"
                    />
                    <select
                      name="status"
                      defaultValue={selectedStatus}
                      className="cc-native-field bg-background border-border text-foreground"
                    >
                      <option value="all">All statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="in_review">In Review</option>
                      <option value="waitlisted">Waitlisted</option>
                    </select>
                    <Button type="submit" className="bg-cyan-600 text-white hover:bg-cyan-500">
                      Apply
                    </Button>
                  </form>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-200">
                      Submitted: {submittedCount}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                      In Review: {inReviewCount}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-amber-200">
                      Waitlisted: {waitlistedApplications}
                    </span>
                  </div>

                  {filteredPendingApplications.length === 0 ? (
                    <EmptyState
                      title="No applications needing action"
                      description="Start by checking new applications or ask parents to submit directly from their side."
                      actionLabel="Open Applications"
                      actionHref="/ecd/applications"
                      checklist={[
                        'Invite parents to apply from their own accounts for accurate details.',
                        'Confirm centre profile and contact details are complete.',
                        'Check again after new submissions arrive.',
                      ]}
                    />
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card/80">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Application</TableHead>
                            <TableHead>Child</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPendingApplications.map((application) => {
                            const child = normalizeOne(application.children)
                            const parent = normalizeOne(application.parents)
                            const parentProfile = normalizeOne(parent?.user_profiles ?? null)
                            return (
                              <TableRow key={application.id}>
                                <TableCell className="font-medium text-foreground">{application.application_number}</TableCell>
                                <TableCell className="text-slate-200">
                                  {child ? `${child.first_name} ${child.last_name}` : 'Unknown child'}
                                </TableCell>
                                <TableCell className="text-slate-200">{parentProfile?.full_name ?? 'Unknown parent'}</TableCell>
                                <TableCell>
                                  <StatusBadge status={application.status} />
                                </TableCell>
                                <TableCell className="text-slate-200">{formatDate(application.submitted_at)}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={`/ecd/applications/${application.id}`}>Review</Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          <div>
            <ProfileCompleteness items={profileItems} />
            <Card className="mt-4 glass border border-border bg-card/90 text-foreground">
              <CardHeader>
                <CardTitle>Operational Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <p>
                  Avg response time:{' '}
                  <span className="font-semibold text-cyan-300">{avgResponseHours}h</span>
                </p>
                <p>
                  New applications today:{' '}
                  <span className="font-semibold text-cyan-300">{newToday}</span>
                </p>
                <p>
                  Waitlisted:{' '}
                  <span className="font-semibold text-cyan-300">{waitlistedApplications}</span>
                </p>
                <p>
                  Unverified guardians:{' '}
                  <span className="font-semibold text-cyan-300">{unverifiedGuardians}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EcdOsShell>
  )
}
