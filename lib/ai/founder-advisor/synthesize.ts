import 'server-only'

import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'
import type { FounderAdvisorInput } from './input'
import type { FounderBrief } from '@/types/agent'

const GEMINI_ADVISOR_MODEL = process.env.GEMINI_ADVISOR_MODEL ?? 'gemini-2.5-flash'

// ─────────────────────────────────────────────
// Zod validation schema for Gemini's response.
// Every field matches the FounderBrief type contract.
// requires_approval is locked to `true` in v1 at the schema level.
// ─────────────────────────────────────────────

const founderBriefSchema = z.object({
  summary: z.string().min(10),
  confidence: z.enum(['high', 'medium', 'low']),
  top_priorities: z
    .array(
      z.object({
        title: z.string().min(1),
        why_it_matters: z.string().min(1),
        urgency: z.enum(['today', 'this_week', 'this_month']),
      })
    )
    .min(1)
    .max(5),
  recommended_actions: z
    .array(
      z.object({
        action: z.string().min(1),
        why: z.string().min(1),
        how: z.string().min(1),
        effort: z.enum(['low', 'medium', 'high']),
        requires_approval: z.literal(true),
      })
    )
    .max(6),
  what_can_wait: z.array(z.string().min(1)).max(5),
  risk_flags: z
    .array(
      z.object({
        flag: z.string().min(1),
        severity: z.enum(['info', 'warning', 'critical']),
        context: z.string().min(1),
      })
    )
    .max(6),
  required_inputs: z
    .array(
      z.object({
        decision: z.string().min(1),
        context: z.string().min(1),
        options: z.array(z.string()).optional(),
      })
    )
    .max(4),
  drafts: z
    .array(
      z.object({
        type: z.enum(['message', 'email', 'note']),
        title: z.string().min(1),
        content: z.string().min(1),
        recipient: z.string().optional(),
      })
    )
    .max(3)
    .optional(),
  data_freshness: z.object({
    window_start: z.string(),
    window_end: z.string(),
    sources: z.array(z.string()),
  }),
})

// ─────────────────────────────────────────────
// Signal context formatter
// Produces the business data section of the system prompt.
// Only includes real numbers — never invents or rounds.
// ─────────────────────────────────────────────

