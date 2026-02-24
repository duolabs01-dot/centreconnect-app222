'use server'

import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export async function completeOnboarding() {
  const { supabase, ecdId } = await requireEcdPortalSession({ cached: false })
  await supabase
    .from('ecd_centres')
    .update({ onboarding_complete: true })
    .eq('id', ecdId)
  redirect('/ecd/dashboard')
}
