import { createAdminClient } from '@/lib/supabase/admin'
import { getFounderVisibilityTruth } from '@/lib/founder/admin-truth'
import {
  AI_COMPANY_AGENT_DEFINITIONS,
  AI_COMPANY_LIGHT_PERSONA_IDS,
  AI_COMPANY_LIGHT_PERSONAS_FEATURE_FLAG,
  AI_COMPANY_OS_FEATURE_FLAG,
  getAiCompanyLightPersonaHref,
  isAiCompanyLightPersonasEnabled,
  isAiCompanyOperatingSystemEnabled,
} from './config'
import { createMockAiCompanyOperatingSystemSnapshot } from './mock-service'
import type {
  AiCompanyAgentBrief,
  AiCompanyLightPersona,
  AiCompanyMetric,
  AiCompanyOperatingSystemSnapshot,
  AiCompanyQueueItem,
  AiCompanyRiskItem,
  AiCompanyStatusLevel,
  AiCompanyWorkflowSection,
} from './types'

const ECD_ROLES = ['ecd_admin', 'ecd_staff', 'ecd_supervisor'] as const
const ECD_INVITE_EVENTS = [
  'owner_invite',
  'admin_access_invite',
  'welcome_pack',
  'centre_bootstrap_created',
] as const
const PARENT_WELCOME_KEYS = [
  'cc_welcome_intro',
  'cc_welcome_inbox_guide',
  'cc_welcome_legal',
  'cc_welcome_security',
] as const
const OPEN_SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_response'] as const
const PENDING_INVOICE_STATUSES = ['draft', 'sent', 'overdue'] as const
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trial', 'past_due'] as const

type AnalyticsEventType =
  | 'profile_view'
  | 'whatsapp_click'
  | 'call_click'
  | 'application_submitted'

type AnalyticsEventRow = {
  event_type: AnalyticsEventType
  created_at: string
}

export type LiveSignals = {
  centres: {
    total: number
    live: number
    onboarding: number
    claimRequests: number
    teamAccounts: number
  }
  parents: {
    total: number
    newLast7d: number
    unreadWelcomes: number
    failures24h: number
  }
  revenue: {
    activeSubscriptions: number
    mrr: number
    pendingInvoices: number
    pendingRevenueCents: number
    paidInvoices30d: number
    paidRevenue30dCents: number
  }
  support: {
    openTickets: number
    highPriorityOpenTickets: number
    failedInvites: number
  }
  demand: {
    trackedEvents14d: number
    profileViews7d: number
    profileViewsPrev7d: number
    contactClicks7d: number
    contactClicksPrev7d: number
    applications7d: number
    applicationsPrev7d: number
    contactRate7d: number
    applicationRate7d: number
  }
  reliability: {
    paymentFailures24h: number
    laggedWebhooks: number
  }
}

function listFoundingPartnerNames() {
  return 'Bajabulile Day Care Centre and Sakhisizwe Day Care Centre'
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amountInCents / 100)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function statusFromCount(
  count: number,
  thresholds: { warning: number; critical: number }
): AiCompanyStatusLevel {
  if (count >= thresholds.critical) return 'critical'
  if (count >= thresholds.warning) return 'watch'
  return 'healthy'
}

function maxStatus(...statuses: AiCompanyStatusLevel[]): AiCompanyStatusLevel {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('watch')) return 'watch'
  return 'healthy'
}

function safeCount(
  label: string,
  result: { count: number | null; error?: { message?: string } | null },
  issues: string[]
) {
  if (result.error) {
    issues.push(label)
    return 0
  }

  return result.count ?? 0
}

function safeRows<T>(
  label: string,
  result: { data: T[] | null; error?: { message?: string } | null },
  issues: string[]
) {
  if (result.error) {
    issues.push(label)
    return [] as T[]
  }

  return (result.data ?? []) as T[]
}

function demandStatus(signals: LiveSignals): AiCompanyStatusLevel {
  if (signals.demand.profileViews7d === 0) return 'watch'
  if (
    signals.demand.applications7d === 0 ||
    (signals.demand.profileViews7d >= 12 && signals.demand.applicationRate7d < 0.08)
  ) {
    return 'watch'
  }
  return 'healthy'
}

function pilotTruthStatus(
  partnerCount: number,
  demoTesterCentreCount: number | null
): AiCompanyStatusLevel {
  if (partnerCount === 0) return 'critical'
  if (demoTesterCentreCount === null) return 'watch'
  if (demoTesterCentreCount > 0) return 'watch'
  return 'healthy'
}

function revenueTruthStatus(
  realRevenueCents: number,
  scheduledRevenueCents: number
): AiCompanyStatusLevel {
  if (realRevenueCents > 0 || scheduledRevenueCents > 0) return 'healthy'
  return 'watch'
}

function scheduledCollectionsStatus(scheduledRevenueCents: number): AiCompanyStatusLevel {
  if (scheduledRevenueCents > 0) return 'watch'
  return 'healthy'
}

