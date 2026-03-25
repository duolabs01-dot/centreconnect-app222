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

type ChildDetailsForm = {
  enrollment_status: string
  enrollment_start_date: string
  class_id: string
  date_of_birth: string
  allergies: string
  medical_conditions: string
  special_needs: string
  dietary_restrictions: string
  doctor_name: string
  medical_aid_number: string
}

export async function updateChildDetailsAction(
  childId: string,
  form: ChildDetailsForm
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, role, ecdId } = await requireEcdPortalSession()

  if (role !== 'ecd_admin') {
    return { ok: false, error: 'Only admins can update child details.' }
  }

  const allergies = form.allergies
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const medical_conditions = form.medical_conditions
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const { error } = await supabase
    .from('children')
    .update({
      enrollment_status: form.enrollment_status || null,
      enrollment_start_date: form.enrollment_start_date || null,
      class_id: form.class_id || null,
      date_of_birth: form.date_of_birth || null,
      allergies,
      medical_conditions,
      special_needs: form.special_needs || null,
      dietary_restrictions: form.dietary_restrictions || null,
      doctor_name: form.doctor_name || null,
      medical_aid_number: form.medical_aid_number || null,
    })
    .eq('id', childId)
    .eq('ecd_id', ecdId)

  if (error) {
    return { ok: false, error: 'Failed to save. Please try again.' }
  }

  revalidatePath(`/ecd/children/${childId}`)
  return { ok: true }
}
