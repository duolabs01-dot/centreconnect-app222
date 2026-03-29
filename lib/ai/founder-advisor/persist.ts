import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { AGENT_VERSIONS } from '@/types/agent'
import type { FounderBrief } from '@/types/agent'

// ─────────────────────────────────────────────
// createAdvisorRunRecord
// Called FIRST, before any work begins.
// Creates the agent_run row with status 'running' so that every invocation
// — including failures — leaves a durable record.
// ─────────────────────────────────────────────

export async function createAdvisorRunRecord(params: {
  goal: string
  triggeredBy: string | null
  startedAt: string
}): Promise<{ runId: string }> {
  const admin = createAdminClient()

  const { data: run, error } = await admin
    .from('agent_runs')
    .insert({
      triggered_by: params.triggeredBy,
      trigger_type: 'manual',
      status: 'running',
      input: { goal: params.goal },
      summary: null,
      agent_version: AGENT_VERSIONS.agent,
      prompt_version: AGENT_VERSIONS.prompt,
      schema_version: AGENT_VERSIONS.schema,
      started_at: params.startedAt,
      completed_at: null,
    })
    .select('id')
    .single()

  if (error || !run) {
    throw new Error(
      `[founder-advisor] Failed to create agent_run: ${error?.message ?? 'no data returned'}`
    )
  }

  return { runId: run.id as string }
}

// ─────────────────────────────────────────────
// finalizeAdvisorRun
// Called on success.
// Writes messages + task, then updates the run to 'completed'.
// ─────────────────────────────────────────────

export async function finalizeAdvisorRun(params: {
  runId: string
  goal: string
  brief: FounderBrief
  systemPrompt: string
  userMessage: string
  rawResponse: string
}): Promise<{ taskId: string }> {
  const admin = createAdminClient()
  const completedAt = new Date().toISOString()

  // ── agent_messages ────────────────────────────────────────────────────────
  // task_id is null: messages are at orchestrator/run level for the single-
  // advisor v1 model (no specialist sub-tasks).
  const messages = [
    {
      run_id: params.runId,
      task_id: null as string | null,
      role: 'system' as const,
      content: params.systemPrompt,
      tool_name: null as string | null,
      tool_input: null as Record<string, unknown> | null,
      tool_output: null as Record<string, unknown> | null,
      sequence: 1,
    },
    {
      run_id: params.runId,
      task_id: null as string | null,
      role: 'user' as const,
      content: params.userMessage,
      tool_name: null as string | null,
      tool_input: null as Record<string, unknown> | null,
      tool_output: null as Record<string, unknown> | null,
      sequence: 2,
    },
    {
      run_id: params.runId,
      task_id: null as string | null,
      role: 'assistant' as const,
      content: params.rawResponse,
      tool_name: null as string | null,
      tool_input: null as Record<string, unknown> | null,
      tool_output: null as Record<string, unknown> | null,
      sequence: 3,
    },
  ]

  const { error: msgError } = await admin.from('agent_messages').insert(messages)
  if (msgError) {
    // Not fatal — the run and task are the durable records.
    // Messages are append-only audit trail; a gap is logged, not thrown.
    console.error('[founder-advisor] Failed to write agent_messages:', msgError.message)
  }

  // ── agent_task ─────────────────────────────────────────────────────────────
  // One task per run. Immediately 'ready_for_review' — waiting for Mandla.
  const { data: task, error: taskError } = await admin
    .from('agent_tasks')
    .insert({
      run_id: params.runId,
      agent_name: 'advisor',
      action_type: 'draft_only',
      status: 'ready_for_review',
      approval_required: true,
      input: { goal: params.goal },
      output: params.brief as unknown as Record<string, unknown>,
      confidence: params.brief.confidence,
      data_window_start: params.brief.data_freshness.window_start,
      data_window_end: params.brief.data_freshness.window_end,
      data_sources: params.brief.data_freshness.sources,
      agent_version: AGENT_VERSIONS.agent,
      prompt_version: AGENT_VERSIONS.prompt,
      schema_version: AGENT_VERSIONS.schema,
    })
    .select('id')
    .single()

  if (taskError || !task) {
    throw new Error(
      `[founder-advisor] Failed to create agent_task: ${taskError?.message ?? 'no data returned'}`
    )
  }

  // ── update run to completed ────────────────────────────────────────────────
  // Summary is a lightweight projection; full brief lives in agent_task.output.
  await admin
    .from('agent_runs')
    .update({
      status: 'completed',
      completed_at: completedAt,
      summary: {
        brief_summary: params.brief.summary,
        confidence: params.brief.confidence,
        priority_count: params.brief.top_priorities.length,
        action_count: params.brief.recommended_actions.length,
        flag_count: params.brief.risk_flags.length,
        task_id: task.id,
      },
    })
    .eq('id', params.runId)

  return { taskId: task.id as string }
}

// ─────────────────────────────────────────────
// failAdvisorRun
// Called on any error in the advisor pipeline.
// Marks the run as 'failed' with error context so the audit trail is complete.
// Never throws — failure to mark a run failed must not hide the original error.
// ─────────────────────────────────────────────

export async function failAdvisorRun(runId: string, errorMessage: string): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('agent_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        summary: {
          error: errorMessage,
          failed_at: new Date().toISOString(),
        },
      })
      .eq('id', runId)
  } catch (updateError) {
    // Do not rethrow — the original error in run.ts is what the caller needs.
    console.error(
      '[founder-advisor] Failed to mark run as failed. runId:',
      runId,
      'updateError:',
      updateError
    )
  }
}
