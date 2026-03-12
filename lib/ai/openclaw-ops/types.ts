import type { FounderVisibilityTruth } from '@/lib/founder/admin-truth'

export type OpenClawOpsMode = 'filesystem' | 'placeholder'

export type OpenClawCapabilityStatus = 'live' | 'future' | 'unavailable'

export type OpenClawWorkStatus = 'running' | 'recent' | 'queued' | 'completed' | 'failed' | 'idle'

export type OpenClawBadgeTone = 'active' | 'waiting' | 'complete' | 'issue' | 'draft'

export type OpenClawConfigSummary = {
  stateRoot: string | null
  workspace: string | null
  primaryModel: string | null
  maxConcurrent: number | null
  subagentMaxConcurrent: number | null
  gatewayMode: string | null
  gatewayBind: string | null
  gatewayPort: number | null
  lastTouchedAt: string | null
}

export type OpenClawAgentSummary = {
  id: string
  name: string
  kind: 'agent' | 'subagent'
  status: OpenClawWorkStatus
  statusLabel: string
  badgeTone: OpenClawBadgeTone
  sessionId: string | null
  sessionLabel: string | null
  sourceLabel: string
  updatedAt: string | null
  model: string | null
  channel: string | null
  summary: string
  lastWork: string | null
}

export type OpenClawWorkItem = {
  id: string
  title: string
  summary: string
  status: OpenClawWorkStatus
  statusLabel: string
  badgeTone: OpenClawBadgeTone
  ownerLabel: string
  sourceLabel: string
  startedAt: string | null
  updatedAt: string | null
  sessionId: string | null
}

export type OpenClawCommunicationItem = {
  id: string
  type: 'request' | 'update' | 'handoff'
  title: string
  excerpt: string
  ownerLabel: string
  sourceLabel: string
  timestamp: string | null
}

export type OpenClawCapability = {
  id: string
  label: string
  status: OpenClawCapabilityStatus
  detail: string
}

export type OpenClawOpsSnapshot = {
  mode: OpenClawOpsMode
  generatedAt: string
  config: OpenClawConfigSummary
  founderTruth: FounderVisibilityTruth
  agentCount: number
  subagentCount: number
  runningCount: number
  queuedCount: number
  completedCount: number
  lastUpdatedAt: string | null
  agents: OpenClawAgentSummary[]
  subagents: OpenClawAgentSummary[]
  activeWork: OpenClawWorkItem[]
  queuedWork: OpenClawWorkItem[]
  completedWork: OpenClawWorkItem[]
  communications: OpenClawCommunicationItem[]
  handoffs: OpenClawCommunicationItem[]
  capabilities: OpenClawCapability[]
  notes: string[]
}