function formatZAR(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function formatSignalContext(input: FounderAdvisorInput): string {
  const { signals, founderTruth } = input

  const lines: string[] = [
    '## REAL PILOT PARTNERS',
    `- Real onboarded ECD partners: ${founderTruth.partnerCount}`,
    ...founderTruth.foundingPartners.map((p) => `  • ${p.name} — ${p.note}`),
    `- ${founderTruth.demoTesterSummary}`,
    '',
    '## REVENUE STATE',
    `- Real revenue confirmed collected: ${formatZAR(founderTruth.realRevenueCents)}`,
    `- Real scheduled collections: ${formatZAR(founderTruth.scheduledRevenueCents)}`,
    `- Revenue label: ${founderTruth.revenueStatusLabel}`,
    `- Active subscription rows in DB: ${signals.revenue.activeSubscriptions} (may include demo/test records)`,
    `- Pending invoice rows in DB: ${signals.revenue.pendingInvoices}`,
    input.billingCliffDaysOut !== null
      ? `- Billing cliff: ${input.billingCliffDaysOut} days until May 1 2026 (Paystack billing activates for real partners)`
      : '- Billing cliff: May 1 2026 has passed — Paystack billing should be active',
    '',
    '## CENTRE RECORDS',
    `- Total centre rows in system: ${signals.centres.total} (includes demo/test rows — see pilot partner truth above)`,
    `- Active/live centres: ${signals.centres.live}`,
    `- Centres stuck in onboarding (inactive, onboarding_complete = false): ${signals.centres.onboarding}`,
    `- Pending claim requests: ${signals.centres.claimRequests}`,
    `- ECD team accounts (admin/staff/supervisor roles): ${signals.centres.teamAccounts}`,
    '',
    '## PARENT ACCOUNTS',
    `- Total parent accounts: ${signals.parents.total}`,
    `- New parents registered in last 7 days: ${signals.parents.newLast7d}`,
    `- Unread parent welcome notifications: ${signals.parents.unreadWelcomes}`,
    `- Parent form submission failures in last 24h: ${signals.parents.failures24h}`,
    '',
    '## PARENT DEMAND (7-day / 14-day window)',
    `- Centre profile views (7d): ${signals.demand.profileViews7d}  |  prev 7d: ${signals.demand.profileViewsPrev7d}`,
    `- Contact clicks — WhatsApp or phone (7d): ${signals.demand.contactClicks7d}  |  prev: ${signals.demand.contactClicksPrev7d}`,
    `- Applications submitted (7d): ${signals.demand.applications7d}  |  prev: ${signals.demand.applicationsPrev7d}`,
    `- Application rate (views → applications): ${pct(signals.demand.applicationRate7d)}`,
    `- Contact rate (views → contacts): ${pct(signals.demand.contactRate7d)}`,
    `- Total tracked analytics events (14d): ${signals.demand.trackedEvents14d}`,
    '',
    '## SUPPORT & OPERATIONS',
    `- Open support tickets: ${signals.support.openTickets}`,
    `- High-priority open tickets: ${signals.support.highPriorityOpenTickets}`,
    `- Failed ECD/admin invite delivery logs: ${signals.support.failedInvites}`,
    '',
    '## RELIABILITY',
    `- Payment webhook failures (last 24h): ${signals.reliability.paymentFailures24h}`,
    `- Lagged payment webhooks (received, unprocessed >15 min): ${signals.reliability.laggedWebhooks}`,
  ]

  if (input.dataIssues.length > 0) {
    lines.push(
      '',
      '## DATA GAPS (these signals fell back to 0 due to query errors)',
      ...input.dataIssues.map((issue) => `  • ${issue}`),
      'Do not assume health for these signals. Flag them as required_inputs if relevant.'
    )
  }

  return lines.join('\n')
}

// ─────────────────────────────────────────────
// System prompt builder
// ─────────────────────────────────────────────

function buildSystemPrompt(input: FounderAdvisorInput): string {
  return `You are the Founder Advisor for CentreConnect — a South African SaaS platform for Early Childhood Development (ECD) centres, built in Alexandra, Johannesburg by Mandla Ngwenya (Mandla).

ROLE:
You are a decision-support and draft-generation system only. You produce ranked analysis and draft recommendations for Mandla's review. You do not take actions, send messages, post content, or trigger any automations. Every output requires Mandla's explicit review and approval before anything happens.

BUSINESS CONTEXT:
- Product: Marketplace where South African parents find, apply to, and stay connected with crèches (ECD centres)
- Currency: ZAR (South African Rand)
- Primary market: Gauteng, South Africa (Alexandra, Sandton, Tembisa)
- Pricing tiers: Starter R0/month · Growth R299/month · Pro R499/month
- Pilot offer: First month free + waived onboarding fee until end of April 2026
- Stage: Pre-revenue. Two real pilot partners onboarded.

STRICT GROUNDING RULES — do not break these:
1. Only reference data points that appear in the LIVE SIGNAL CONTEXT below.
2. Do not invent numbers, centre names, events, or revenue figures not in the data.
3. The ONLY real onboarded ECD partners are Bajabulile Day Care Centre and Sakhisizwe Day Care Centre. Every other centre row is a demo/test record and must never be treated as real pipeline.
4. Real confirmed revenue is R0. Do not imply any money has been received unless founderTruth.realRevenueCents > 0.
5. If a signal is zero or missing, state it honestly. Do not assume health from absence of data.
6. Every recommended_action MUST have requires_approval = true. This is a system constraint — never output false here.
7. If you cannot answer the goal confidently from the available data, add a required_inputs item explaining what Mandla needs to supply.
8. Do not generate drafts unless the goal clearly calls for one.

LIVE SIGNAL CONTEXT (generated at ${input.generatedAt}):
${formatSignalContext(input)}

OUTPUT FORMAT:
Return a single JSON object. No markdown, no prose outside the JSON. Schema:
{
  "summary": "2–3 sentence synthesis of the current business state as it relates to the goal",
  "confidence": "high" | "medium" | "low",
  "top_priorities": [
    { "title": "...", "why_it_matters": "...", "urgency": "today" | "this_week" | "this_month" }
  ],
  "recommended_actions": [
    { "action": "...", "why": "...", "how": "...", "effort": "low" | "medium" | "high", "requires_approval": true }
  ],
  "what_can_wait": ["string", ...],
  "risk_flags": [
    { "flag": "...", "severity": "info" | "warning" | "critical", "context": "..." }
  ],
  "required_inputs": [
    { "decision": "...", "context": "...", "options": ["..."] }
  ],
  "drafts": [
    { "type": "message" | "email" | "note", "title": "...", "content": "...", "recipient": "..." }
  ],
  "data_freshness": {
    "window_start": "${input.windowStart}",
    "window_end": "${input.windowEnd}",
    "sources": ${JSON.stringify(input.dataSources)}
  }
}
Omit "drafts" if none are needed. Include "options" in required_inputs only if you have concrete suggestions.`
}

// ─────────────────────────────────────────────
// JSON extraction helper
// Strips any wrapping markdown code blocks Gemini may add.
// ─────────────────────────────────────────────

function extractJsonObject(raw: string): string {
  // Remove ```json ... ``` wrapping if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenced) return fenced[1].trim()

  // Otherwise find the outermost { }
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return raw.slice(start, end + 1)

  return raw.trim()
}

// ─────────────────────────────────────────────
// Result type — carries both the validated brief and the raw
// conversation turns so the persist layer can store them.
// ─────────────────────────────────────────────

export type SynthesisResult = {
  brief: FounderBrief
  systemPrompt: string
  userMessage: string
  rawResponse: string
}

// ─────────────────────────────────────────────
// Main synthesis function
// ─────────────────────────────────────────────

export async function synthesizeFounderBrief(
  input: FounderAdvisorInput
): Promise<SynthesisResult> {
  const apiKey = process.env.GEMINI_ADVISOR_API_KEY?.trim()
  if (!apiKey) throw new Error('GEMINI_ADVISOR_API_KEY is not configured')

  const client = new GoogleGenAI({ apiKey })
  const systemPrompt = buildSystemPrompt(input)
  const userMessage = `FOUNDER GOAL: ${input.goal}`

  const response = await client.models.generateContent({
    model: GEMINI_ADVISOR_MODEL,
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    },
  })

  const rawResponse = response.text?.trim() ?? ''
  if (!rawResponse) throw new Error('Gemini returned an empty response for the founder brief')

  const jsonText = extractJsonObject(rawResponse)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error(
      `Gemini response was not valid JSON. First 300 chars: ${rawResponse.slice(0, 300)}`
    )
  }

  const validated = founderBriefSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(
      `FounderBrief schema validation failed: ${validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    )
  }

  return {
    brief: validated.data as FounderBrief,
    systemPrompt,
    userMessage,
    rawResponse,
  }
}
