import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

type EntityType = 'service_application' | 'centre' | 'subscription' | 'invoice' | 'tenant' | 'bulk' | 'support_ticket'

type WritePlatformActivityInput = {
  actorUserId?: string | null
  actorEmail: string | null
  entityType: EntityType
  entityId?: string | null
  action: string
  summary: string
  details?: Record<string, unknown>
}

const ACTIVITY_LOG_ALERT_COOLDOWN_MS = 15 * 60 * 1000
const lastFailureAlertByKey = new Map<string, number>()

type ActivityLogFailureContext = {
  message: string
  action: string
  entityType: EntityType
  entityId: string | null
  actorEmail: string | null
  actorUserId: string | null
  summary: string
  detailsKeys: string[]
}

function toFailureContext(input: WritePlatformActivityInput, message: string): ActivityLogFailureContext {
  return {
    message,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorUserId: input.actorUserId ?? null,
    summary: input.summary,
    detailsKeys: Object.keys(input.details ?? {}),
  }
}

function logActivityFailure(context: ActivityLogFailureContext, event: 'platform_activity_log_write_failed' | 'platform_activity_log_write_forced_failure' | 'platform_activity_log_alert_failed') {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      domain: 'admin',
      event,
      ...context,
    })
  )
}

function shouldSendFailureAlert(alertKey: string, nowMs: number) {
  const previous = lastFailureAlertByKey.get(alertKey)
  if (previous && nowMs - previous < ACTIVITY_LOG_ALERT_COOLDOWN_MS) return false
  lastFailureAlertByKey.set(alertKey, nowMs)
  return true
}

async function sendFailureAlert(context: ActivityLogFailureContext, alertKey: string) {
  try {
    await sendPlatformAdminActionNotification({
      subject: 'Activity Log Write Failure',
      heading: 'A platform admin activity log write failed. Audit visibility may be degraded.',
      lines: [
        `Action: ${context.action}`,
        `Entity: ${context.entityType}:${context.entityId ?? '-'}`,
        `Actor: ${context.actorEmail ?? context.actorUserId ?? 'system'}`,
      ],
      details: {
        message: context.message,
        summary: context.summary,
        detailsKeys: context.detailsKeys,
        alertKey,
        cooldownMinutes: ACTIVITY_LOG_ALERT_COOLDOWN_MS / 60000,
      },
    })
  } catch (alertError) {
    const message = alertError instanceof Error ? alertError.message : String(alertError)
    logActivityFailure({ ...context, message }, 'platform_activity_log_alert_failed')
  }
}

export async function writePlatformActivity(
  admin: ReturnType<typeof createAdminClient>,
  input: WritePlatformActivityInput
) {
  const forceFailure =
    process.env.NODE_ENV !== 'production' &&
    process.env.CC_ACTIVITY_LOG_FORCE_FAIL === '1'

  if (forceFailure) {
    const context = toFailureContext(
      input,
      'Forced activity log failure simulation (CC_ACTIVITY_LOG_FORCE_FAIL=1)'
    )
    logActivityFailure(context, 'platform_activity_log_write_forced_failure')
    const alertKey = `${input.action}:${input.entityType}`
    if (shouldSendFailureAlert(alertKey, Date.now())) {
      void sendFailureAlert(context, alertKey)
    }
    return
  }

  const { error } = await admin.from('platform_admin_activity_log').insert({
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    summary: input.summary,
    details: input.details ?? {},
  })

  if (error) {
    const context = toFailureContext(input, error.message)
    logActivityFailure(context, 'platform_activity_log_write_failed')
    const alertKey = `${input.action}:${input.entityType}`
    if (shouldSendFailureAlert(alertKey, Date.now())) {
      void sendFailureAlert(context, alertKey)
    }
  }
}
