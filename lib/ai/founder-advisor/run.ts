import 'server-only'

import { buildFounderBriefInput } from './input'
import { synthesizeFounderBrief } from './synthesize'
import { createAdvisorRunRecord, finalizeAdvisorRun, failAdvisorRun } from './persist'
import type { FounderBrief } from '@/types/agent'

export type FounderAdvisorResult = {
  runId: string
  taskId: string
  brief: FounderBrief
  generatedAt: string
  /** Signal names that fell back to 0 due to query errors (for caller awareness). */
  dataIssues: string[]
}

/**
 * Run the Founder Advisor for a single goal/question.
 *
 * Audit guarantee: an agent_run row is written at the START of every
 * invocation — before signals are loaded or Gemini is called. If any step
 * fails, the run is marked status = 'failed' with error context. No advisor
 * invocation is invisible in the system of record.
 *
 * Flow:
 *   1. Write agent_run (status: 'running')  ← durable record exists from here
 *   2. Load live signals + founder truth
 *   3. Synthesize FounderBrief via Gemini
 *   4. Write messages + task, update run to 'completed'
 *   On any error in steps 2–4: update run to 'failed', then rethrow.
 *
 * Read-only with respect to business records.
 * Only writes to agent system audit tables.
 */
export async function runFounderAdvisor(params: {
  goal: string
  triggeredBy?: string | null
}): Promise<FounderAdvisorResult> {
  const startedAt = new Date().toISOString()

  // Step 1: Write the run record immediately — before any work.
  // If this fails (DB down), we let the error surface; there is nothing else
  // we can do. All other failures are caught and recorded against this runId.
  const { runId } = await createAdvisorRunRecord({
    goal: params.goal,
    triggeredBy: params.triggeredBy ?? null,
    startedAt,
  })

  try {
    // Step 2: Load live business signals + canonical founder truth
    const input = await buildFounderBriefInput(params.goal)

    // Step 3: Synthesize the FounderBrief via Gemini
    const synthesis = await synthesizeFounderBrief(input)

    // Step 4: Write messages + task, update run to completed
    const { taskId } = await finalizeAdvisorRun({
      runId,
      goal: params.goal,
      brief: synthesis.brief,
      systemPrompt: synthesis.systemPrompt,
      userMessage: synthesis.userMessage,
      rawResponse: synthesis.rawResponse,
    })

    return {
      runId,
      taskId,
      brief: synthesis.brief,
      generatedAt: input.generatedAt,
      dataIssues: input.dataIssues,
    }
  } catch (error) {
    // Record the failure before rethrowing so every invocation is auditable.
    const message = error instanceof Error ? error.message : String(error)
    await failAdvisorRun(runId, message)
    throw error
  }
}
