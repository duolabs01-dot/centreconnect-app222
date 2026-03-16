'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FetchManualChildResult = {
  success: boolean
  message: string
  child?: {
    id: string
    first_name: string | null
    last_name: string | null
    date_of_birth: string | null
    gender: string | null
    allergies: string[] | null
    medical_conditions: string[] | null
    special_needs: string | null
  }
}

export async function fetchManualChildAction(childId: string): Promise<FetchManualChildResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, message: 'You must be signed in to complete this profile.' }
  }

  const admin = createAdminClient()
  
  // Fetch child record using admin client to bypass RLS for this specific check
  const { data: child, error } = await admin
    .from('children')
    .select('id,parent_id,enrollment_status,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,special_needs,special_needs_notes,guardian_contacts')
    .eq('id', childId)
    .maybeSingle()

  if (error || !child) {
    return { success: false, message: 'Child profile not found.' }
  }

  // Security checks:
  // 1. Must not already be linked to a parent (or must be linked to THIS parent)
  if (child.parent_id && child.parent_id !== user.id) {
    return { success: false, message: 'This child profile is already linked to another account.' }
  }

  // 2. Must be in pending_parent status if not already linked
  if (!child.parent_id && child.enrollment_status !== 'pending_parent') {
    return { success: false, message: 'This child profile is not ready for completion.' }
  }

  // 3. Optional: Verify that the current user's email or phone matches a guardian contact
  // For now, we trust the link, but let's log the attempt
  console.log(`[fetchManualChildAction] User ${user.id} fetching manual child ${childId}`)

  return {
    success: true,
    message: 'Profile found',
    child: {
      id: child.id,
      first_name: child.first_name,
      last_name: child.last_name,
      date_of_birth: child.date_of_birth,
      gender: child.gender,
      allergies: Array.isArray(child.allergies) ? child.allergies : null,
      medical_conditions: Array.isArray(child.medical_conditions) ? child.medical_conditions : null,
      special_needs: child.special_needs || child.special_needs_notes || null,
    }
  }
}

export async function completeManualChildProfileAction(payload: {
  childId: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  allergies: string | null
  medical_conditions: string | null
  special_needs: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, message: 'You must be signed in to complete this profile.' }
  }

  const admin = createAdminClient()
  
  // Verify ownership/status again before update
  const { data: child, error: fetchError } = await admin
    .from('children')
    .select('id,parent_id,enrollment_status')
    .eq('id', payload.childId)
    .maybeSingle()

  if (fetchError || !child) {
    return { success: false, message: 'Child profile not found.' }
  }

  if (child.parent_id && child.parent_id !== user.id) {
    return { success: false, message: 'This child profile is already linked to another account.' }
  }

  const parseList = (val: string | null) => {
    if (!val) return null
    return val.split(',').map(s => s.trim()).filter(Boolean)
  }

  const { error: updateError } = await admin
    .from('children')
    .update({
      parent_id: user.id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      date_of_birth: payload.date_of_birth,
      gender: payload.gender,
      allergies: parseList(payload.allergies),
      medical_conditions: parseList(payload.medical_conditions),
      special_needs: payload.special_needs,
      enrollment_status: 'active', // Transition to active
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.childId)

  if (updateError) {
    console.error('[completeManualChildProfileAction] Update error:', updateError)
    return { success: false, message: 'Failed to update child profile.' }
  }

  revalidatePath('/parent/children')
  revalidatePath('/parent/dashboard')
  
  return { success: true, message: 'Profile completed successfully!' }
}
