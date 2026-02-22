'use server'

import { createClient } from '@/lib/supabase/server'

type AcceptOfferResult = { success: true } | { success: false; error: string }

export async function acceptOffer(applicationId: string): Promise<AcceptOfferResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('id,parent_id,status')
    .eq('id', applicationId)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (fetchError || !application) {
    return { success: false, error: 'Application not found' }
  }

  if (application.status !== 'approved') {
    return { success: false, error: 'Offer is not available for acceptance' }
  }

  const { error: rpcError } = await supabase.rpc('accept_offer_atomic', {
    p_application_id: applicationId,
  })

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  return { success: true }
}

