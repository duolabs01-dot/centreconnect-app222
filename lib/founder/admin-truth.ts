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
}

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

function demoTesterSummary(count: number | null) {
  if (count === null) {
    return 'Any other ECDs visible in admin tables should be treated as demo/demo-test centres only.'
  }

  if (count <= 0) {
    return 'No extra centre rows are being counted beyond the two founding partners in this environment.'
  }

  if (count === 1) {
    return '1 other ECD record is demo/demo-test only and should not be treated as real pipeline.'
  }

  return `${count} other ECD records are demo/demo-test only and should not be treated as real pipeline.`
}

function revenueSummary(systemRevenueArtifactCount: number) {
  if (systemRevenueArtifactCount <= 0) {
    return 'No money is currently scheduled to be received right now.'
  }

  return `No money is currently scheduled to be received right now. ${systemRevenueArtifactCount} subscription or invoice records exist in admin tables, but they remain demo/test artifacts until a real partner centre is actually billed.`
}

export function getFounderVisibilityTruth(
  input: FounderVisibilityTruthInput = {}
): FounderVisibilityTruth {
  const partnerCount = FOUNDER_TRUTH_FOUNDING_PARTNERS.length
  const resolvedSystemCentreCount =
    typeof input.systemCentreCount === 'number' && Number.isFinite(input.systemCentreCount)
      ? Math.max(Math.trunc(input.systemCentreCount), 0)
      : null
  const resolvedDemoTesterCount =
    resolvedSystemCentreCount === null ? null : Math.max(resolvedSystemCentreCount - partnerCount, 0)
  const systemRevenueArtifactCount =
    (input.activeSubscriptionCount ?? 0) +
    (input.pendingInvoiceCount ?? 0) +
    (input.paidInvoiceCountLast30d ?? 0)

  const demoSummary = demoTesterSummary(resolvedDemoTesterCount)
  const revenueStateSummary = revenueSummary(systemRevenueArtifactCount)

  return {
    headline: 'Canonical founder truth for admin AI surfaces',
    summary: `Only Bajabulile Day Care Centre and Sakhisizwe Day Care Centre are truly onboarded ECDs. ${demoSummary} ${revenueStateSummary}`,
    partnerCount,
    foundingPartners: [...FOUNDER_TRUTH_FOUNDING_PARTNERS],
    systemCentreCount: resolvedSystemCentreCount,
    demoTesterCentreCount: resolvedDemoTesterCount,
    demoTesterSummary: demoSummary,
    realRevenueCents: 0,
    scheduledRevenueCents: 0,
    revenueStatusLabel: 'Pre-revenue (R0)',
    revenueSummary: revenueStateSummary,
    systemRevenueArtifactCount:
      systemRevenueArtifactCount > 0 ? systemRevenueArtifactCount : null,
    notes: [
      'Only Bajabulile Day Care Centre and Sakhisizwe Day Care Centre count as real onboarded ECD partners in founder/admin decision-making.',
      demoSummary,
      revenueStateSummary,
      'Keep these labels on founder/admin surfaces so demo data does not leak into revenue or pipeline narratives.',
    ],
  }
}