function summarizeAnalytics(rows: AnalyticsEventRow[]) {
  const nowMs = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const currentWindowStart = nowMs - sevenDaysMs
  const previousWindowStart = nowMs - 2 * sevenDaysMs

  const summary = {
    trackedEvents14d: rows.length,
    profileViews7d: 0,
    profileViewsPrev7d: 0,
    contactClicks7d: 0,
    contactClicksPrev7d: 0,
    applications7d: 0,
    applicationsPrev7d: 0,
  }

  for (const row of rows) {
    const createdMs = Date.parse(row.created_at)
    if (Number.isNaN(createdMs)) continue

    const isCurrent = createdMs >= currentWindowStart
    const isPrevious = createdMs >= previousWindowStart && createdMs < currentWindowStart

    if (!isCurrent && !isPrevious) continue

    if (row.event_type === 'profile_view') {
      if (isCurrent) summary.profileViews7d += 1
      if (isPrevious) summary.profileViewsPrev7d += 1
      continue
    }

    if (row.event_type === 'application_submitted') {
      if (isCurrent) summary.applications7d += 1
      if (isPrevious) summary.applicationsPrev7d += 1
      continue
    }

    if (row.event_type === 'whatsapp_click' || row.event_type === 'call_click') {
      if (isCurrent) summary.contactClicks7d += 1
      if (isPrevious) summary.contactClicksPrev7d += 1
    }
  }

  return {
    ...summary,
    contactRate7d:
      summary.profileViews7d > 0 ? summary.contactClicks7d / summary.profileViews7d : 0,
    applicationRate7d:
      summary.profileViews7d > 0 ? summary.applications7d / summary.profileViews7d : 0,
  }
}

function buildMetrics(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>
) {
  const pilotHealth = pilotTruthStatus(
    founderTruth.partnerCount,
    founderTruth.demoTesterCentreCount
  )
  const revenueHealth = revenueTruthStatus(
    founderTruth.realRevenueCents,
    founderTruth.scheduledRevenueCents
  )
  const collectionHealth = scheduledCollectionsStatus(founderTruth.scheduledRevenueCents)
  const demandHealth = demandStatus(signals)
  const parentReliabilityHealth = statusFromCount(signals.parents.failures24h, {
    warning: 4,
    critical: 12,
  })
  const supportHealth: AiCompanyStatusLevel =
    signals.support.highPriorityOpenTickets >= 3 || signals.support.openTickets >= 10
      ? 'critical'
      : signals.support.openTickets > 0
      ? 'watch'
      : 'healthy'
  const inviteHealth = statusFromCount(signals.support.failedInvites, {
    warning: 1,
    critical: 3,
  })
  const billingHealth: AiCompanyStatusLevel =
    signals.reliability.paymentFailures24h >= 3 || signals.reliability.laggedWebhooks >= 5
      ? 'critical'
      : signals.reliability.paymentFailures24h > 0 || signals.reliability.laggedWebhooks > 0
      ? 'watch'
      : 'healthy'
  const welcomeHealth = statusFromCount(signals.parents.unreadWelcomes, {
    warning: 5,
    critical: 20,
  })

  const metrics: AiCompanyMetric[] = [
    {
      id: 'mrr-base',
      label: 'Real revenue state',
      value: formatCurrency(founderTruth.realRevenueCents),
      change: founderTruth.revenueSummary,
      lane: 'revenue',
      status: revenueHealth,
      href: '/admin/revenue',
    },
    {
      id: 'activation-gap',
      label: 'Real onboarded ECDs',
      value: founderTruth.partnerCount.toLocaleString(),
      change: `${listFoundingPartnerNames()} are the only real onboarded centres. ${founderTruth.demoTesterSummary}`,
      lane: 'operations',
      status: pilotHealth,
      href: '/admin/tenants',
    },
    {
      id: 'collections-pulse',
      label: 'Scheduled real collections',
      value: formatCurrency(founderTruth.scheduledRevenueCents),
      change:
        founderTruth.systemRevenueArtifactCount && founderTruth.systemRevenueArtifactCount > 0
          ? `${founderTruth.systemRevenueArtifactCount} billing rows exist in admin tables, but none count as money scheduled right now.`
          : 'No real invoices are scheduled right now.',
      lane: 'revenue',
      status: collectionHealth,
      href: '/admin/revenue',
    },
    {
      id: 'parent-demand-7d',
      label: 'Parent demand (7d)',
      value: `${signals.demand.profileViews7d} views / ${signals.demand.applications7d} apps`,
      change: `${signals.demand.contactClicks7d} contacts | app rate ${formatPercent(signals.demand.applicationRate7d)}`,
      lane: 'growth',
      status: demandHealth,
      href: '/admin/analytics',
    },
    {
      id: 'new-parents-7d',
      label: 'New parents (7d)',
      value: signals.parents.newLast7d.toLocaleString(),
      change: `${signals.parents.total} total parent accounts currently in the system`,
      lane: 'growth',
      status: signals.parents.newLast7d === 0 ? 'watch' : 'healthy',
      href: '/admin/dashboard',
    },
    {
      id: 'parent-reliability',
      label: 'Parent submit failures (24h)',
      value: signals.parents.failures24h.toLocaleString(),
      change:
        signals.parents.failures24h === 0
          ? 'No tracked parent form failures in the last 24h'
          : 'Check route hotspots before widening scope',
      lane: 'reliability',
      status: parentReliabilityHealth,
      href: '/admin/parent-reliability?window=24h',
    },
    {
      id: 'support-pressure',
      label: 'Open support pressure',
      value: signals.support.openTickets.toLocaleString(),
      change: `${signals.support.highPriorityOpenTickets} high-priority threads in the queue`,
      lane: 'operations',
      status: supportHealth,
      href: '/admin/support',
    },
    {
      id: 'invite-failures',
      label: 'Failed centre invites',
      value: signals.support.failedInvites.toLocaleString(),
      change:
        signals.support.failedInvites === 0
          ? 'Invite delivery looks clean right now'
          : 'Resend or repair failed centre/admin invite flows',
      lane: 'reliability',
      status: inviteHealth,
      href: '/admin/invites?status=failed',
    },
    {
      id: 'billing-incidents',
      label: 'Billing incident pulse',
      value: `${signals.reliability.paymentFailures24h} failed / ${signals.reliability.laggedWebhooks} lagged`,
      change: 'Derived from payment webhook failures and received-but-unprocessed events',
      lane: 'reliability',
      status: billingHealth,
      href: '/admin/revenue',
    },
    {
      id: 'welcome-backlog',
      label: 'Unread parent welcomes',
      value: signals.parents.unreadWelcomes.toLocaleString(),
      change: 'Trust and onboarding follow-through still need manual review',
      lane: 'operations',
      status: welcomeHealth,
      href: '/admin/dashboard',
    },
  ]

  return {
    metrics,
    map: new Map(metrics.map((metric) => [metric.id, metric])),
    statuses: {
      pilotHealth,
      revenueHealth,
      collectionHealth,
      demandHealth,
      parentReliabilityHealth,
      supportHealth,
      inviteHealth,
      billingHealth,
      welcomeHealth,
    },
  }
}

