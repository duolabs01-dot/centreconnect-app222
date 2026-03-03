import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type InviteLogType = 'email' | 'sms' | 'welcome_pack'
export type InviteLogStatus = 'sent' | 'opened' | 'claimed'

type WriteInviteLogInput = {
  centreId?: string | null
  ownerEmail?: string | null
  ownerPhone?: string | null
  inviteType: InviteLogType
  sentAt?: string
  status?: InviteLogStatus
  notes?: string | null
}

export async function writeInviteLog(
  admin: ReturnType<typeof createAdminClient>,
  input: WriteInviteLogInput
) {
  const normalizedEmail = input.ownerEmail?.trim().toLowerCase() || null
  const normalizedPhone = input.ownerPhone?.trim() || null

  const { error } = await admin.from('invite_logs').insert({
    centre_id: input.centreId ?? null,
    owner_email: normalizedEmail,
    owner_phone: normalizedPhone,
    invite_type: input.inviteType,
    sent_at: input.sentAt ?? new Date().toISOString(),
    status: input.status ?? 'sent',
    notes: input.notes ?? null,
  })

  if (error) {
    console.error('Failed to write invite log:', error.message)
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}
