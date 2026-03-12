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
import type {
  AiCompanyAgentBrief,
  AiCompanyAgentId,
  AiCompanyLightPersona,
  AiCompanyMetric,
  AiCompanyOperatingSystemSnapshot,
  AiCompanyQueueItem,
  AiCompanyRiskItem,
  AiCompanyStatusLevel,
  AiCompanyWorkflowSection,
} from './types'

const founderTruth = getFounderVisibilityTruth()

const MOCK_METRICS: AiCompanyMetric[] = [
  {
    id: 'mrr-base',
    label: 'Real revenue state',
    value: 'R0',
    change: founderTruth.revenueSummary,
    lane: 'revenue',
    status: 'watch',
    href: '/admin/revenue',
  },
  {
    id: 'activation-gap',
    label: 'Real onboarded ECDs',
    value: String(founderTruth.partnerCount),
    change: founderTruth.summary,
    lane: 'operations',
    status: 'watch',
    href: '/admin/tenants',
  },
  {
    id: 'collections-pulse',
    label: 'Scheduled real collections',
    value: 'R0',
    change: 'No real invoices are scheduled right now, even if demo/test billing rows exist elsewhere.',
    lane: 'revenue',
    status: 'healthy',
    href: '/admin/revenue',
  },
  {
    id: 'parent-demand-7d',
    label: 'Parent demand pulse',
    value: 'Needs live read',
    change: 'Use live analytics before claiming a real demand trend from the founder surface.',
    lane: 'growth',
    status: 'watch',
    href: '/admin/analytics',
  },
  {
    id: 'support-pressure',
    label: 'Founder action queue',
    value: 'Mock-backed',
    change: 'Keep the founder queue anchored to real partner follow-through, not demo/test rows.',
    lane: 'operations',
    status: 'watch',
    href: '/admin/command',
  },
  {
    id: 'billing-incidents',
    label: 'Billing reliability',
    value: 'Needs live read',
    change: 'Treat billing as product reliability until a real partner centre is actually billed.',
    lane: 'reliability',
    status: 'watch',
    href: '/admin/revenue',
  },
  {
    id: 'shipping-mode',
    label: 'Shipping mode',
    value: 'Conservative',
    change: 'Feature-flagged, mock-backed, and admin-only.',
    lane: 'product',
    status: 'healthy',
    href: '/admin/ai-os',
  },
]

const AGENT_STATUS: Record<AiCompanyAgentId, AiCompanyStatusLevel> = {
  ceo: 'watch',
  cto: 'healthy',
  ops: 'watch',
  growth: 'watch',
}

const AGENT_HEADLINES: Record<
  AiCompanyAgentId,
  { headline: string; rationale: string; nextActions: string[]; metricIds: string[] }
> = {
  ceo: {
    headline: 'Run the founder lane from the two real partner centres, not from demo rows.',
    rationale:
      'The fallback brief should preserve the canonical pilot truth first: only Bajabulile Day Care Centre and Sakhisizwe Day Care Centre are truly onboarded, and revenue is still R0 with nothing scheduled.',
    nextActions: [
      'Treat Bajabulile Day Care Centre and Sakhisizwe Day Care Centre as the only real pilot lane.',
      'Keep demo/demo-test centre rows out of pipeline and revenue summaries.',
      'Use live demand and reliability views before claiming traction.',
    ],
    metricIds: ['mrr-base', 'activation-gap', 'collections-pulse', 'parent-demand-7d'],
  },
  cto: {
    headline: 'Keep the AI OS read-only until the live data contracts are stable.',
    rationale:
      'The safest first step is a typed orchestration layer that preserves founder truth and does not mutate production state.',
    nextActions: [
      'Wire live admin KPIs into shared selectors.',
      'Keep founder-truth labels on the same shared contract as the metrics.',
      'Keep all new behaviour behind server-side flags.',
    ],
    metricIds: ['billing-incidents', 'shipping-mode'],
  },
  ops: {
    headline: 'Ops should protect founding partner follow-through before automation.',
    rationale:
      'Support, onboarding, and invite queues should serve the two real partner centres first, with demo rows clearly separated.',
    nextActions: [
      'Group support, onboarding, and invite issues into one real-partner queue model.',
      'Add queue owners and follow-up SLAs.',
      'Surface anything that could block Bajabulile or Sakhisizwe first.',
    ],
    metricIds: ['support-pressure', 'activation-gap'],
  },
  growth: {
    headline: 'Growth needs sharper signal quality before recommendations become trustworthy.',
    rationale:
      'There is enough analytics structure to scaffold a growth agent, but not enough unified signal quality to make founder-grade claims from fallback data.',
    nextActions: [
      'Define the parent conversion funnel source of truth.',
      'Connect landing, directory, and application signals.',
      'Expose one recommended experiment at a time without implying revenue that is not scheduled.',
    ],
    metricIds: ['parent-demand-7d', 'shipping-mode'],
  },
}