function buildAgentBriefs(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>,
  metrics: Map<string, AiCompanyMetric>,
  statuses: ReturnType<typeof buildMetrics>['statuses']
): AiCompanyAgentBrief[] {
  const ceoStatus = maxStatus(
    statuses.pilotHealth,
    statuses.revenueHealth,
    statuses.demandHealth
  )
  const ctoStatus = maxStatus(
    statuses.parentReliabilityHealth,
    statuses.inviteHealth,
    statuses.billingHealth,
    statuses.supportHealth
  )
  const opsStatus = maxStatus(
    statuses.pilotHealth,
    statuses.supportHealth,
    statuses.welcomeHealth
  )
  const growthStatus = maxStatus(statuses.demandHealth, statuses.pilotHealth)

  const ceoHeadline =
    statuses.pilotHealth !== 'healthy'
      ? 'Run the founder lane from the two real partner centres, not from demo rows.'
      : statuses.revenueHealth !== 'healthy'
      ? 'Revenue is still pre-billing. Keep demo subscriptions and invoices out of the narrative.'
      : signals.demand.applications7d > 0
      ? 'Demand is showing up. Turn it into repeatable usage with the two real partner centres first.'
      : 'Pick the next bottleneck tied to real partner value, not the next idea.'

  const ctoHeadline =
    statuses.parentReliabilityHealth !== 'healthy'
      ? 'Parent reliability needs containment before new surface area.'
      : statuses.inviteHealth !== 'healthy'
      ? 'Invite delivery is the brittle edge to harden next.'
      : statuses.billingHealth !== 'healthy'
      ? 'Billing incidents still need a tighter feedback loop, even before real collections begin.'
      : 'The platform can stay conservative while shared selectors harden.'

  const opsHeadline =
    statuses.pilotHealth !== 'healthy'
      ? 'Founding partner follow-through still needs tight human ops discipline.'
      : statuses.supportHealth !== 'healthy'
      ? 'Support pressure is the next operations bottleneck.'
      : 'Ops can shift from firefighting toward repeatable follow-up.'

  const growthHeadline =
    signals.demand.profileViews7d === 0
      ? 'Growth tracking is too quiet to trust as a decision engine yet.'
      : statuses.demandHealth !== 'healthy'
      ? 'Demand exists, but the funnel is still leaking before application.'
      : 'Growth has enough tracked signal to recommend one experiment at a time.'

  return [
    {
      agentId: 'ceo',
      status: ceoStatus,
      headline: ceoHeadline,
      rationale: `${listFoundingPartnerNames()} are the only real onboarded ECD partners. ${founderTruth.demoTesterSummary} ${founderTruth.revenueSummary} Tracked parent demand is converting at ${formatPercent(signals.demand.applicationRate7d)} from profile view to application, so founder time should stay with real partner usage, trust, and verified demand.`,
      nextActions: [
        `Keep ${listFoundingPartnerNames()} as the only real partner lane in founder reviews.`,
        'Label every other centre record as demo/demo-test before using it in pipeline or revenue summaries.',
        'Use the weekly founder review to compare partner usage, demand, and reliability before making a new bet.',
      ],
      metrics: [
        metrics.get('mrr-base'),
        metrics.get('activation-gap'),
        metrics.get('collections-pulse'),
        metrics.get('parent-demand-7d'),
      ].filter(Boolean) as AiCompanyMetric[],
    },
    {
      agentId: 'cto',
      status: ctoStatus,
      headline: ctoHeadline,
      rationale: `${signals.parents.failures24h} parent submit failures, ${signals.support.failedInvites} failed invites, ${signals.reliability.paymentFailures24h} failed payment webhooks, and ${signals.support.openTickets} open support tickets are the live proxies for technical risk in this pass.`,
      nextActions: [
        'Stabilize the most visible failure path before adding any new AI action layer.',
        'Keep founder metrics and pilot-truth labels in shared selectors so dashboards and future agents use one source of truth.',
        'Treat invite, parent form, and payment incidents as one reliability queue until deeper observability exists.',
      ],
      metrics: [
        metrics.get('parent-reliability'),
        metrics.get('support-pressure'),
        metrics.get('invite-failures'),
        metrics.get('billing-incidents'),
      ].filter(Boolean) as AiCompanyMetric[],
    },
    {
      agentId: 'ops',
      status: opsStatus,
      headline: opsHeadline,
      rationale: `${listFoundingPartnerNames()} are the only real onboarded centres, while ${signals.support.openTickets} support threads remain open and ${signals.parents.unreadWelcomes} parent welcome notifications are still unread. Keep demo/demo-test rows out of the founder queue so real follow-through stays visible.`,
      nextActions: [
        'Keep the founder daily focus list below four open threads.',
        'Use support and invite queues as one operational follow-up stack for the two founding partners first.',
        'Treat unread welcomes as trust debt, not just a messaging metric.',
      ],
      metrics: [
        metrics.get('activation-gap'),
        metrics.get('support-pressure'),
        metrics.get('welcome-backlog'),
      ].filter(Boolean) as AiCompanyMetric[],
    },
    {
      agentId: 'growth',
      status: growthStatus,
      headline: growthHeadline,
      rationale: `${signals.demand.profileViews7d} tracked centre profile views produced ${signals.demand.contactClicks7d} contact clicks and ${signals.demand.applications7d} applications in the last 7 days.`,
      nextActions: [
        'Review whether traffic is reaching strong real partner profiles or mostly demo/testing records.',
        'Keep growth recommendations advisory until off-platform WhatsApp outcomes are captured.',
        'Prioritize one funnel repair experiment over broad feature spread, and do not convert demo rows into fake pipeline.',
      ],
      metrics: [
        metrics.get('parent-demand-7d'),
        metrics.get('new-parents-7d'),
        metrics.get('activation-gap'),
      ].filter(Boolean) as AiCompanyMetric[],
    },
  ]
}

