// types/agent.ts
// TypeScript types for the v1 AI agent system.
//
// Design contract (v1):
//   - Agents are analysis-and-draft only.
//   - Every task has approval_required = true.
//   - Agents may not send emails, mutate business records, post content, or
//     trigger external operations that produce side effects on behalf of the
//     business. AI inference APIs (e.g. Gemini) are permitted for synthesis.
//   - All access is platform_admin only.

// ─────────────────────────────────────────────
// Enums (mirroring DB CHECK constraints)
// ─────────────────────────────────────────────

export type AgentRunStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type AgentRunTriggerType =
  | 'manual'
  | 'scheduled'
  | 'webhook'

/**
 * Agents available in v1.
 * - 'advisor' — Founder Advisor / Chief of Staff (the only active agent in v1)
 * - 'system'  — internal/meta tasks
 *
 * Extend this union (and the DB CHECK constraint) when new agents are introduced.
 */
export type AgentName = 'advisor' | 'system'

/**
 * Action category per task.
 * v1: always 'draft_only'. Schema anticipates future values.
 *
 * - draft_only          — produces a draft artifact for human use; no side effects
 * - safe_internal_write — may write to an internal audit/log table
 * - external_action     — calls an external API or sends a message (blocked in v1)
 */
export type AgentActionType =
  | 'draft_only'
  | 'safe_internal_write'
  | 'external_action'

/**
 * Approval state machine for agent_tasks:
 *
 *   draft → ready_for_review → approved → executed
 *                            ↘ rejected
 *                            ↘ expired
 */
export type AgentTaskStatus =
  | 'draft'
  | 'ready_for_review'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'expired'

/**
 * Confidence signal attached to every task output.
 *
 * - high   — enough data to recommend action now
 * - medium — recommendation is useful but missing one key input
 * - low    — weak evidence, exploratory only
 */
export type AgentConfidence = 'high' | 'medium' | 'low'

/** Roles in the conversation log (mirrors OpenAI/Anthropic conventions). */
export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool'

// ─────────────────────────────────────────────
// Row types (DB shape — all timestamps are ISO strings from Supabase)
// ─────────────────────────────────────────────

