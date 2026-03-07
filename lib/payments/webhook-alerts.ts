import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { logBillingEvent } from '@/lib/payments/structured-logs'

type WebhookAlertActor = {
  userId?: string | null
  email?: string | null
  sourceLabel?: string
}

type CheckWebhookHealthInput = {
  admin: ReturnType<typeof createAdminClient>
  actor?: WebhookAlertActor
  now?: Date
}

export type WebhookHealthResult = {
  failedCount24h: number
  laggedReceivedCount: number
  maxLagMinutes: number
  alertSent: boolean
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function minutesBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000))
}

export async function checkAndAlertWebhookHealth(input: CheckWebhookHealthInput): Promise<WebhookHealthResult> {
  const now = input.now ?? new Date()
  const lagThresholdMinutes = parsePositiveInt(process.env.BILLING_WEBHOOK_LAG_ALERT_MINUTES, 15)
  const failureLookbackHours = parsePositiveInt(process.env.BILLING_WEBHOOK_FAILURE_ALERT_LOOKBACK_HOURS, 24)
  const failureLookbackStart = new Date(now.getTime() - failureLookbackHours * 60 * 60 * 1000).toISOString()
  const lagCutoff = new Date(now.getTime() - lagThresholdMinutes * 60 * 1000).toISOString()

  const [{ count: failedCount }, laggedResult] = await Promise.all([
    input.admin
      .from('payment_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', failureLookbackStart),
    input.admin
      .from('payment_webhook_events')
      .select('id,created_at')
      .eq('status', 'received')
      .lt('created_at', lagCutoff)
      .order('created_at', { ascending: true })
      .limit(50),
  ])

  const laggedRows = laggedResult.data ?? []
  const oldestLag = laggedRows[0]?.created_at ? minutesBetween(new Date(laggedRows[0].created_at), now) : 0

  const result: WebhookHealthResult = {
    failedCount24h: failedCount ?? 0,
    laggedReceivedCount: laggedRows.length,
    maxLagMinutes: oldestLag,
    alertSent: false,
  }

  if (result.failedCount24h === 0 && result.laggedReceivedCount === 0) {
    logBillingEvent('webhook_health_ok', {
      failedCount24h: result.failedCount24h,
      laggedReceivedCount: result.laggedReceivedCount,
      lagThresholdMinutes,
    })
    return result
  }

  const { data: recentAlert } = await input.admin
    .from('platform_admin_activity_log')
    .select('created_at,details')
    .eq('action', 'alert_webhook_pipeline')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentAlert?.created_at) {
    const last = new Date(recentAlert.created_at)
    const sameMetrics =
      Number((recentAlert.details as any)?.failedCount24h ?? -1) === result.failedCount24h &&
      Number((recentAlert.details as any)?.laggedReceivedCount ?? -1) === result.laggedReceivedCount
    const withinOneHour = now.getTime() - last.getTime() < 60 * 60 * 1000
    if (sameMetrics && withinOneHour) {
      logBillingEvent('webhook_health_alert_suppressed', {
        failedCount24h: result.failedCount24h,
        laggedReceivedCount: result.laggedReceivedCount,
      }, 'warn')
      return result
    }
  }

  await writePlatformActivity(input.admin, {
    actorUserId: input.actor?.userId ?? null,
    actorEmail: input.actor?.email ?? null,
    entityType: 'bulk',
    action: 'alert_webhook_pipeline',
    summary: 'Webhook pipeline alert triggered for failures or reconciliation lag',
    details: {
      failedCount24h: result.failedCount24h,
      laggedReceivedCount: result.laggedReceivedCount,
      maxLagMinutes: result.maxLagMinutes,
      lagThresholdMinutes,
      failureLookbackHours,
      actor: input.actor?.sourceLabel ?? 'system',
    },
  })

  void sendPlatformAdminActionNotification({
    subject: 'Webhook Pipeline Alert',
    heading: 'Webhook failures or reconciliation lag detected.',
    lines: [
      `Failed events (last ${failureLookbackHours}h): ${result.failedCount24h}`,
      `Lagged received events: ${result.laggedReceivedCount}`,
      `Oldest lag: ${result.maxLagMinutes} minutes`,
      `Actor: ${input.actor?.email ?? input.actor?.sourceLabel ?? 'system'}`,
    ],
    details: {
      failedCount24h: result.failedCount24h,
      laggedReceivedCount: result.laggedReceivedCount,
      maxLagMinutes: result.maxLagMinutes,
      lagThresholdMinutes,
      failureLookbackHours,
    },
  })

  logBillingEvent(
    'webhook_health_alert_sent',
    {
      failedCount24h: result.failedCount24h,
      laggedReceivedCount: result.laggedReceivedCount,
      maxLagMinutes: result.maxLagMinutes,
    },
    'warn'
  )

  return { ...result, alertSent: true }
}
