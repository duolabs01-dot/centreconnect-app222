'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeGuardianAction(guardianId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to perform this action.' }
  }

  // Verify the guardian belongs to a child where the user is the primary parent
  const { data: guardian, error: fetchError } = await supabase
    .from('guardians')
    .select('id, parent_id, child_id')
    .eq('id', guardianId)
    .maybeSingle()

  if (fetchError || !guardian) {
    return { success: false, error: 'Guardian record not found.' }
  }

  // Security check: Only the primary parent who created/owns this link can remove it
  if (guardian.parent_id !== user.id) {
    return { success: false, error: 'You do not have permission to remove this co-parent.' }
  }

  try {
    // Delete the guardian record. 
    // If it was linked to a user_id, it just breaks that link for THIS child.
    const { error: deleteError } = await supabase
      .from('guardians')
      .delete()
      .eq('id', guardianId)

    if (deleteError) {
      return { success: false, error: 'Failed to remove the co-parent link.' }
    }
  } catch (err) {
    return { error: 'An unexpected error occurred while removing the co-parent. Please try again.' as const }
  }

  revalidatePath('/parent/profile/guardians')
  
  return { success: true, message: 'Co-parent removed successfully.' }
}
