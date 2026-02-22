'use server'

import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const requestCancellationSchema = z.object({
  ecdId: z.string().uuid(),
  reason: z.string().min(10),
  confirmation: z.literal('CANCEL'),
})

export async function requestCancellationAction(input: unknown) {
  const parsed = requestCancellationSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input', fields: parsed.error.flatten().fieldErrors }

  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' || session.ecdId !== parsed.data.ecdId) return { error: 'Unauthorized' as const }

  const { data: existing } = await session.supabase
    .from('support_tickets')
    .select('id')
    .eq('ecd_id', parsed.data.ecdId)
    .eq('category', 'billing')
    .eq('status', 'open')
    .ilike('subject', 'Subscription cancellation request%')
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return { error: 'A cancellation request is already open. Support will contact you.' as const }
  }

  const ticketNumber = `BILL-${Date.now().toString().slice(-8)}`
  const { error } = await session.supabase.from('support_tickets').insert({
    ticket_number: ticketNumber,
    ecd_id: parsed.data.ecdId,
    created_by: session.user.id,
    subject: 'Subscription cancellation request',
    description: parsed.data.reason,
    category: 'billing',
    priority: 3,
    status: 'open',
  })

  if (error) return { error: error.message }
  return { success: true as const }
}
