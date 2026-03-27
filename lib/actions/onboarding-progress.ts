'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

/**
 * Valid onboarding step keys.
 * These match the keys stored in ecd_centres.onboarding_progress JSONB column.
 */
export type OnboardingStepKey =
  | 'logo'
  | 'cover'
  | 'description'
  | 'children'
  | 'attendance'
  | 'pickup'
  | 'published'

/**
 * Stamps a completed onboarding step with the current timestamp.
 * Idempotent — if the step is already stamped, it is NOT overwritten
 * (we preserve the original completion time).
 *
 * Call this from ECD server actions/pages whenever a key step is completed.
 *
 * Example:
 *   await stampOnboardingStep('children')  // after first child is saved
 *   await stampOnboardingStep('logo')      // after logo is uploaded
 */
export async function stampOnboardingStep(step: OnboardingStepKey): Promise<void> {
  try {
    const { ecdId } = await requireEcdPortalSession()
    const admin = createAdminClient()

    // Only set the key if it isn't already present (preserve original timestamp)
    await admin.rpc('stamp_onboarding_step', {
      p_ecd_id: ecdId,
      p_step_key: step,
      p_completed_at: new Date().toISOString(),
    })
  } catch {
    // Non-fatal — onboarding progress is a best-effort record
  }
}

/**
 * Reads the onboarding progress map for the current centre.
 * Returns a record of { step_key: ISO timestamp } for completed steps.
 * Missing keys = step not yet completed.
 */
export async function getOnboardingProgress(): Promise<Partial<Record<OnboardingStepKey, string>>> {
  try {
    const { supabase, ecdId } = await requireEcdPortalSession()
    const { data } = await supabase
      .from('ecd_centres')
      .select('onboarding_progress')
      .eq('id', ecdId)
      .maybeSingle()

    return (data?.onboarding_progress as Partial<Record<OnboardingStepKey, string>>) ?? {}
  } catch {
    return {}
  }
}