const MOCK_QUEUES: AiCompanyQueueItem[] = [
  {
    id: 'queue-founder-truth',
    lane: 'revenue',
    ownerAgentId: 'ceo',
    title: 'Protect canonical founder truth',
    summary:
      'Keep founder/admin summaries anchored to Bajabulile and Sakhisizwe as the only real onboarded partners, with revenue still at R0 and nothing scheduled.',
    priority: 'now',
    status: 'ready',
    href: '/admin/ai-os',
    actionLabel: 'Open AI OS',
  },
  {
    id: 'queue-live-signal-contracts',
    lane: 'product',
    ownerAgentId: 'cto',
    title: 'Live signal contracts',
    summary:
      'Normalize admin KPIs, founder-truth labels, and platform health selectors before plugging in a real model.',
    priority: 'now',
    status: 'in_progress',
    href: '/admin/ai-os',
    actionLabel: 'Review AI OS',
  },
  {
    id: 'queue-founder-partner-follow-up',
    lane: 'operations',
    ownerAgentId: 'ops',
    title: 'Founding partner follow-up board',
    summary:
      'Merge onboarding, invite recovery, and support follow-up for the two real partner centres into one queue.',
    priority: 'next',
    status: 'ready',
    href: '/admin/tenants',
    actionLabel: 'Open centres',
  },
  {
    id: 'queue-conversion-experiments',
    lane: 'growth',
    ownerAgentId: 'growth',
    title: 'Conversion experiment stack',
    summary:
      'Hold growth suggestions until parent demand and centre conversion signals are joined cleanly and demo data cannot masquerade as traction.',
    priority: 'later',
    status: 'blocked',
    href: '/admin/analytics',
    actionLabel: 'Open analytics',
  },
]

const MOCK_WORKFLOWS: AiCompanyWorkflowSection[] = [
  {
    id: 'daily_focus',
    title: 'Daily focus',
    description: 'Starter founder checklist until live priorities are wired, without losing canonical pilot truth.',
    items: MOCK_QUEUES.slice(0, 2),
  },
  {
    id: 'weekly_review',
    title: 'Weekly review',
    description: 'Read-only prompts for the founder rhythm.',
    items: MOCK_QUEUES.slice(1, 3),
  },
  {
    id: 'sprint_priorities',
    title: 'Sprint priorities',
    description: 'Stabilize the AI OS contracts before adding automation.',
    items: MOCK_QUEUES.slice(0, 3),
  },
]

const MOCK_RISKS: AiCompanyRiskItem[] = [
  {
    id: 'risk-mixed-truth',
    title: 'Demo/test records can distort founder decisions.',
    summary: founderTruth.summary,
    severity: 'watch',
    ownerAgentId: 'ceo',
    href: '/admin/ai-os',
    actionLabel: 'Review truth labels',
  },
  {
    id: 'risk-no-live-signals',
    title: 'Live founder signals are not wired yet.',
    summary: 'This scaffold is still mock-backed, so decisions should not be automated from it.',
    severity: 'watch',
    ownerAgentId: 'cto',
    href: '/admin/ai-os',
    actionLabel: 'Review plan',
  },
]

const MOCK_LIGHT_PERSONAS: ReadonlyArray<AiCompanyLightPersona> = [
  {
    agentId: 'ceo',
    title: 'CEO Light',
    audienceLabel: 'Founder or non-technical stakeholder',
    promise: 'A founder brief that keeps pilot truth, partner focus, and real revenue state aligned.',
    summary: 'Start with Bajabulile and Sakhisizwe, keep demo data out of the founder loop, and do not claim revenue that is not scheduled.',
    primaryCta: 'Open founder truth brief',
    readiness: 'pilot',
    href: getAiCompanyLightPersonaHref('ceo'),
  },
  {
    agentId: 'cto',
    title: 'CTO Light',
    audienceLabel: 'Technical lead or delivery stakeholder',
    promise: 'A concise reliability and delivery pulse without deep implementation detail.',
    summary: 'Highlight platform health, delivery risk, and the smallest safe technical move.',
    primaryCta: 'Open reliability pulse',
    readiness: 'pilot',
    href: getAiCompanyLightPersonaHref('cto'),
  },
]

function metricsForAgent(metricIds: string[]) {
  const idSet = new Set(metricIds)
  return MOCK_METRICS.filter((metric) => idSet.has(metric.id))
}

function buildAgentBriefs(): AiCompanyAgentBrief[] {
  return AI_COMPANY_AGENT_DEFINITIONS.map((definition) => {
    const content = AGENT_HEADLINES[definition.id]
    return {
      agentId: definition.id,
      status: AGENT_STATUS[definition.id],
      headline: content.headline,
      rationale: content.rationale,
      nextActions: content.nextActions,
      metrics: metricsForAgent(content.metricIds),
    }
  })
}

export function createMockAiCompanyOperatingSystemSnapshot(input?: {
  ownerEmail?: string | null
}): AiCompanyOperatingSystemSnapshot {
  const enabled = isAiCompanyOperatingSystemEnabled()
  const lightPersonasEnabled = isAiCompanyLightPersonasEnabled()

  return {
    enabled,
    featureFlag: AI_COMPANY_OS_FEATURE_FLAG,
    lightPersonasEnabled,
    lightPersonasFeatureFlag: AI_COMPANY_LIGHT_PERSONAS_FEATURE_FLAG,
    signalMode: 'mock',
    generatedAt: new Date().toISOString(),
    ownerEmail: input?.ownerEmail ?? null,
    definitions: [...AI_COMPANY_AGENT_DEFINITIONS],
    agents: buildAgentBriefs(),
    metrics: [...MOCK_METRICS],
    queues: [...MOCK_QUEUES],
    workflows: [...MOCK_WORKFLOWS],
    risks: [...MOCK_RISKS],
    dataNotes: [
      'This fallback snapshot is fully mock-backed.',
      ...founderTruth.notes,
      'Founder workflows and risks are scaffolds only until live selectors are available.',
      'Light persona cards remain admin-only and feature-flagged.',
    ],
    lightPersonas: lightPersonasEnabled
      ? MOCK_LIGHT_PERSONAS.filter((persona) =>
          AI_COMPANY_LIGHT_PERSONA_IDS.includes(persona.agentId)
        )
      : [],
    founderTruth,
  }
}

export function getAiCompanyOperatingSystemSnapshot(input?: {
  ownerEmail?: string | null
}): AiCompanyOperatingSystemSnapshot {
  return createMockAiCompanyOperatingSystemSnapshot(input)
}
