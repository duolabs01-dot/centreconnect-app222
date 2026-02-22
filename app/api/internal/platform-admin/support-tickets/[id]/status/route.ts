import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'

const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed']),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ticketId = params.id
  const payload = await request.json().catch(() => null)
  const parsed = updateTicketStatusSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const newStatus = parsed.data.status

  const updateData: { status: string; resolved_at?: string | null } = { status: newStatus }
  if (newStatus === 'resolved' || newStatus === 'closed') {
    updateData.resolved_at = new Date().toISOString()
  } else {
    updateData.resolved_at = null // Clear resolved_at if moving out of resolved/closed
  }

  const { data: updatedTicket, error: ticketError } = await adminClient
    .from('support_tickets')
    .update(updateData)
    .eq('id', ticketId)
    .select('id,ticket_number,subject,status')
    .single()

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 400 })
  }

  await writePlatformActivity(adminClient, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'support_ticket',
    entityId: updatedTicket.id,
    action: 'update_ticket_status',
    summary: `Updated support ticket #${updatedTicket.ticket_number} status to ${updatedTicket.status}`,
    details: { newStatus: updatedTicket.status },
  })

  return NextResponse.json(
    {
      message: 'Ticket status updated successfully',
      ticket: updatedTicket,
    },
    { status: 200 }
  )
}