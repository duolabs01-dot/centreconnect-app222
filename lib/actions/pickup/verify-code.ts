'use server'

import { createClient } from '@/lib/supabase/server'

type VerifyPickupCodeInput = {
  ecdId: string
  childId: string
  code: string
}

type VerifyPickupCodeResult =
  | { success: true; childName: string; guardianName: string | null; childPhotoUrl: string | null }
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

  return {
    success: true,
    childName: result.childName ?? 'Child',
    guardianName: result.guardianName ?? null,
    childPhotoUrl: result.childPhotoUrl ?? null,
  }
}
