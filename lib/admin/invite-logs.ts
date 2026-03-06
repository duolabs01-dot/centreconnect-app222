import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationLogStatus } from '@/lib/admin/notification-logs'
import { createNotificationEventKey } from '@/lib/admin/notification-logs'

export type InviteLogType = 'email' | 'whatsapp' | 'welcome_pack'
export type InviteLogStatus = 'sent' | 'opened' | 'claimed'

type WriteInviteLogInput = {
  centreId?: string | null
  ownerEmail?: string | null
  ownerPhone?: string | null
  inviteType: InviteLogType
  sentAt?: string
  status?: InviteLogStatus
  notes?: string | null
  notificationEventKey?: string | null
  notificationStatus?: NotificationLogStatus
  notificationProvider?: string
  notificationProviderMessageId?: string | null
  notificationPayload?: Record<string, unknown>
  notificationErrorMessage?: string | null
}

export async function writeInviteLog(
  admin: ReturnType<typeof createAdminClient>,
  input: WriteInviteLogInput
) {
  const normalizedEmail = input.ownerEmail?.trim().toLowerCase() || null
  const normalizedPhone = input.ownerPhone?.trim() || null
  const sentAt = input.sentAt ?? new Date().toISOString()

  const { error } = await admin.from('invite_logs').insert({
    centre_id: input.centreId ?? null,
    owner_email: normalizedEmail,
    owner_phone: normalizedPhone,
    invite_type: input.inviteType,
    sent_at: sentAt,
    status: input.status ?? 'sent',
    notes: input.notes ?? null,
  })

  if (error) {
    console.error('Failed to write invite log:', error.message)
    return { success: false as const, error: error.message }
  }

  const eventType = input.inviteType === 'welcome_pack' ? 'welcome_pack' : 'admin_access_invite'
  const channel = input.inviteType === 'whatsapp' ? 'whatsapp' : 'email'
  const recipient = channel === 'whatsapp' ? normalizedPhone ?? normalizedEmail : normalizedEmail
  const inviteStatus = input.status ?? 'sent'
  const notificationStatus = input.notificationStatus ?? (inviteStatus as NotificationLogStatus)

  const { error: notificationError } = await admin.from('notification_logs').upsert({
    centre_id: input.centreId ?? null,
    event_key:
      input.notificationEventKey?.trim() || createNotificationEventKey(eventType, input.centreId),
    event_type: eventType,
    channel,
    recipient,
    status: notificationStatus,
    provider: input.notificationProvider?.trim() || 'invite_log_writer',
    provider_message_id: input.notificationProviderMessageId?.trim() || null,
    payload: {
      source: 'invite_logs',
      invite_type: input.inviteType,
      notes: input.notes ?? null,
      ...(input.notificationPayload ?? {}),
    },
    error_message: input.notificationErrorMessage ?? null,
    updated_at: new Date().toISOString(),
    created_at: sentAt,
  }, { onConflict: 'event_key,channel' })

  if (notificationError) {
    console.error('Failed to mirror invite log to notification_logs:', notificationError.message)
  }

  return { success: true as const }
}
