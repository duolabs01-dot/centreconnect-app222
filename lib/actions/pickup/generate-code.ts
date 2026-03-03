'use server'

import { createClient } from '@/lib/supabase/server'

type GeneratePickupCodeInput = {
  ecdId: string
  childId: string
  parentId: string
  generatedByRole: 'centre'
}

type GeneratePickupCodeResult =
  | { success: true; code: string }
  | { success: false; error: string }

function randomSixDigitCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

export async function generatePickupCode(
  input: GeneratePickupCodeInput
): Promise<GeneratePickupCodeResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (input.generatedByRole !== 'centre') {
    return { success: false, error: 'Pickup code generation is centre-managed only' }
  }

  const code = randomSixDigitCode()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase.rpc('generate_pickup_code_atomic', {
    p_ecd_id: input.ecdId,
    p_child_id: input.childId,
    p_parent_id: input.parentId,
    p_generated_by_role: input.generatedByRole,
    p_code: code,
    p_expires_at: expiresAt,
  })

  if (error || !data || data.success !== true) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      error?.message ||
      'Failed to generate pickup code'
    return { success: false, error: message }
  }

  return { success: true, code }
}
