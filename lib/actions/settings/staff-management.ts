'use server'

import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const inviteStaffSchema = z.object({
  ecdId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ecd_staff', 'ecd_admin']),
  name: z.string().min(2),
})

const removeStaffSchema = z.object({
  ecdId: z.string().uuid(),
  staffUserId: z.string().uuid(),
})

const changeRoleSchema = z.object({
  ecdId: z.string().uuid(),
  staffUserId: z.string().uuid(),
  role: z.enum(['ecd_staff', 'ecd_admin']),
})

async function assertAdminAccess(ecdId: string) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' || session.ecdId !== ecdId) return null
  return session
}

export async function inviteStaffAction(input: unknown) {
  const parsed = inviteStaffSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' as const }
  const session = await assertAdminAccess(parsed.data.ecdId)
  if (!session) return { error: 'Only centre admins can invite staff' as const }

  const ticketNumber = `STAFF-${Date.now().toString().slice(-8)}`
  const description = [
    'Staff invite request',
    `Name: ${parsed.data.name}`,
    `Email: ${parsed.data.email}`,
    `Role requested: ${parsed.data.role}`,
    'Please process invitation and assignment.',
  ].join('\n')

  const { error } = await session.supabase.from('support_tickets').insert({
    ticket_number: ticketNumber,
    ecd_id: parsed.data.ecdId,
    created_by: session.user.id,
    subject: `Staff invitation request - ${parsed.data.email}`,
    description,
    category: 'application',
    priority: 2,
    status: 'open',
  })

  if (error) return { error: error.message }
  return { success: true as const, message: 'Invitation request submitted.' as const }
}

export async function removeStaffAction(input: unknown) {
  const parsed = removeStaffSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' as const }
  const session = await assertAdminAccess(parsed.data.ecdId)
  if (!session) return { error: 'Unauthorized' as const }
  if (parsed.data.staffUserId === session.user.id) return { error: 'You cannot remove yourself.' as const }

  const ticketNumber = `STAFF-${Date.now().toString().slice(-8)}`
  const { error } = await session.supabase.from('support_tickets').insert({
    ticket_number: ticketNumber,
    ecd_id: parsed.data.ecdId,
    created_by: session.user.id,
    subject: `Staff removal request - ${parsed.data.staffUserId}`,
    description: `Please remove user ${parsed.data.staffUserId} from this centre.`,
    category: 'application',
    priority: 3,
    status: 'open',
  })
  if (error) return { error: error.message }
  return { success: true as const }
}

export async function changeStaffRoleAction(input: unknown) {
  const parsed = changeRoleSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' as const }
  const session = await assertAdminAccess(parsed.data.ecdId)
  if (!session) return { error: 'Unauthorized' as const }

  const ticketNumber = `STAFF-${Date.now().toString().slice(-8)}`
  const { error } = await session.supabase.from('support_tickets').insert({
    ticket_number: ticketNumber,
    ecd_id: parsed.data.ecdId,
    created_by: session.user.id,
    subject: `Staff role change request - ${parsed.data.staffUserId}`,
    description: `Please set role to ${parsed.data.role} for user ${parsed.data.staffUserId}.`,
    category: 'application',
    priority: 2,
    status: 'open',
  })
  if (error) return { error: error.message }
  return { success: true as const }
}
