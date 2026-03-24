import 'server-only'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasMinimumTier, resolveInternalTier } from '@/lib/billing/tiers'
import type { InternalTier } from '@/lib/billing/plans'

type FeatureKey =
  | 'financials'
  | 'compliance'
  | 'report-cards'
  | 'website-builder'

const FEATURE_MINIMUM_TIER: Record<FeatureKey, InternalTier> = {
  financials: 'standard',
  compliance: 'basic',
  'report-cards': 'standard',
  'website-builder': 'basic',
}

async function getCurrentTier(supabase: SupabaseClient, ecdId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return resolveInternalTier(data?.tier, 'basic')
}

export async function hasEcdFeatureAccess(args: {
  supabase: SupabaseClient
  ecdId: string
  feature: FeatureKey
}) {
  const tier = await getCurrentTier(args.supabase, args.ecdId)
  const minimumTier = FEATURE_MINIMUM_TIER[args.feature]
  return {
    tier,
    minimumTier,
    allowed: hasMinimumTier(tier, minimumTier),
  }
}

export async function requireEcdFeatureAccess(args: {
  supabase: SupabaseClient
  ecdId: string
  feature: FeatureKey
  redirectTo?: string
}) {
  const access = await hasEcdFeatureAccess(args)
  if (!access.allowed) {
    redirect(args.redirectTo ?? `/ecd/dashboard?upgrade=${encodeURIComponent(args.feature)}`)
  }
  return access
}

