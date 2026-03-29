export type FounderTruthCentre = {
  name: string
  label: 'Founding partner'
  note: string
}

export type FounderVisibilityTruth = {
  headline: string
  summary: string
  partnerCount: number
  foundingPartners: FounderTruthCentre[]
  systemCentreCount: number | null
  demoTesterCentreCount: number | null
  demoTesterSummary: string
  realRevenueCents: number
  scheduledRevenueCents: number
  revenueStatusLabel: string
  revenueSummary: string
  systemRevenueArtifactCount: number | null
  notes: string[]
}

type FounderVisibilityTruthInput = {
  systemCentreCount?: number | null
  activeSubscriptionCount?: number | null
  pendingInvoiceCount?: number | null
  paidInvoiceCountLast30d?: number | null
  /**
   * When provided (queried from ecd_centres WHERE is_real_partner = true),
   * overrides the hardcoded FOUNDER_TRUTH_FOUNDING_PARTNERS list.
   * If omitted or empty, falls back to the hardcoded list so existing callers
   * that have not been updated continue to work correctly.
   */
  realPartnerCentres?: Array<{ name: string }>
  /**
   * Actual paid revenue in ZAR cents (last 30 days).
   * When provided, replaces the hardcoded R0 pre-revenue assumption.
   */
  paidRevenue30dCents?: number | null
  /**
   * Pending scheduled revenue in ZAR cents (outstanding invoices).
   * When provided, replaces the hardcoded R0 scheduled assumption.
   */
  pendingRevenueCents?: number | null
}

/**
 * The hardcoded fallback list.
 * Used only when realPartnerCentres is not passed (backward-compatible callers).
 * New real partners should be added via the is_real_partner DB column, not here.
 */
export const FOUNDER_TRUTH_FOUNDING_PARTNERS: ReadonlyArray<FounderTruthCentre> = [
  {
    name: 'Bajabulile Day Care Centre',
    label: 'Founding partner',
    note: 'One of the two real onboarded ECD pilot partners.',
  },
  {
    name: 'Sakhisizwe Day Care Centre',
    label: 'Founding partner',
    note: 'One of the two real onboarded ECD pilot partners.',
  },
] as const

function formatRevenueCents(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function demoTesterSummary(count: number | null) {
  if (count === null) {
    return 'Any other ECDs visible in admin tables should be treated as demo/demo-test centres only.'
  }

  if (count <= 0) {
    return 'No extra centre rows are being counted beyond the real founding partners in this environment.'
  }

  if (count === 1) {
    return '1 other ECD record is demo/demo-test only and should not be treated as real pipeline.'
  }

  return `${count} other ECD records are demo/demo-test only and should not be treated as real pipeline.`
}

function revenueSummary(
  systemRevenueArtifactCount: number,
  realRevenueCents: number,
  scheduledRevenueCents: number
): string {
  if (realRevenueCents > 0 || scheduledRevenueCents > 0) {
    const parts: string[] = []
    if (realRevenueCents > 0) {
      parts.push(`${formatRevenueCents(realRevenueCents)} received in the last 30 days`)
    }
    if (scheduledRevenueCents > 0) {
      parts.push(`${formatRevenueCents(scheduledRevenueCents)} in pending scheduled collections`)
    }
    return parts.join('. ') + '.'
  }

  if (systemRevenueArtifactCount <= 0) {
    return 'No money is currently scheduled to be received right now.'
  }

  return `No money is currently scheduled to be received right now. ${systemRevenueArtifactCount} subscription or invoice records exist in admin tables, but they remain demo/test artifacts until a real partner centre is actually billed.`
}

export function getFounderVisibilityTruth(
  input: FounderVisibilityTruthInput = {}
): FounderVisibilityTruth {
  // ── Partner list ───────────────────────────────────────────────────────────
  // Prefer the DB-queried list when provided. Fall back to the hardcoded list
  // so existing callers that haven't been updated keep working.
  const resolvedPartners: FounderTruthCentre[] =
    input.realPartnerCentres && input.realPartnerCentres.length > 0
      ? input.realPartnerCentres.map(({ name }) => ({
          name,
          label: 'Founding partner' as const,
          note: 'Real onboarded ECD partner — confirmed from database.',
        }))
      : [...FOUNDER_TRUTH_FOUNDING_PARTNERS]

  const partnerCount = resolvedPartners.length
  const partnerNamesStr =
    resolvedPartners.length === 0
      ? 'no confirmed real partners'
      : resolvedPartners.map((p) => p.name).join(' and ')

  // ── Revenue ────────────────────────────────────────────────────────────────
  // Use actual figures when provided; default to 0 (pre-revenue state).
  const realRevenueCents =
    typeof input.paidRevenue30dCents === 'number' && input.paidRevenue30dCents > 0
      ? Math.round(input.paidRevenue30dCents)
      : 0
  const scheduledRevenueCents =
    typeof input.pendingRevenueCents === 'number' && input.pendingRevenueCents > 0
      ? Math.round(input.pendingRevenueCents)
      : 0

  // ── Counts ─────────────────────────────────────────────────────────────────
  const resolvedSystemCentreCount =
    typeof input.systemCentreCount === 'number' && Number.isFinite(input.systemCentreCount)
      ? Math.max(Math.trunc(input.systemCentreCount), 0)
      : null
  const resolvedDemoTesterCount =
    resolvedSystemCentreCount === null
      ? null
      : Math.max(resolvedSystemCentreCount - partnerCount, 0)
  const systemRevenueArtifactCount =
    (input.activeSubscriptionCount ?? 0) +
    (input.pendingInvoiceCount ?? 0) +
    (input.paidInvoiceCountLast30d ?? 0)

  const demoSummary = demoTesterSummary(resolvedDemoTesterCount)
  const revenueStateSummary = revenueSummary(
    systemRevenueArtifactCount,
    realRevenueCents,
    scheduledRevenueCents
  )

  const revenueStatusLabel =
    realRevenueCents > 0
      ? `${formatRevenueCents(realRevenueCents)} received (30d)`
      : 'Pre-revenue (R0)'

  const partnerCountWord = partnerCount === 1 ? 'is' : 'are'
  const ecdWord = partnerCount === 1 ? 'ECD' : 'ECDs'

  return {
    headline: 'Canonical founder truth for admin AI surfaces',
    summary: `Only ${partnerNamesStr} ${partnerCountWord} truly onboarded ${ecdWord}. ${demoSummary} ${revenueStateSummary}`,
    partnerCount,
    foundingPartners: resolvedPartners,
    systemCentreCount: resolvedSystemCentreCount,
    demoTesterCentreCount: resolvedDemoTesterCount,
    demoTesterSummary: demoSummary,
    realRevenueCents,
    scheduledRevenueCents,
    revenueStatusLabel,
    revenueSummary: revenueStateSummary,
    systemRevenueArtifactCount:
      systemRevenueArtifactCount > 0 ? systemRevenueArtifactCount : null,
    notes: [
      `Only ${partnerNamesStr} count as real onboarded ECD partners in founder/admin decision-making.`,
      demoSummary,
      revenueStateSummary,
      'Keep these labels on founder/admin surfaces so demo data does not leak into revenue or pipeline narratives.',
    ],
  }
}