function createActionItem(
  id: string,
  input: Omit<AiCompanyQueueItem, 'id'>
): AiCompanyQueueItem {
  return { id, ...input }
}

function buildQueues(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>,
  statuses: ReturnType<typeof buildMetrics>['statuses']
): AiCompanyQueueItem[] {
  return [
    createActionItem('queue-centre-activation', {
      lane: 'revenue',
      ownerAgentId: 'ceo',
      title: 'Keep the founding partner lane clean',
      summary: `${listFoundingPartnerNames()} are the only real onboarded ECD partners. ${founderTruth.demoTesterSummary} ${signals.centres.claimRequests} claims are still waiting in the wider admin system.`,
      priority: statuses.pilotHealth === 'critical' ? 'now' : 'next',
      status: signals.support.failedInvites > 0 ? 'blocked' : 'ready',
      href: '/admin/tenants',
      actionLabel: 'Open centres',
    }),
    createActionItem('queue-reliability-triage', {
      lane: 'reliability',
      ownerAgentId: 'cto',
      title: 'Reliability triage stack',
      summary: `${signals.parents.failures24h} parent failures, ${signals.support.failedInvites} failed invites, and ${signals.reliability.paymentFailures24h} billing incidents are the current technical pressure points.`,
      priority:
        maxStatus(
          statuses.parentReliabilityHealth,
          statuses.inviteHealth,
          statuses.billingHealth
        ) === 'critical'
          ? 'now'
          : 'next',
      status:
        signals.parents.failures24h > 0 ||
        signals.support.failedInvites > 0 ||
        signals.reliability.paymentFailures24h > 0
          ? 'in_progress'
          : 'ready',
      href: '/admin/parent-reliability?window=24h',
      actionLabel: 'Open reliability',
    }),
    createActionItem('queue-collections-follow-up', {
      lane: 'revenue',
      ownerAgentId: 'ceo',
      title: 'Keep revenue truth clean',
      summary: founderTruth.revenueSummary,
      priority:
        founderTruth.systemRevenueArtifactCount && founderTruth.systemRevenueArtifactCount > 0
          ? 'next'
          : 'later',
      status:
        founderTruth.systemRevenueArtifactCount && founderTruth.systemRevenueArtifactCount > 0
          ? 'ready'
          : 'in_progress',
      href: '/admin/revenue',
      actionLabel: 'Open revenue',
    }),
    createActionItem('queue-demand-review', {
      lane: 'growth',
      ownerAgentId: 'growth',
      title: 'Demand to application review',
      summary: `${signals.demand.profileViews7d} views turned into ${signals.demand.contactClicks7d} contacts and ${signals.demand.applications7d} applications in the last 7 days.`,
      priority: statuses.demandHealth === 'healthy' ? 'next' : 'now',
      status: signals.demand.profileViews7d > 0 ? 'ready' : 'blocked',
      href: '/admin/analytics',
      actionLabel: 'Open analytics',
    }),
  ]
}

