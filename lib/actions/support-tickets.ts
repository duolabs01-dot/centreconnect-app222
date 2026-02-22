'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateTicketStatus(ticketId: string, newStatus: string) {
  const supabaseAdmin = createAdminClient()

  // TODO: Add authorization check to ensure only platform_admin can update status
  // This could involve fetching the user from an authenticated session here
  // and checking their role. For now, assuming calling context ensures admin.

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()

  if (error) {
    console.error('Error updating ticket status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/support') // Revalidate the support page to show updated status
  return { success: true, data }
}