export interface AgentRun {
  id: string
  triggered_by: string | null
  trigger_type: AgentRunTriggerType
  status: AgentRunStatus
  input: Record<string, unknown>
  summary: Record<string, unknown> | null
  agent_version: string
  prompt_version: string
  schema_version: string
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface AgentTask {
  id: string
  run_id: string
  agent_name: AgentName
  action_type: AgentActionType
  status: AgentTaskStatus
  approval_required: boolean
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  confidence: AgentConfidence | null
  data_window_start: string | null
  data_window_end: string | null
  data_sources: string[]
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  executed_at: string | null
  expires_at: string | null
  agent_version: string
  prompt_version: string
  schema_version: string
  created_at: string
  updated_at: string
}

export interface AgentMessage {
  id: string
  run_id: string
  task_id: string | null
  role: AgentMessageRole
  content: string | null
  tool_name: string | null
  tool_input: Record<string, unknown> | null
  tool_output: Record<string, unknown> | null
  sequence: number
  created_at: string
}

// ─────────────────────────────────────────────
// Insert types (omit server-generated fields)
// ─────────────────────────────────────────────

export type AgentRunInsert = Omit<AgentRun,
  | 'id'
  | 'created_at'
  | 'started_at'
> & {
  id?: string
  started_at?: string
}

export type AgentTaskInsert = Omit<AgentTask,
  | 'id'
  | 'created_at'
  | 'updated_at'
> & {
  id?: string
}

export type AgentMessageInsert = Omit<AgentMessage,
  | 'id'
  | 'created_at'
> & {
  id?: string
}

// ─────────────────────────────────────────────
// Approval action payloads
// ─────────────────────────────────────────────

export interface ApproveTaskPayload {
  task_id: string
  approved_by: string
}

export interface RejectTaskPayload {
  task_id: string
  rejected_by: string
  rejection_reason: string
}

// ─────────────────────────────────────────────
// Query helpers — joined shapes used in admin UI
// ─────────────────────────────────────────────

/** agent_task row with its parent run attached (for list views). */
export interface AgentTaskWithRun extends AgentTask {
  run: Pick<AgentRun, 'id' | 'trigger_type' | 'status' | 'created_at' | 'triggered_by'>
}

/** agent_run row with its tasks and message count (for detail views). */
export interface AgentRunWithTasks extends AgentRun {
  tasks: AgentTask[]
  message_count: number
}

// ─────────────────────────────────────────────
// FounderBrief — v1 output contract
//
// The single structured output produced by the Founder Advisor for every run.
// Stored as JSONB in agent_tasks.output, promoted to agent_runs.summary.
// All outputs require Mandla's judgment before any action is taken.
// ─────────────────────────────────────────────

/** Urgency classification for a top priority item. */
export type FounderBriefUrgency = 'today' | 'this_week' | 'this_month'

/** Severity classification for a risk flag. */
export type FounderBriefSeverity = 'info' | 'warning' | 'critical'

/** Effort estimate for a recommended action. */
export type FounderBriefEffort = 'low' | 'medium' | 'high'

/** One priority item: what matters now and why. */
export interface FounderBriefPriority {
  title: string
  why_it_matters: string
  urgency: FounderBriefUrgency
}

/**
 * One recommended action: what to do, why, and how.
 * requires_approval = true means Mandla must explicitly confirm before it happens.
 * All v1 actions have requires_approval = true.
 */
export interface FounderBriefAction {
  action: string
  why: string
  how: string
  effort: FounderBriefEffort
  requires_approval: boolean
}

/** A risk or concern the advisor has surfaced. */
export interface FounderBriefFlag {
  flag: string
  severity: FounderBriefSeverity
  context: string
}

/** A decision that still needs Mandla's call — advisor cannot resolve it. */
export interface FounderBriefDecision {
  decision: string
  context: string
  options?: string[]
}

/**
 * An optional draft artifact (message, email, or note) the advisor has prepared.
 * Drafts are for Mandla's review only — nothing is sent automatically.
 */
export interface FounderBriefDraft {
  type: 'message' | 'email' | 'note'
  title: string
  content: string
  recipient?: string
}

/** Data freshness declaration — the advisor must state what window it used. */
export interface FounderBriefDataFreshness {
  window_start: string   // ISO timestamp
  window_end: string     // ISO timestamp
  sources: string[]      // e.g. ['ecd_centres', 'subscriptions', 'applications']
}

/**
 * The full structured output of one Founder Advisor run.
 *
 * Stored as: agent_tasks.output (verbatim) and agent_runs.summary (promoted copy).
 *
 * Answers prompts like:
 *   "What should I do today?"
 *   "Where is revenue risk this week?"
 *   "Why are centres stalling?"
 *   "What should I ignore today?"
 */
export interface FounderBrief {
  /** 2–3 sentence synthesis of the current state of the business. */
  summary: string
  confidence: AgentConfidence
  /** What matters now — ordered by urgency. */
  top_priorities: FounderBriefPriority[]
  /** Specific actions Mandla should take, with effort estimates. */
  recommended_actions: FounderBriefAction[]
  /** Things that can safely be deprioritised right now. */
  what_can_wait: string[]
  /** Risks or concerns the advisor has flagged. */
  risk_flags: FounderBriefFlag[]
  /** Decisions that still require Mandla's explicit call. */
  required_inputs: FounderBriefDecision[]
  /** Optional draft messages or notes the advisor has prepared for review. */
  drafts?: FounderBriefDraft[]
  /** Data window and sources used to produce this brief. */
  data_freshness: FounderBriefDataFreshness
}

// ─────────────────────────────────────────────
// Version constants — bump these when prompts or schema change
// ─────────────────────────────────────────────

export const AGENT_VERSIONS = {
  agent: 'v1',
  prompt: 'v1',
  schema: 'v1',
} as const satisfies Record<'agent' | 'prompt' | 'schema', string>
