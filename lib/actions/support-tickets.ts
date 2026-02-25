'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateTicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  newStatus: z.enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed']),
})

export async function updateTicketStatus(ticketId: string, newStatus: string) {
  const parsed = updateTicketStatusSchema.safeParse({ ticketId, newStatus })
  if (!parsed.success) {
    return { success: false, error: 'Invalid ticket update request.' }
  }

  const platformAdmin = await requirePlatformAdmin()
  if (!platformAdmin) {
    return { success: false, error: 'Forbidden' }
  }

  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status: parsed.data.newStatus, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.ticketId)
    .select()

  if (error) {
    console.error('Error updating ticket status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/support') // Revalidate the support page to show updated status
  return { success: true, data }
}
