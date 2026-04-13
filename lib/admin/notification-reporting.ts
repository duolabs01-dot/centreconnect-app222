import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type NotificationDeliverySummary = {
  total: number
  sent: number
  queued: number
  failed: number
  delivered: number
  opened: number
}

export const OPERATIONAL_NOTIFICATION_EVENTS = [
  'attendance_register_reminder',
  'password_activation_day1',
  'password_activation_day3',
  'password_activation_day7',
  'password_activation_weekly',
] as const

export async function getNotificationDeliverySummary(
  admin: AdminClient,
  input: {
    sinceIso: string
    eventTypes?: string[]
  }
): Promise<NotificationDeliverySummary> {
  const query = admin
    .from('notification_logs')
    .select('status', { count: 'exact' })
    .gte('created_at', input.sinceIso)

  const filteredQuery = input.eventTypes?.length
    ? query.in('event_type', input.eventTypes)
    : query

  const { data, error, count } = await filteredQuery
  if (error) {
    console.error('Failed to load notification summary:', error.message)
    return { total: 0, sent: 0, queued: 0, failed: 0, delivered: 0, opened: 0 }
  }

  const rows = data ?? []
  const byStatus = rows.reduce<Record<string, number>>((acc, row: any) => {
    const status = String(row.status ?? '').toLowerCase()
    if (!status) return acc
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})

  return {
    total: count ?? rows.length,
    sent: byStatus.sent ?? 0,
    queued: byStatus.queued ?? 0,
    failed: byStatus.failed ?? 0,
    delivered: byStatus.delivered ?? 0,
    opened: byStatus.opened ?? 0,
  }
}

export async function getRecentNotificationFailures(
  admin: AdminClient,
  input: {
    sinceIso: string
    limit?: number
    eventTypes?: string[]
  }
) {
  const query = admin
    .from('notification_logs')
    .select('id,centre_id,event_type,channel,recipient,status,provider,error_message,created_at,ecd_centres(name)')
    .eq('status', 'failed')
    .gte('created_at', input.sinceIso)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 20)

  const filteredQuery = input.eventTypes?.length
    ? query.in('event_type', input.eventTypes)
    : query

  const { data, error } = await filteredQuery
  if (error) {
    console.error('Failed to load notification failures:', error.message)
    return []
  }

  return data ?? []
}