function buildDailyFocus(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>,
  statuses: ReturnType<typeof buildMetrics>['statuses']
): AiCompanyQueueItem[] {
  const items: Array<{ score: number; item: AiCompanyQueueItem }> = []

  items.push({
    score: founderTruth.partnerCount * 4 + signals.centres.claimRequests * 2,
    item: createActionItem('daily-activation', {
      lane: 'operations',
      ownerAgentId: 'ceo',
      title: 'Protect the real partner lane',
      summary: `${listFoundingPartnerNames()} are the only real onboarded ECD partners. Keep their follow-through visible before you react to demo/test rows.`,
      priority: statuses.pilotHealth === 'critical' ? 'now' : 'next',
      status: 'ready',
      href: '/admin/tenants',
      actionLabel: 'Open centres',
    }),
  })

  if (founderTruth.systemRevenueArtifactCount && founderTruth.systemRevenueArtifactCount > 0) {
    items.push({
      score: founderTruth.systemRevenueArtifactCount,
      item: createActionItem('daily-revenue-truth', {
        lane: 'revenue',
        ownerAgentId: 'ceo',
        title: 'Stop demo billing rows from becoming fake pipeline',
        summary: founderTruth.revenueSummary,
        priority: 'next',
        status: 'ready',
        href: '/admin/revenue',
        actionLabel: 'Open revenue',
      }),
    })
  }

  items.push({
    score:
      signals.parents.failures24h * 6 +
      signals.support.failedInvites * 8 +
      signals.reliability.paymentFailures24h * 10,
    item: createActionItem('daily-reliability', {
      lane: 'reliability',
      ownerAgentId: 'cto',
      title: 'Contain the most visible product failures',
      summary: `${signals.parents.failures24h} parent failures, ${signals.support.failedInvites} failed invites, and ${signals.reliability.paymentFailures24h} failed payment events are the live technical risk set.`,
      priority:
        maxStatus(
          statuses.parentReliabilityHealth,
          statuses.inviteHealth,
          statuses.billingHealth
        ) === 'critical'
          ? 'now'
          : 'next',
      status:
        signals.parents.failures24h > 0 ||
        signals.support.failedInvites > 0 ||
        signals.reliability.paymentFailures24h > 0
          ? 'in_progress'
          : 'ready',
      href: '/admin/parent-reliability?window=24h',
      actionLabel: 'Open reliability',
    }),
  })

  items.push({
    score: signals.support.openTickets * 3 + signals.support.highPriorityOpenTickets * 5,
    item: createActionItem('daily-support', {
      lane: 'operations',
      ownerAgentId: 'ops',
      title: 'Reduce open support pressure',
      summary: `${signals.support.openTickets} support tickets remain open, including ${signals.support.highPriorityOpenTickets} higher-priority threads.`,
      priority: statuses.supportHealth === 'healthy' ? 'later' : 'next',
      status: signals.support.openTickets > 0 ? 'ready' : 'in_progress',
      href: '/admin/support',
      actionLabel: 'Open support',
    }),
  })

  items.sort((a, b) => b.score - a.score)
  return items.slice(0, 4).map((entry) => entry.item)
}

function buildWeeklyReview(signals: LiveSignals): AiCompanyQueueItem[] {
  return [
    createActionItem('weekly-activation-review', {
      lane: 'revenue',
      ownerAgentId: 'ceo',
      title: 'Review founding partner usage, not raw centre totals',
      summary: `${listFoundingPartnerNames()} are the only real onboarded centres. Confirm which workflows each one is actually using this week before you read wider system counts as traction.`,
      priority: 'next',
      status: 'ready',
      href: '/admin/dashboard',
      actionLabel: 'Open founder KPIs',
    }),
    createActionItem('weekly-demand-review', {
      lane: 'growth',
      ownerAgentId: 'growth',
      title: 'Review 7-day parent funnel quality',
      summary: `${signals.demand.profileViews7d} views, ${signals.demand.contactClicks7d} contacts, and ${signals.demand.applications7d} applications are the current demand baseline.`,
      priority: 'next',
      status: 'ready',
      href: '/admin/analytics',
      actionLabel: 'Open analytics',
    }),
    createActionItem('weekly-revenue-review', {
      lane: 'revenue',
      ownerAgentId: 'ceo',
      title: 'Review real revenue readiness',
      summary: 'CentreConnect remains pre-revenue: R0 is the real revenue state and no money is currently scheduled to be received.',
      priority: 'next',
      status: 'ready',
      href: '/admin/revenue',
      actionLabel: 'Open revenue',
    }),
    createActionItem('weekly-risk-review', {
      lane: 'reliability',
      ownerAgentId: 'cto',
      title: 'Review reliability risk with the founder',
      summary: 'Use parent failures, invite issues, webhook incidents, and support tickets as the shared risk checklist until deeper observability exists.',
      priority: 'next',
      status: 'ready',
      href: '/admin/command',
      actionLabel: 'Open operations',
    }),
  ]
}

