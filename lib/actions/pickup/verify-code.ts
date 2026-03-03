'use server'

import { createClient } from '@/lib/supabase/server'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

type VerifyPickupCodeInput = {
  ecdId: string
  childId: string
  code: string
}

type VerifyPickupCodeResult =
  | {
      success: true
      childName: string
      guardianName: string | null
      childPhotoUrl: string | null
      whatsappHref?: string | null
    }
  | { success: false; error: 'invalid' | 'locked' | 'expired' | 'used' | 'not_found' | 'unauthorized' }

type VerifyPickupCodeError = VerifyPickupCodeResult extends { success: false; error: infer E }
  ? E
  : never

export async function verifyPickupCode(
  input: VerifyPickupCodeInput
): Promise<VerifyPickupCodeResult> {
  const normalizedCode = input.code.trim()
  if (!/^\d{6}$/.test(normalizedCode)) {
    return { success: false, error: 'invalid' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('verify_pickup_code_atomic', {
    p_ecd_id: input.ecdId,
    p_child_id: input.childId,
    p_code: normalizedCode,
  })

  if (error || !data) {
    return { success: false, error: 'invalid' }
  }

  const result = data as {
    success?: boolean
    error?: VerifyPickupCodeError
    childName?: string
    guardianName?: string | null
    childPhotoUrl?: string | null
  }

  if (!result.success) {
    return { success: false, error: result.error ?? 'invalid' }
  }

  const [{ data: child }, { data: centre }] = await Promise.all([
    supabase
      .from('children')
      .select('id,parent_id,first_name,last_name')
      .eq('id', input.childId)
      .eq('ecd_id', input.ecdId)
      .maybeSingle(),
    supabase.from('ecd_centres').select('name,email').eq('id', input.ecdId).maybeSingle(),
  ])

  let whatsappHref: string | null = null
  if (child?.parent_id) {
    const [{ data: parent }, { data: application }] = await Promise.all([
      supabase
        .from('parents')
        .select('id,alt_phone,user_profiles(phone)')
        .eq('id', child.parent_id)
        .maybeSingle(),
      supabase
        .from('applications')
        .select('id')
        .eq('ecd_id', input.ecdId)
        .eq('child_id', input.childId)
        .in('status', ['approved', 'enrolled', 'waitlisted'])
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const parentProfileRaw = parent?.user_profiles
    const parentProfile = Array.isArray(parentProfileRaw) ? parentProfileRaw[0] : parentProfileRaw
    const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? null
    const childName = `${child.first_name ?? 'Child'} ${child.last_name ?? ''}`.trim()
    const guardianName = result.guardianName ?? 'an authorised guardian'

    const parentNotification = await sendParentInAppAndWhatsappNotification(supabase as any, {
      parent_id: child.parent_id,
      ecd_id: input.ecdId,
      application_id: application?.id ?? null,
      template_key: 'pickup_verified',
      title: `${childName} pickup verified`,
      message: `${childName} was released to ${guardianName}. Pickup has been verified by your centre team.`,
      parent_phone: parentPhone,
      is_read: false,
    })
    whatsappHref = parentNotification.whatsappHref ?? null

    await sendEcdInAppAndEmailNotification(supabase as any, {
      ecd_id: input.ecdId,
      application_id: application?.id ?? null,
      title: 'Pickup verified',
      message: `${childName} pickup was verified for ${guardianName}.`,
      metadata: {
        kind: 'pickup_verified',
        child_id: input.childId,
      },
      email_recipient: centre?.email ?? null,
      email_subject: `[CentreConnect] Pickup verified for ${childName}`,
      email_body: `<p>Pickup was verified for <strong>${childName}</strong>.</p><p>Guardian: ${guardianName}.</p>`,
      is_read: false,
    })
  }

  return {
    success: true,
    childName: result.childName ?? 'Child',
    guardianName: result.guardianName ?? null,
    childPhotoUrl: result.childPhotoUrl ?? null,
    whatsappHref,
  }
}
