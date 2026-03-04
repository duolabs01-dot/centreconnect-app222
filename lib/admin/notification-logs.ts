import 'server-only'

import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationLogChannel = 'email' | 'whatsapp'
export type NotificationLogStatus = 'sent' | 'opened' | 'claimed' | 'failed'

type AdminClient = ReturnType<typeof createAdminClient>

export type UpsertNotificationLogInput = {
  centreId?: string | null
  eventKey: string
  eventType: string
  channel: NotificationLogChannel
  recipient?: string | null
  status: NotificationLogStatus
  provider: string
  providerMessageId?: string | null
  payload?: Record<string, unknown>
  errorMessage?: string | null
  createdAt?: string
}

export function createNotificationEventKey(prefix: string, centreId?: string | null) {
  const parts = [prefix.trim(), centreId?.trim() || 'global', Date.now().toString(), randomUUID()]
  return parts.join(':')
}

export async function upsertNotificationLog(
  admin: AdminClient,
  input: UpsertNotificationLogInput
) {
  const { error } = await admin.from('notification_logs').upsert(
    {
      centre_id: input.centreId ?? null,
      event_key: input.eventKey,
      event_type: input.eventType,
      channel: input.channel,
      recipient: input.recipient?.trim() || null,
      status: input.status,
      provider: input.provider,
      provider_message_id: input.providerMessageId ?? null,
      payload: input.payload ?? {},
      error_message: input.errorMessage ?? null,
      created_at: input.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_key,channel' }
  )

  if (error) {
    console.error('Failed to upsert notification log:', error.message)
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}