function buildSprintPriorities(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>,
  statuses: ReturnType<typeof buildMetrics>['statuses']
): AiCompanyQueueItem[] {
  const candidates: Array<{ score: number; item: AiCompanyQueueItem }> = [
    {
      score:
        signals.parents.failures24h * 5 +
        signals.support.failedInvites * 6 +
        signals.reliability.paymentFailures24h * 8 +
        signals.reliability.laggedWebhooks * 2,
      item: createActionItem('sprint-reliability-hardening', {
        lane: 'reliability',
        ownerAgentId: 'cto',
        title: 'Reliability hardening',
        summary: 'Tighten the parent submit, invite delivery, and billing incident loop before any autonomous AI actions exist.',
        priority:
          maxStatus(
            statuses.parentReliabilityHealth,
            statuses.inviteHealth,
            statuses.billingHealth
          ) === 'critical'
            ? 'now'
            : 'next',
        status: 'ready',
        href: '/admin/parent-reliability?window=24h',
        actionLabel: 'Open reliability',
      }),
    },
    {
      score: founderTruth.partnerCount * 4 + signals.centres.claimRequests * 3,
      item: createActionItem('sprint-onboarding-closure', {
        lane: 'operations',
        ownerAgentId: 'ops',
        title: 'Founding partner follow-through tooling',
        summary: `Reduce the manual founder follow-through needed to help ${listFoundingPartnerNames()} use the core workflows consistently without demo/test rows muddying the queue.`,
        priority: statuses.pilotHealth === 'critical' ? 'now' : 'next',
        status: 'ready',
        href: '/admin/tenants',
        actionLabel: 'Open centres',
      }),
    },
    {
      score:
        signals.demand.profileViews7d * 2 +
        signals.parents.newLast7d -
        signals.demand.applications7d * 4,
      item: createActionItem('sprint-funnel-repair', {
        lane: 'growth',
        ownerAgentId: 'growth',
        title: 'Parent funnel repair',
        summary: 'Improve tracked conversion from centre profile view to contact and application before broadening acquisition work.',
        priority: statuses.demandHealth === 'healthy' ? 'next' : 'now',
        status: signals.demand.profileViews7d > 0 ? 'ready' : 'blocked',
        href: '/admin/analytics',
        actionLabel: 'Open analytics',
      }),
    },
    {
      score: 1,
      item: createActionItem('sprint-shared-selectors', {
        lane: 'product',
        ownerAgentId: 'cto',
        title: 'Shared founder signal selectors',
        summary: 'Keep CEO/CTO briefs, founder workflows, and any future agent surfaces on one typed contract that preserves canonical pilot truth.',
        priority: 'next',
        status: 'in_progress',
        href: '/admin/ai-os',
        actionLabel: 'Open AI OS',
      }),
    },
  ]

  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 3).map((entry) => entry.item)
}

function buildRisks(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>,
  statuses: ReturnType<typeof buildMetrics>['statuses']
): AiCompanyRiskItem[] {
  const risks: AiCompanyRiskItem[] = []

  if (statuses.pilotHealth !== 'healthy') {
    risks.push({
      id: 'risk-activation',
      title: 'Founder attention can drift away from the two real partner centres.',
      summary: `${listFoundingPartnerNames()} are the only real onboarded centres. ${founderTruth.demoTesterSummary}`,
      severity: statuses.pilotHealth,
      ownerAgentId: 'ceo',
      href: '/admin/tenants',
      actionLabel: 'Open centres',
    })
  }

  if (
    (founderTruth.demoTesterCentreCount !== null && founderTruth.demoTesterCentreCount > 0) ||
    (founderTruth.systemRevenueArtifactCount !== null &&
      founderTruth.systemRevenueArtifactCount > 0)
  ) {
    risks.push({
      id: 'risk-mixed-truth',
      title: 'Demo/test records can distort founder decisions.',
      summary: `${founderTruth.demoTesterSummary} ${founderTruth.revenueSummary}`,
      severity: 'watch',
      ownerAgentId: 'ceo',
      href: '/admin/ai-os',
      actionLabel: 'Open AI OS',
    })
  }

  if (statuses.parentReliabilityHealth !== 'healthy') {
    risks.push({
      id: 'risk-parent-reliability',
      title: 'Parents are encountering visible product friction.',
      summary: `${signals.parents.failures24h} submit failures were tracked in the last 24 hours. That is a trust risk for the parent side of the marketplace.`,
      severity: statuses.parentReliabilityHealth,
      ownerAgentId: 'cto',
      href: '/admin/parent-reliability?window=24h',
      actionLabel: 'Open reliability',
    })
  }

  if (statuses.inviteHealth !== 'healthy') {
    risks.push({
      id: 'risk-invite-delivery',
      title: 'Invite delivery is still a founder dependency.',
      summary: `${signals.support.failedInvites} centre/admin invite failures mean onboarding can stall before a centre even logs in.`,
      severity: statuses.inviteHealth,
      ownerAgentId: 'ops',
      href: '/admin/invites?status=failed',
      actionLabel: 'Open invites',
    })
  }

  if (statuses.billingHealth !== 'healthy') {
    risks.push({
      id: 'risk-billing',
      title: 'Billing incidents still matter even before real collections start.',
      summary: `${signals.reliability.paymentFailures24h} failed webhooks and ${signals.reliability.laggedWebhooks} lagged events are product-reliability issues, but they do not mean cash is scheduled right now.`,
      severity: statuses.billingHealth,
      ownerAgentId: 'cto',
      href: '/admin/revenue',
      actionLabel: 'Open revenue',
    })
  }

  if (statuses.demandHealth !== 'healthy') {
    risks.push({
      id: 'risk-demand-gap',
      title: 'Demand signal is real but conversion is still thin.',
      summary: `${signals.demand.profileViews7d} tracked views produced ${signals.demand.applications7d} applications in 7 days, and off-platform outcomes are not joined yet.`,
      severity: statuses.demandHealth,
      ownerAgentId: 'growth',
      href: '/admin/analytics',
      actionLabel: 'Open analytics',
    })
  }

  if (risks.length === 0) {
    risks.push({
      id: 'risk-none-acute',
      title: 'No acute tracked risk crossed a warning threshold.',
      summary: 'The founder can stay in review mode, but this still excludes deploy/runtime observability outside admin tables.',
      severity: 'healthy',
      ownerAgentId: 'cto',
      href: '/admin/command',
      actionLabel: 'Open operations',
    })
  }

  return risks.slice(0, 4)
}

