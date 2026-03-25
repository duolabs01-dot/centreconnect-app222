'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const genderSchema = z.enum(['male', 'female', 'other'])

export async function updateChildGenderAction(childId: string, gender: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, role, ecdId } = await requireEcdPortalSession()

  if (role !== 'ecd_admin') {
    return { ok: false, error: 'Only admins can update gender.' }
  }

  const parsed = genderSchema.safeParse(gender)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid gender value.' }
  }

  const { error } = await supabase
    .from('children')
    .update({ gender: parsed.data })
    .eq('id', childId)
    .eq('ecd_id', ecdId)

  if (error) {
    return { ok: false, error: 'Failed to save. Please try again.' }
  }

  revalidatePath(`/ecd/children/${childId}`)
  return { ok: true }
}
