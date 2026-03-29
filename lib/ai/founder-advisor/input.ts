import 'server-only'

import { loadLiveSignals } from '@/lib/ai/company-os/service'
import { getFounderVisibilityTruth } from '@/lib/founder/admin-truth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LiveSignals } from '@/lib/ai/company-os/service'
import type { FounderVisibilityTruth } from '@/lib/founder/admin-truth'

// The date the pilot period ends and Paystack billing activates.
// From CLAUDE.md: "Billing cliff: Pilot period ends May 1 2026"
const BILLING_CLIFF_DATE = new Date('2026-05-01T00:00:00Z')

function calcBillingCliffDaysOut(): number | null {
  const diff = BILLING_CLIFF_DATE.getTime() - Date.now()
  if (diff <= 0) return null // cliff has passed
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

/**
 * The full input context passed to the Founder Advisor synthesis function.
 * Combines live DB signals with the canonical founder truth.
 */
export type FounderAdvisorInput = {
  /** The founder's question or goal for this session. */
  goal: string
  /** Live business signals from Supabase (parallel queries). */
  signals: LiveSignals
  /** Canonical founder truth — filters real partners from demo/test rows. */
  founderTruth: FounderVisibilityTruth
  /** Days until May 1 2026 billing cliff, or null if already past. */
  billingCliffDaysOut: number | null
  /** ISO timestamp when this input was generated. */
  generatedAt: string
  /** 14-day lookback window start (ISO). */
  windowStart: string
  /** Window end = now (ISO). */
  windowEnd: string
  /** Supabase tables queried to produce this input. */
  dataSources: string[]
  /** Signal names that fell back to 0 due to query errors. */
  dataIssues: string[]
}

// The tables used by loadLiveSignals plus the real-partner query.
const DATA_SOURCES: string[] = [
  'ecd_centres',
  'user_profiles',
  'parent_notifications',
  'parent_form_submit_failures',
  'support_tickets',
  'notification_logs',
  'subscriptions',
  'invoices',
  'ecd_analytics_events',
  'payment_webhook_events',
  'claim_requests',
]

/**
 * Gather the full founder context needed to produce a FounderBrief.
 *
 * Runs two fetches in parallel:
 *   1. loadLiveSignals()     — 18 parallel business signal queries (existing service)
 *   2. real partner query    — ecd_centres WHERE is_real_partner = true
 *
 * The real partner query falls back gracefully if the migration has not been
 * applied yet (column missing → Supabase returns an error → falls back to the
 * hardcoded list in getFounderVisibilityTruth). This makes the migration safe
 * to deploy independently.
 *
 * Passes actual revenue figures (paidRevenue30dCents, pendingRevenueCents) to
 * getFounderVisibilityTruth so it reflects real state instead of hardcoded R0.
 */
export async function buildFounderBriefInput(goal: string): Promise<FounderAdvisorInput> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const windowEnd = now.toISOString()

  // Run signal loading and real-partner query in parallel
  const [{ signals, issues }, realPartnerResult] = await Promise.all([
    loadLiveSignals(),
    createAdminClient()
      .from('ecd_centres')
      .select('name')
      .eq('is_real_partner', true)
      .eq('is_deleted', false)
      .order('name'),
  ])

  // Graceful fallback: if the column doesn't exist yet (migration pending),
  // Supabase returns an error; we pass undefined and getFounderVisibilityTruth
  // falls back to FOUNDER_TRUTH_FOUNDING_PARTNERS.
  const realPartnerCentres =
    realPartnerResult.error || !realPartnerResult.data || realPartnerResult.data.length === 0
      ? undefined
      : realPartnerResult.data.map((r) => ({ name: r.name as string }))

  const founderTruth = getFounderVisibilityTruth({
    systemCentreCount: signals.centres.total,
    activeSubscriptionCount: signals.revenue.activeSubscriptions,
    pendingInvoiceCount: signals.revenue.pendingInvoices,
    paidInvoiceCountLast30d: signals.revenue.paidInvoices30d,
    // Dynamic partner list — overrides hardcoded names when available
    realPartnerCentres,
    // Actual revenue figures — replaces hardcoded R0 when billing starts
    paidRevenue30dCents: signals.revenue.paidRevenue30dCents,
    pendingRevenueCents: signals.revenue.pendingRevenueCents,
  })

  return {
    goal,
    signals,
    founderTruth,
    billingCliffDaysOut: calcBillingCliffDaysOut(),
    generatedAt: now.toISOString(),
    windowStart,
    windowEnd,
    dataSources: DATA_SOURCES,
    dataIssues: issues,
  }
}