function buildWorkflows(
  signals: LiveSignals,
  founderTruth: ReturnType<typeof getFounderVisibilityTruth>,
  statuses: ReturnType<typeof buildMetrics>['statuses']
): AiCompanyWorkflowSection[] {
  return [
    {
      id: 'daily_focus',
      title: 'Daily focus',
      description: 'Today only: the few founder threads most likely to improve real partner usage, trust, or reliability.',
      items: buildDailyFocus(signals, founderTruth, statuses),
    },
    {
      id: 'weekly_review',
      title: 'Weekly review',
      description: 'A repeatable founder review rhythm grounded in live admin tables and canonical pilot truth.',
      items: buildWeeklyReview(signals),
    },
    {
      id: 'sprint_priorities',
      title: 'Sprint priorities',
      description: 'The smallest meaningful build lanes suggested by current pressure in the data without inventing fake pipeline.',
      items: buildSprintPriorities(signals, founderTruth, statuses),
    },
  ]
}

function buildLightPersonas(
  lightPersonasEnabled: boolean
): AiCompanyLightPersona[] {
  if (!lightPersonasEnabled) return []

  return AI_COMPANY_LIGHT_PERSONA_IDS.map((agentId) => ({
    agentId,
    title: agentId === 'ceo' ? 'CEO Light' : 'CTO Light',
    audienceLabel:
      agentId === 'ceo'
        ? 'Founder or business-facing stakeholder'
        : 'Technical lead or delivery stakeholder',
    promise:
      agentId === 'ceo'
        ? 'A founder brief that keeps pilot truth, partner focus, and real revenue state aligned.'
        : 'A concise reliability brief grounded in the current technical risk picture.',
    summary:
      agentId === 'ceo'
        ? 'Start with Bajabulile and Sakhisizwe, keep demo data out of the founder loop, and do not claim revenue that is not scheduled.'
        : 'Focus on parent reliability, support pressure, invite delivery, and payment incident signals.',
    primaryCta: agentId === 'ceo' ? 'Open founder truth brief' : 'Open reliability brief',
    readiness: 'pilot',
    href: getAiCompanyLightPersonaHref(agentId),
  }))
}

