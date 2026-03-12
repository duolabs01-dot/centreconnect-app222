import { getInternalTierPrice, toInternalTier, type InternalTier } from '@/lib/billing/plans'

export function getTierRank(tier: InternalTier) {
  if (tier === 'basic') return 1
  if (tier === 'standard') return 2
  return 3
}

export function hasMinimumTier(currentTier: InternalTier, minimumTier: InternalTier) {
  return getTierRank(currentTier) >= getTierRank(minimumTier)
}

export function resolveInternalTier(input: string | null | undefined, fallback: InternalTier = 'basic') {
  return toInternalTier(input, fallback)
}

export function resolveTierMonthlyPrice(input: string | null | undefined, fallback: InternalTier = 'basic') {
  const tier = resolveInternalTier(input, fallback)
  return {
    tier,
    monthlyPrice: getInternalTierPrice(tier),
  }
}
