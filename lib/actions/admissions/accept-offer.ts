'use server'

import { createClient } from '@/lib/supabase/server'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

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

  const { data: refreshed } = await supabase
    .from('applications')
    .select(
      'id,parent_id,ecd_id,application_number,children(first_name,last_name),parents(id,alt_phone,user_profiles(full_name,phone)),ecd_centres(name,email)'
    )
    .eq('id', applicationId)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (refreshed) {
    const childRaw = refreshed.children
    const child = Array.isArray(childRaw) ? childRaw[0] : childRaw
    const parentRaw = refreshed.parents
    const parent = Array.isArray(parentRaw) ? parentRaw[0] : parentRaw
    const parentProfileRaw = parent?.user_profiles
    const parentProfile = Array.isArray(parentProfileRaw) ? parentProfileRaw[0] : parentProfileRaw
    const centreRaw = refreshed.ecd_centres
    const centre = Array.isArray(centreRaw) ? centreRaw[0] : centreRaw

    const childName = `${child?.first_name ?? 'Child'} ${child?.last_name ?? ''}`.trim()
    const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? null
    const centreName = centre?.name ?? 'your creche'

    await sendParentInAppAndWhatsappNotification(supabase, {
      parent_id: user.id,
      ecd_id: refreshed.ecd_id as string,
      application_id: applicationId,
      template_key: 'offer_acceptance',
      title: 'Enrollment confirmed',
      message: `You accepted ${childName}'s offer from ${centreName}. Enrollment is now confirmed.`,
      parent_phone: parentPhone,
      recipient_name: parentProfile?.full_name ?? 'Parent',
      whatsapp_event_type: 'offer_acceptance',
      whatsapp_event_key: `offer_acceptance:${applicationId}:${user.id}`,
      whatsapp_metadata: {
        child_name: childName,
        centre_name: centreName,
      },
      is_read: false,
    })

    await sendEcdInAppAndEmailNotification(supabase, {
      ecd_id: refreshed.ecd_id as string,
      application_id: applicationId,
      title: 'Offer accepted',
      message: `A parent accepted the offer for ${childName}.`,
      metadata: {
        kind: 'offer_accepted',
        application_id: applicationId,
        child_name: childName,
      },
      email_recipient: centre?.email ?? null,
      email_subject: `[CentreConnect] Offer accepted for ${childName}`,
      email_body: `<p>A parent accepted the offer for <strong>${childName}</strong>.</p><p>Open Admissions to continue onboarding.</p>`,
    })
  }

  return { success: true }
}

