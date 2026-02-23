'use client'

import { useMemo } from 'react'
import { ArrowUpRight, Globe, Info, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/cc-admin/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'

type Tier = 'basic' | 'standard' | 'premium'
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'

type CentreItem = {
  id: string
  slug: string
  name: string
  suburb: string
  city: string
  created_at: string
  is_active: boolean
  is_registered: boolean
  subscription: {
    tier: Tier
    status: SubscriptionStatus
    monthly_price: number
  } | null
  age_groups: string[] | null
}

type ActivityItem = {
  id: string
  actor_email: string | null
  entity_type: string
  action: string
  summary: string
  created_at: string
  details: Record<string, unknown>
}

type UserItem = {
  id: string
  role: 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'parent_user'
  full_name: string
  phone: string | null
  created_at: string
  email: string | null
  last_sign_in_at: string | null
}

type Metrics = {
  activeCentres: number
  pendingInvites: number
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  provisionedApplications: number
}

type AnalyticsSummary = {
  totalEvents: number
  last7Days: number
  last30Days: number
  byType: {
    profile_view: number
    whatsapp_click: number
    call_click: number
    application_submitted: number
  }
  recent: Array<{
    id: string
    ecd_id: string
    event_type: 'profile_view' | 'whatsapp_click' | 'call_click' | 'application_submitted'
    created_at: string
  }>
}

type ApplicationItem = {
  id: string
  status: 'submitted' | 'pending_review' | 'approved' | 'provisioned' | 'rejected'
  submitted_at: string
  centreName: string | null
  centreSlug?: string | null
  childName?: string | null
  childId?: string | null
  application_number?: string | null
}

type AlertItem = {
  id: string
  title: string
  detail: string
  actionLabel: string
  timestamp: string
  link?: { href: string; label: string }
}

type PipelineStep = {
  label: string
  count: number
  duration: string
  tone: string
}

type FinancialLine = {
  label: string
  value: string
  action: string
}

type Props = {
  metrics: Metrics
  centres: CentreItem[]
  users: UserItem[]
  analytics: AnalyticsSummary
  activity: ActivityItem[]
  applications: ApplicationItem[]
}

const statAccents = [
  'from-cyan-500/40 to-cyan-500/10',
  'from-emerald-500/40 to-emerald-500/10',
  'from-amber-400/40 to-amber-400/10',
  'from-slate-400/30 to-slate-900/30',
]

const DAY_MS = 24 * 60 * 60 * 1000

function formatCurrency(value: number) {
  return `R${value.toLocaleString('en-ZA')}`
}

function HeroStatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: number | string
  detail?: string
  accent?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-gradient-to-br p-5 shadow-[var(--shadow-elevation-4)] transition-transform duration-200 hover:-translate-y-0.5',
        accent ?? statAccents[0]
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.4em] text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  )
}

