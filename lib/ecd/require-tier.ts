import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from './portal-session'
import { toInternalTier, type InternalTier } from '@/lib/billing/plans'

const tierRank: Record<InternalTier, number> = { basic: 1, standard: 2, premium: 3 }

/**
 * Guard a page by minimum required tier.
 * Usage: await requireMinTier('standard') — redirects Starter users to /ecd/dashboard
 */
export async function requireMinTier(minTier: InternalTier) {
  const { supabase, ecdId, role, user } = await requireEcdPortalSession()

  // ECD admins always pass — they manage the centre, tier applies to the centre not the admin role
  if (role === 'ecd_admin') return { supabase, ecdId, role, user }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('ecd_id', ecdId)
    .maybeSingle()

  const currentTier = toInternalTier(sub?.tier ?? null, 'basic')

  if (tierRank[currentTier] < tierRank[minTier]) {
    redirect('/ecd/dashboard?error=tier_required')
  }

  return { supabase, ecdId, role, user }
}
