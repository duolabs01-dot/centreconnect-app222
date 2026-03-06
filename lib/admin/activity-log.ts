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
const ACTIVITY_LOG_ALERT_MARKER_ACTION = 'alert_activity_log_write_failure'
const ACTIVITY_LOG_ALERT_SUPPRESSED_ACTION = 'suppress_activity_log_write_failure'
const lastFailureAlertByKey = new Map<string, number>()
const lastSuppressionMarkerByKey = new Map<string, number>()

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

function logActivityFailure(
  context: ActivityLogFailureContext,
  event:
    | 'platform_activity_log_write_failed'
    | 'platform_activity_log_write_forced_failure'
    | 'platform_activity_log_alert_failed'
    | 'platform_activity_log_alert_marker_query_failed'
    | 'platform_activity_log_alert_marker_write_failed'
    | 'platform_activity_log_suppression_marker_write_failed'
) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      domain: 'admin',
      event,
      ...context,
    })
  )
}

function shouldPersistSuppressionMarker(alertKey: string, nowMs: number) {
  const previous = lastSuppressionMarkerByKey.get(alertKey)
  if (previous && nowMs - previous < ACTIVITY_LOG_ALERT_COOLDOWN_MS) return false
  lastSuppressionMarkerByKey.set(alertKey, nowMs)
  return true
}

function isSuppressedInMemory(alertKey: string, nowMs: number) {
  const previous = lastFailureAlertByKey.get(alertKey)
  if (previous && nowMs - previous < ACTIVITY_LOG_ALERT_COOLDOWN_MS) return false
  return true
}

function readAlertKey(details: unknown) {
  if (!details || typeof details !== 'object') return null
  const value = (details as Record<string, unknown>).alertKey
  if (typeof value !== 'string') return null
  return value
}

async function persistFailureSuppressionMarker(
  admin: ReturnType<typeof createAdminClient>,
  context: ActivityLogFailureContext,
  alertKey: string,
  source: 'memory' | 'persistent',
  nowMs: number
) {
  if (!shouldPersistSuppressionMarker(alertKey, nowMs)) return

  const { error } = await admin.from('platform_admin_activity_log').insert({
    actor_user_id: null,
    actor_email: context.actorEmail,
    entity_type: context.entityType,
    entity_id: context.entityId,
    action: ACTIVITY_LOG_ALERT_SUPPRESSED_ACTION,
    summary: `Activity log failure alert suppressed for ${context.action}`,
    details: {
      alertKey,
      sourceAction: context.action,
      sourceSummary: context.summary,
      suppressionSource: source,
      cooldownMinutes: ACTIVITY_LOG_ALERT_COOLDOWN_MS / 60000,
      detailsKeys: context.detailsKeys,
    },
  })

  if (error) {
    logActivityFailure({ ...context, message: error.message }, 'platform_activity_log_suppression_marker_write_failed')
  }
}

async function shouldSendFailureAlert(
  admin: ReturnType<typeof createAdminClient>,
  context: ActivityLogFailureContext,
  alertKey: string,
  nowMs: number
) {
  if (!isSuppressedInMemory(alertKey, nowMs)) {
    await persistFailureSuppressionMarker(admin, context, alertKey, 'memory', nowMs)
    return false
  }

  const { data, error } = await admin
    .from('platform_admin_activity_log')
    .select('created_at,details')
    .eq('action', ACTIVITY_LOG_ALERT_MARKER_ACTION)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    logActivityFailure({ ...context, message: error.message }, 'platform_activity_log_alert_marker_query_failed')
    lastFailureAlertByKey.set(alertKey, nowMs)
    return true
  }

  const hasRecentMarker = (data ?? []).some((row) => {
    const markerKey = readAlertKey(row.details)
    if (markerKey !== alertKey) return false
    const markerTs = Date.parse(String(row.created_at))
    if (Number.isNaN(markerTs)) return false
    return nowMs - markerTs < ACTIVITY_LOG_ALERT_COOLDOWN_MS
  })

  if (hasRecentMarker) {
    lastFailureAlertByKey.set(alertKey, nowMs)
    await persistFailureSuppressionMarker(admin, context, alertKey, 'persistent', nowMs)
    return false
  }

  lastFailureAlertByKey.set(alertKey, nowMs)
  return true
}

async function persistFailureAlertMarker(
  admin: ReturnType<typeof createAdminClient>,
  context: ActivityLogFailureContext,
  alertKey: string
) {
  const { error } = await admin.from('platform_admin_activity_log').insert({
    actor_user_id: null,
    actor_email: context.actorEmail,
    entity_type: context.entityType,
    entity_id: context.entityId,
    action: ACTIVITY_LOG_ALERT_MARKER_ACTION,
    summary: `Activity log failure alert sent for ${context.action}`,
    details: {
      alertKey,
      sourceAction: context.action,
      sourceSummary: context.summary,
      errorMessage: context.message,
      detailsKeys: context.detailsKeys,
    },
  })

  if (error) {
    logActivityFailure({ ...context, message: error.message }, 'platform_activity_log_alert_marker_write_failed')
  }
}

async function sendFailureAlert(
  admin: ReturnType<typeof createAdminClient>,
  context: ActivityLogFailureContext,
  alertKey: string
) {
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
    await persistFailureAlertMarker(admin, context, alertKey)
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
    if (await shouldSendFailureAlert(admin, context, alertKey, Date.now())) {
      void sendFailureAlert(admin, context, alertKey)
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
    if (await shouldSendFailureAlert(admin, context, alertKey, Date.now())) {
      void sendFailureAlert(admin, context, alertKey)
    }
  }
}