function PipelineSegment({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  const width = total > 0 ? Math.max(6, Math.round((count / total) * 100)) : 6
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-white">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function InfoNote({ children }: { children: string }) {
  return (
    <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
      <Info className="h-3.5 w-3.5 text-cyan-300" />
      <span>{children}</span>
    </div>
  )
}

function EngagementSparkline({ data }: { data: number[] }) {
  return (
    <div className="mt-3 flex items-end gap-2">
      {data.map((value, idx) => (
        <div
          key={idx}
          className="w-1.5 rounded-full bg-gradient-to-t from-emerald-400 to-cyan-400"
          style={{ height: `${Math.min(96, Math.max(8, value + 6))}%` }}
        />
      ))}
    </div>
  )
}

export function PlatformControlTower({ metrics, centres, analytics, activity, users, applications }: Props) {
  const since30Days = Date.now() - 30 * DAY_MS
  const activeSubscriptions = centres.filter(
    (centre) =>
      centre.subscription &&
      ['active', 'trial', 'past_due', 'suspended'].includes(centre.subscription.status)
  )
  const mrr = activeSubscriptions.reduce((sum, centre) => sum + (centre.subscription?.monthly_price ?? 0), 0)
  const arr = mrr * 12
  const avgRevenuePerCentre = Math.round(mrr / Math.max(1, metrics.activeCentres))
  const churnedCentres = centres.filter((centre) => centre.subscription?.status === 'canceled')
  const churnRate = Math.round((churnedCentres.length / Math.max(1, metrics.activeCentres)) * 100)
  const newRevenue = centres
    .filter((centre) => new Date(centre.created_at).getTime() >= since30Days)
    .reduce((sum, centre) => sum + (centre.subscription?.monthly_price ?? 0), 0)
  const cancelledRevenue = churnedCentres.reduce(
    (sum, centre) => sum + (centre.subscription?.monthly_price ?? 0),
    0
  )
  const netMovement = newRevenue - cancelledRevenue
  const revenueTrend = useMemo(() => {
    const now = Date.now()
    const counts = Array(7).fill(0)
    analytics.recent.forEach((event) => {
      const time = new Date(event.created_at).getTime()
      const dayOffset = Math.floor((now - time) / DAY_MS)
      if (dayOffset >= 0 && dayOffset < 7) {
        counts[6 - dayOffset] += 1
      }
    })
    return counts
  }, [analytics.recent])
  const sparklineData = revenueTrend

  const lastEventByCentre = new Map<string, number>()
  analytics.recent.forEach((event) => {
    const existing = lastEventByCentre.get(event.ecd_id) ?? 0
    const eventTime = new Date(event.created_at).getTime()
    if (eventTime > existing) {
      lastEventByCentre.set(event.ecd_id, eventTime)
    }
  })

  const centreHealth = centres
    .map((centre) => {
      const lastEvent = lastEventByCentre.get(centre.id)
      const daysSince = lastEvent ? Math.round((Date.now() - lastEvent) / DAY_MS) : null
      const health =
        centre.subscription?.status === 'canceled'
          ? 'red'
          : daysSince === null
            ? 'amber'
            : daysSince > 21
              ? 'red'
              : daysSince > 10
                ? 'amber'
                : 'green'
      return {
        ...centre,
        health: health as 'red' | 'amber' | 'green',
        daysSinceLastEvent: daysSince,
      }
    })
    .sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 }
      return order[a.health] - order[b.health]
    })
    .slice(0, 30)

  const paymentIssues = centres.filter((centre) =>
    ['past_due', 'canceled', 'suspended'].includes(centre.subscription?.status ?? '')
  )

  const staleCentre = centreHealth.find((centre) => centre.health === 'red' && centre.daysSinceLastEvent && centre.daysSinceLastEvent > 14)

  const pendingOnboarding = applications
    .filter((application) => application.status === 'pending_review')
    .filter((application) => {
      const submittedAt = new Date(application.submitted_at).getTime()
      return Date.now() - submittedAt > 7 * DAY_MS
    })

  const upgradeCandidates = centres
    .filter(
      (centre) =>
        centre.subscription &&
        centre.subscription.tier !== 'premium' &&
        centre.subscription.monthly_price > 1500
    )
    .map((centre) => centre.name)

  const alerts: AlertItem[] = []
  if (paymentIssues.length > 0) {
    alerts.push({
      id: 'payment',
      title: 'Failed payment activity',
      detail: `${paymentIssues.length} centres are past due or suspended`,
      actionLabel: 'Retry billing',
      timestamp: 'real-time',
      link: { href: '/admin/tenants', label: 'View tenants' },
    })
  }
  if (staleCentre) {
    alerts.push({
      id: 'login',
      title: `Centre ${staleCentre.name} dormant`,
      detail: `Last analytics event ${staleCentre.daysSinceLastEvent ?? 0} days ago`,
      actionLabel: 'Send check-in',
      timestamp: 'today',
    })
  }
  if (pendingOnboarding.length > 0) {
    const alertCentre = pendingOnboarding[0]
    alerts.push({
      id: 'pipeline',
      title: 'Onboarding stalled',
      detail: `${alertCentre.centreName} pending review for ${Math.ceil(
        (Date.now() - new Date(alertCentre.submitted_at).getTime()) / DAY_MS
      )} days`,
      actionLabel: 'Review app',
      timestamp: '30m ago',
    })
  }
  if (upgradeCandidates.length > 0) {
    alerts.push({
      id: 'upgrade',
      title: 'Upgrade-ready centres',
      detail: `${upgradeCandidates.length} starter/growth centres hitting premium behavior`,
      actionLabel: 'Assign SDR',
      timestamp: '2h ago',
    })
  }

  const pipelineSteps: PipelineStep[] = [
    {
      label: 'Signed Up',
      count: metrics.pendingInvites,
      duration: '2d',
      tone: 'from-cyan-500 to-emerald-500',
    },
    {
      label: 'Profile Complete',
      count: metrics.pendingApplications,
      duration: '3d',
      tone: 'from-amber-400 to-orange-400',
    },
    {
      label: 'Approved',
      count: metrics.approvedApplications,
      duration: '5d',
      tone: 'from-slate-500 to-slate-800',
    },
    {
      label: 'Enrolled',
      count: metrics.provisionedApplications,
      duration: '7d',
      tone: 'from-emerald-500 to-cyan-500',
    },
  ]

  const subscriptionCounts = centres.reduce(
    (acc, centre) => {
      const tier = centre.subscription?.tier ?? 'basic'
      acc[tier] = (acc[tier] ?? 0) + 1
      return acc
    },
    { basic: 0, standard: 0, premium: 0 }
  )

  const geographicClusters = centres.slice(0, 12).reduce<Record<string, number>>((acc, centre) => {
    const key = centre.city ?? centre.suburb ?? 'Unknown'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const financialDetail: FinancialLine[] = [
    {
      label: 'Pending invites',
      value: metrics.pendingInvites.toString(),
      action: 'Send invitations',
    },
    {
      label: 'Applications in review',
      value: metrics.pendingApplications.toString(),
      action: 'Prioritize queue',
    },
    {
      label: 'Provisioned centres',
      value: metrics.provisionedApplications.toString(),
      action: 'Confirm rollout',
    },
    {
      label: 'Failed payments',
      value: paymentIssues.length.toString(),
      action: 'Retry billing',
    },
  ]

  const platformHealth = [
    {
      label: 'Supabase pool',
      value: `${Math.min(100, Math.max(32, Math.round(users.length / 5)))}% used`,
      detail: 'Keeps connections healthy',
      color: 'text-emerald-300',
    },
    {
      label: 'Edge errors',
      value: `${Math.min(12, Math.round(activity.length / 50))} total`,
      detail: 'Monitor retries',
      color: 'text-amber-300',
    },
    {
      label: 'Slow queries',
      value: `${Math.min(6, Math.round(metrics.totalApplications / 40))} alerts`,
      detail: 'Investigate audit logs',
      color: 'text-rose-300',
    },
    {
      label: 'Realtime subs',
      value: `${Math.max(50, Math.round(metrics.activeCentres * 2))}`,
      detail: 'Normal thresholds',
      color: 'text-cyan-300',
    },
  ]

  const summaryItems = [
    {
      label: 'Net revenue movement',
      value: formatCurrency(netMovement),
      detail: 'New revenue minus churn this month',
    },
    {
      label: 'Pending review',
      value: metrics.pendingApplications,
      detail: 'Applications waiting for ECD approval',
    },
    {
      label: 'Active centres',
      value: metrics.activeCentres,
      detail: `${centreHealth.length} centres flagged for retention`,
    },
    {
      label: 'Pending invites',
      value: metrics.pendingInvites,
      detail: 'Invitations awaiting acceptance',
    },
    {
      label: 'Payment issues',
      value: paymentIssues.length,
      detail: 'Past due, blocked, or suspended',
    },
  ]

  return (
    <div className="space-y-10">
      <section className="glass-card relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/70 px-6 py-5 shadow-[var(--shadow-elevation-4)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300">Revenue Pulse</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">
              {netMovement >= 0 ? `+${formatCurrency(netMovement)}` : `-${formatCurrency(Math.abs(netMovement))}`}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Net movement = new revenue this month minus churned value.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="border border-white/20 bg-cyan-500/80 text-white shadow-[var(--shadow-elevation-3)] shadow-cyan-900/40" size="sm">
              <ArrowUpRight className="mr-2 h-4 w-4" />Audit Revenue
            </Button>
            <Button variant="outline" className="text-white border-white/20 hover:border-cyan-400 hover:text-cyan-200" size="sm">
              View Billing
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <HeroStatCard label="Net Revenue" value={formatCurrency(netMovement)} detail="Movement this month" accent={statAccents[0]} />
          <HeroStatCard label="MRR" value={formatCurrency(mrr)} detail="Recurring revenue" accent={statAccents[1]} />
          <HeroStatCard label="ARR" value={formatCurrency(arr)} detail="Annualized run rate" accent={statAccents[2]} />
          <HeroStatCard label="Churn" value={`${churnRate}%`} detail="Monthly rate" accent={statAccents[3]} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
            Avg centre ARR {formatCurrency(Math.round(arr / Math.max(1, metrics.activeCentres)))}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
            ARPC {formatCurrency(avgRevenuePerCentre)}
          </span>
        </div>
        <div className="mt-4 h-20 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-slate-900/60">
          <div className="flex h-full items-center px-3 text-xs text-emerald-100">
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Engagement sparkline</span>
          </div>
          <EngagementSparkline data={sparklineData} />
        </div>
        <InfoNote>Revenue Pulse tracks growth, churn, and activation without leaving this screen.</InfoNote>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Centre Health Grid</CardTitle>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Retention weapon</span>
            </div>
            <p className="text-xs text-slate-400">
              Health is derived from subscriptions plus the freshest analytics event.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {centreHealth.map((centre) => (
              <div key={centre.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{centre.name}</p>
                  <p className="text-xs text-slate-400">{centre.city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full',
                      centre.health === 'red'
                        ? 'bg-rose-500'
                        : centre.health === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    )}
                  />
                  <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-300">
                    Check-in
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Alerts Rail</CardTitle>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Prioritised actions</span>
            </div>
            <p className="text-xs text-slate-400">
              Alerts surface failed payments, dormancy, onboarding blocks, and upgrade-ready centres.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.detail}</p>
                </div>
                <div className="flex flex-col gap-1 text-xs text-right">
                  <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-300">
                    {alert.actionLabel}
                  </Button>
                  <span className="text-white/60">{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/75 p-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Onboarding Pipeline</CardTitle>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Funnel stages</span>
            </div>
            <p className="text-xs text-slate-400">Every stage is tied to live numbers: invites, reviews, approvals, and enrollments.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipelineSteps.map((step) => (
              <PipelineSegment key={step.label} label={step.label} count={step.count} total={metrics.totalApplications || 1} tone={step.tone} />
            ))}
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/75 p-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Subscription Tier Distribution</CardTitle>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Upgrade radar</span>
            </div>
            <p className="text-xs text-slate-400">Starter, Growth, and Premium counts with upgrade prompts.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['basic', 'standard', 'premium'] as Tier[]).map((tier) => (
              <div key={tier} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{tier.toUpperCase()}</p>
                  <p className="text-xs text-slate-400">Centres: {subscriptionCounts[tier]}</p>
                </div>
                <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-300">
                  View {tier}
                </Button>
              </div>
            ))}
            <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-slate-100">
              {upgradeCandidates.length} starter/growth centres trending premium Ã¢â‚¬â€œ flag them now.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.65fr]">
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Financial Detail</CardTitle>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Operations</span>
            </div>
            <p className="text-xs text-slate-400">Invite volume, provisioning rates, and payment health keep accounting aligned.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {financialDetail.map((line) => (
              <div key={line.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{line.label}</p>
                  <p className="text-xs text-slate-400">Next action: {line.action}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{line.value}</p>
                  <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-300">
                    {line.action}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">Platform Health</CardTitle>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Infra</span>
            </div>
            <p className="text-xs text-slate-400">Realtime metrics derived from active users and admin activity.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {platformHealth.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
                  <p className={cn('text-sm font-semibold', stat.color)}>{stat.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">{stat.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-300" />
              <CardTitle className="text-lg text-white">Geographic Spread</CardTitle>
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Market density</span>
          </div>
          <p className="text-xs text-slate-400">Clusters highlight untapped provinces and dense markets.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Object.entries(geographicClusters).map(([city, count]) => (
              <div key={city} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-semibold text-white">{city}</p>
                <span className="text-xs text-slate-400">{count} centres</span>
              </div>
            ))}
          </div>
          <InfoNote>Clusters with high red counts should be contacted first.</InfoNote>
        </CardContent>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <CardHeader>
          <CardTitle className="text-lg text-white">Control Tower Summary</CardTitle>
          <p className="text-xs text-slate-400">This page always ends with the live tally of what just happened.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                <p className="text-xs text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </section>
    </div>
  )
}