export async function loadLiveSignals() {
  const admin = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000
  ).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString()
  const lagCutoffIso = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const issues: string[] = []

  const [
    totalCentresResult,
    liveCentresResult,
    onboardingCentresResult,
    claimRequestsResult,
    centreAccountsResult,
    totalParentsResult,
    newParentsResult,
    unreadWelcomesResult,
    parentFailuresResult,
    openSupportResult,
    highPrioritySupportResult,
    failedInviteCountResult,
    activeSubscriptionsResult,
    pendingInvoicesResult,
    paidInvoicesResult,
    analyticsEventsResult,
    paymentWebhookFailuresResult,
    laggedWebhooksResult,
  ] = await Promise.all([
    admin.from('ecd_centres').select('id', { count: 'exact', head: true }),
    admin
      .from('ecd_centres')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    admin
      .from('ecd_centres')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', false)
      .eq('onboarding_complete', false),
    admin
      .from('claim_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', [...ECD_ROLES]),
    admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'parent_user'),
    admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'parent_user')
      .gte('created_at', sevenDaysAgo),
    admin
      .from('parent_notifications')
      .select('id', { count: 'exact', head: true })
      .in('template_key', [...PARENT_WELCOME_KEYS])
      .eq('is_read', false),
    admin
      .from('parent_form_submit_failures')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo),
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_SUPPORT_STATUSES]),
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_SUPPORT_STATUSES])
      .gte('priority', 3),
    admin
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .in('event_type', [...ECD_INVITE_EVENTS])
      .eq('status', 'failed'),
    admin
      .from('subscriptions')
      .select('id,monthly_price,status')
      .in('status', [...ACTIVE_SUBSCRIPTION_STATUSES]),
    admin
      .from('invoices')
      .select('id,total,status,due_at')
      .in('status', [...PENDING_INVOICE_STATUSES])
      .order('due_at', { ascending: true })
      .limit(200),
    admin
      .from('invoices')
      .select('id,total,paid_at')
      .eq('status', 'paid')
      .gte('paid_at', thirtyDaysAgo)
      .order('paid_at', { ascending: false })
      .limit(200),
    admin
      .from('ecd_analytics_events')
      .select('event_type,created_at')
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5000),
    admin
      .from('payment_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', twentyFourHoursAgo),
    admin
      .from('payment_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received')
      .lt('created_at', lagCutoffIso),
  ])

  const activeSubscriptions = safeRows<{ monthly_price: number | string | null }>(
    'subscriptions',
    activeSubscriptionsResult,
    issues
  )
  const pendingInvoices = safeRows<{ total: number | string | null }>(
    'pending invoices',
    pendingInvoicesResult,
    issues
  )
  const paidInvoices = safeRows<{ total: number | string | null }>(
    'paid invoices',
    paidInvoicesResult,
    issues
  )
  const analyticsEvents = safeRows<AnalyticsEventRow>(
    'analytics events',
    analyticsEventsResult,
    issues
  )

  const demand = summarizeAnalytics(analyticsEvents)

  const signals: LiveSignals = {
    centres: {
      total: safeCount('centre totals', totalCentresResult, issues),
      live: safeCount('live centres', liveCentresResult, issues),
      onboarding: safeCount('onboarding centres', onboardingCentresResult, issues),
      claimRequests: safeCount('claim requests', claimRequestsResult, issues),
      teamAccounts: safeCount('centre team accounts', centreAccountsResult, issues),
    },
    parents: {
      total: safeCount('parent totals', totalParentsResult, issues),
      newLast7d: safeCount('new parents', newParentsResult, issues),
      unreadWelcomes: safeCount('parent welcomes', unreadWelcomesResult, issues),
      failures24h: safeCount('parent reliability failures', parentFailuresResult, issues),
    },
    revenue: {
      activeSubscriptions: activeSubscriptions.length,
      mrr: activeSubscriptions.reduce(
        (sum, row) => sum + Math.round((Number(row.monthly_price) || 0) * 100),
        0
      ),
      pendingInvoices: pendingInvoices.length,
      pendingRevenueCents: pendingInvoices.reduce(
        (sum, row) => sum + (Number(row.total) || 0),
        0
      ),
      paidInvoices30d: paidInvoices.length,
      paidRevenue30dCents: paidInvoices.reduce(
        (sum, row) => sum + (Number(row.total) || 0),
        0
      ),
    },
    support: {
      openTickets: safeCount('support tickets', openSupportResult, issues),
      highPriorityOpenTickets: safeCount(
        'high-priority support tickets',
        highPrioritySupportResult,
        issues
      ),
      failedInvites: safeCount('failed invite logs', failedInviteCountResult, issues),
    },
    demand,
    reliability: {
      paymentFailures24h: safeCount(
        'payment webhook failures',
        paymentWebhookFailuresResult,
        issues
      ),
      laggedWebhooks: safeCount('lagged payment webhooks', laggedWebhooksResult, issues),
    },
  }

  return { signals, issues }
}

export async function getAiCompanyOperatingSystemSnapshot(input?: {
  ownerEmail?: string | null
}): Promise<AiCompanyOperatingSystemSnapshot> {
  const enabled = isAiCompanyOperatingSystemEnabled()
  const lightPersonasEnabled = isAiCompanyLightPersonasEnabled()

  try {
    const { signals, issues } = await loadLiveSignals()
    const founderTruth = getFounderVisibilityTruth({
      systemCentreCount: signals.centres.total,
      activeSubscriptionCount: signals.revenue.activeSubscriptions,
      pendingInvoiceCount: signals.revenue.pendingInvoices,
      paidInvoiceCountLast30d: signals.revenue.paidInvoices30d,
    })
    const { metrics, map, statuses } = buildMetrics(signals, founderTruth)
    const agents = buildAgentBriefs(signals, founderTruth, map, statuses)
    const queues = buildQueues(signals, founderTruth, statuses)
    const workflows = buildWorkflows(signals, founderTruth, statuses)
    const risks = buildRisks(signals, founderTruth, statuses)
    const baseNotes = [
      ...founderTruth.notes,
      'Support, invite, parent reliability, demand, and billing reliability signals are pulled from live admin tables in this environment.',
      'Demand uses tracked analytics events only. Off-platform WhatsApp, call outcomes, and closed-won centre conversion are not yet joined into one funnel.',
      'CTO risk is inferred from support, parent submit failures, invite delivery, and payment incidents because deploy/runtime observability is not wired into the AI OS yet.',
      'Daily focus, weekly review, sprint priorities, and risk summary are deterministic heuristics over live metrics. They are advisory, not autonomous actions.',
    ]

    if (issues.length > 0) {
      baseNotes.push(
        `Some live selectors fell back to zero in this environment: ${issues.join(', ')}.`
      )
    }

    return {
      enabled,
      featureFlag: AI_COMPANY_OS_FEATURE_FLAG,
      lightPersonasEnabled,
      lightPersonasFeatureFlag: AI_COMPANY_LIGHT_PERSONAS_FEATURE_FLAG,
      signalMode: issues.length > 0 ? 'mixed' : 'live',
      generatedAt: new Date().toISOString(),
      ownerEmail: input?.ownerEmail ?? null,
      definitions: [...AI_COMPANY_AGENT_DEFINITIONS],
      agents,
      metrics,
      queues,
      workflows,
      risks,
      dataNotes: baseNotes,
      lightPersonas: buildLightPersonas(lightPersonasEnabled).filter((persona) =>
        AI_COMPANY_LIGHT_PERSONA_IDS.includes(persona.agentId)
      ),
      founderTruth,
    }
  } catch {
    return createMockAiCompanyOperatingSystemSnapshot(input)
  }
}
