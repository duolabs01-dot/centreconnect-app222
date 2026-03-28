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
  | 'attendance'          // Starter: current month only. Growth: full history.
  | 'attendance-history'  // Full history (month navigation) — Growth+
  | 'calendar'
  | 'daily-reports'
  | 'dsd-export'          // Starter: 1 per quarter with banner. Growth: unlimited.
  | 'dsd-export-unlimited'// Unlimited DOE exports — Growth+
  | 'employment'
  | 'applications'        // Starter: 3 full. Growth: unlimited.
  | 'applications-full'   // Full inbox, all applications — Growth+
  | 'communications'      // Parent messaging & announcements — Growth+
  | 'pickup'              // Safe QR-based pickup verification — Growth+

const FEATURE_MINIMUM_TIER: Record<FeatureKey, InternalTier> = {
  financials: 'standard',
  compliance: 'standard',
  'report-cards': 'standard',
  'website-builder': 'premium',
  attendance: 'basic',            // Starter gets current month
  'attendance-history': 'standard', // History requires Growth
  calendar: 'standard',
  'daily-reports': 'standard',
  'dsd-export': 'basic',          // Starter gets 1/quarter with banner
  'dsd-export-unlimited': 'standard', // Unlimited requires Growth
  employment: 'standard',
  applications: 'basic',          // Starter gets 3 full
  'applications-full': 'standard', // Full inbox requires Growth
  communications: 'standard',     // Parent messaging requires Growth
  pickup: 'standard',             // Safe QR pickup requires Growth
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

