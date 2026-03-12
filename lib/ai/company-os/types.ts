import type { FounderVisibilityTruth } from '@/lib/founder/admin-truth'

export const AI_COMPANY_AGENT_IDS = ['ceo', 'cto', 'ops', 'growth'] as const
export type AiCompanyAgentId = (typeof AI_COMPANY_AGENT_IDS)[number]
export type AiCompanyLightPersonaId = Extract<AiCompanyAgentId, 'ceo' | 'cto'>

export const AI_COMPANY_SURFACES = ['internal', 'light'] as const
export type AiCompanySurface = (typeof AI_COMPANY_SURFACES)[number]

export const AI_COMPANY_LANES = ['revenue', 'product', 'reliability', 'operations', 'growth'] as const
export type AiCompanyLane = (typeof AI_COMPANY_LANES)[number]

export const AI_COMPANY_STATUS_LEVELS = ['healthy', 'watch', 'critical'] as const
export type AiCompanyStatusLevel = (typeof AI_COMPANY_STATUS_LEVELS)[number]

export const AI_COMPANY_QUEUE_PRIORITIES = ['now', 'next', 'later'] as const
export type AiCompanyQueuePriority = (typeof AI_COMPANY_QUEUE_PRIORITIES)[number]

export const AI_COMPANY_QUEUE_STATUSES = ['ready', 'in_progress', 'blocked'] as const
export type AiCompanyQueueStatus = (typeof AI_COMPANY_QUEUE_STATUSES)[number]

export const AI_COMPANY_READINESS_LEVELS = ['pilot', 'later'] as const
export type AiCompanyReadinessLevel = (typeof AI_COMPANY_READINESS_LEVELS)[number]

export type AiCompanyMetric = {
  id: string
  label: string
  value: string
  change: string
  lane: AiCompanyLane
  status: AiCompanyStatusLevel
  href?: string
}

export type AiCompanyAgentDefinition = {
  id: AiCompanyAgentId
  name: string
  roleLabel: string
  mission: string
  decisionQuestion: string
  lanes: AiCompanyLane[]
  defaultSurface: AiCompanySurface
  supportedSurfaces: AiCompanySurface[]
}

export type AiCompanyAgentBrief = {
  agentId: AiCompanyAgentId
  status: AiCompanyStatusLevel
  headline: string
  rationale: string
  nextActions: string[]
  metrics: AiCompanyMetric[]
}

export type AiCompanyQueueItem = {
  id: string
  lane: AiCompanyLane
  ownerAgentId: AiCompanyAgentId
  title: string
  summary: string
  priority: AiCompanyQueuePriority
  status: AiCompanyQueueStatus
  href?: string
  actionLabel?: string
}

export type AiCompanyWorkflowSection = {
  id: 'daily_focus' | 'weekly_review' | 'sprint_priorities'
  title: string
  description: string
  items: AiCompanyQueueItem[]
}

export type AiCompanyRiskItem = {
  id: string
  title: string
  summary: string
  severity: AiCompanyStatusLevel
  ownerAgentId: AiCompanyAgentId
  href?: string
  actionLabel?: string
}

export type AiCompanyLightPersona = {
  agentId: AiCompanyLightPersonaId
  title: string
  audienceLabel: string
  promise: string
  summary: string
  primaryCta: string
  readiness: AiCompanyReadinessLevel
  href?: string
}

export type AiCompanySignalMode = 'live' | 'mixed' | 'mock'

export type AiCompanyOperatingSystemSnapshot = {
  enabled: boolean
  featureFlag: string
  lightPersonasEnabled: boolean
  lightPersonasFeatureFlag: string
  signalMode: AiCompanySignalMode
  generatedAt: string
  ownerEmail: string | null
  agents: AiCompanyAgentBrief[]
  definitions: AiCompanyAgentDefinition[]
  metrics: AiCompanyMetric[]
  queues: AiCompanyQueueItem[]
  workflows: AiCompanyWorkflowSection[]
  risks: AiCompanyRiskItem[]
  dataNotes: string[]
  lightPersonas: AiCompanyLightPersona[]
  founderTruth: FounderVisibilityTruth
}
