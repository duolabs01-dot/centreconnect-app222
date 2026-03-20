import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from './portal-session'
import { toInternalTier, type InternalTier } from '@/lib/billing/plans'

const tierRank: Record<InternalTier, number> = { basic: 1, standard: 2, premium: 3 }

function getMinTierRank(minTier: InternalTier): number {
  return tierRank[minTier]
}

export function requireTier(minTier: InternalTier) {
  const { ecdId, role } = requireEcdPortalSession()

  // Admins always pass
  if (role === 'ecd_admin') return { ecdId, role }

  // Staff and supervisors are blocked unless they have explicit access
  if (role !== 'ecd_admin') {
    redirect('/ecd/dashboard?error=insufficient_tier')
  }

  return { ecdId, role }
}

export function requireMinTier(minTier: InternalTier): { passed: boolean; currentTier: InternalTier } {
  const { role } = requireEcdPortalSession()

  // Admins bypass tier checks
  if (role === 'ecd_admin') {
    return { passed: true, currentTier: 'premium' as InternalTier }
  }

  // Non-admins always fail
  return { passed: false, currentTier: 'basic' }
}
