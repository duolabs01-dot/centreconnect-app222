"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePlatformActivity = writePlatformActivity;
require("server-only");
const platform_admin_action_notification_1 = require("@/lib/email/platform-admin-action-notification");
const ACTIVITY_LOG_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const ACTIVITY_LOG_ALERT_MARKER_ACTION = 'alert_activity_log_write_failure';
const ACTIVITY_LOG_ALERT_SUPPRESSED_ACTION = 'suppress_activity_log_write_failure';
const lastFailureAlertByKey = new Map();
const lastSuppressionMarkerByKey = new Map();
function toFailureContext(input, message) {
    var _a, _b, _c, _d;
    return {
        message,
        action: input.action,
        entityType: input.entityType,
        entityId: (_a = input.entityId) !== null && _a !== void 0 ? _a : null,
        actorEmail: (_b = input.actorEmail) !== null && _b !== void 0 ? _b : null,
        actorUserId: (_c = input.actorUserId) !== null && _c !== void 0 ? _c : null,
        summary: input.summary,
        detailsKeys: Object.keys((_d = input.details) !== null && _d !== void 0 ? _d : {}),
    };
}
function logActivityFailure(context, event) {
    console.error(JSON.stringify(Object.assign({ ts: new Date().toISOString(), domain: 'admin', event }, context)));
}
function shouldPersistSuppressionMarker(alertKey, nowMs) {
    const previous = lastSuppressionMarkerByKey.get(alertKey);
    if (previous && nowMs - previous < ACTIVITY_LOG_ALERT_COOLDOWN_MS)
        return false;
    lastSuppressionMarkerByKey.set(alertKey, nowMs);
    return true;
}
function isSuppressedInMemory(alertKey, nowMs) {
    const previous = lastFailureAlertByKey.get(alertKey);
    if (previous && nowMs - previous < ACTIVITY_LOG_ALERT_COOLDOWN_MS)
        return false;
    return true;
}
function readAlertKey(details) {
    if (!details || typeof details !== 'object')
        return null;
    const value = details.alertKey;
    if (typeof value !== 'string')
        return null;
    return value;
}
async function persistFailureSuppressionMarker(admin, context, alertKey, source, nowMs) {
    if (!shouldPersistSuppressionMarker(alertKey, nowMs))
        return;
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
    });
    if (error) {
        logActivityFailure(Object.assign(Object.assign({}, context), { message: error.message }), 'platform_activity_log_suppression_marker_write_failed');
    }
}
async function shouldSendFailureAlert(admin, context, alertKey, nowMs) {
    if (!isSuppressedInMemory(alertKey, nowMs)) {
        await persistFailureSuppressionMarker(admin, context, alertKey, 'memory', nowMs);
        return false;
    }
    const { data, error } = await admin
        .from('platform_admin_activity_log')
        .select('created_at,details')
        .eq('action', ACTIVITY_LOG_ALERT_MARKER_ACTION)
        .order('created_at', { ascending: false })
        .limit(25);
    if (error) {
        logActivityFailure(Object.assign(Object.assign({}, context), { message: error.message }), 'platform_activity_log_alert_marker_query_failed');
        lastFailureAlertByKey.set(alertKey, nowMs);
        return true;
    }
    const hasRecentMarker = (data !== null && data !== void 0 ? data : []).some((row) => {
        const markerKey = readAlertKey(row.details);
        if (markerKey !== alertKey)
            return false;
        const markerTs = Date.parse(String(row.created_at));
        if (Number.isNaN(markerTs))
            return false;
        return nowMs - markerTs < ACTIVITY_LOG_ALERT_COOLDOWN_MS;
    });
    if (hasRecentMarker) {
        lastFailureAlertByKey.set(alertKey, nowMs);
        await persistFailureSuppressionMarker(admin, context, alertKey, 'persistent', nowMs);
        return false;
    }
    lastFailureAlertByKey.set(alertKey, nowMs);
    return true;
}
async function persistFailureAlertMarker(admin, context, alertKey) {
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
    });
    if (error) {
        logActivityFailure(Object.assign(Object.assign({}, context), { message: error.message }), 'platform_activity_log_alert_marker_write_failed');
    }
}
async function sendFailureAlert(admin, context, alertKey) {
    var _a, _b, _c;
    try {
        await (0, platform_admin_action_notification_1.sendPlatformAdminActionNotification)({
            subject: 'Activity Log Write Failure',
            heading: 'A platform admin activity log write failed. Audit visibility may be degraded.',
            lines: [
                `Action: ${context.action}`,
                `Entity: ${context.entityType}:${(_a = context.entityId) !== null && _a !== void 0 ? _a : '-'}`,
                `Actor: ${(_c = (_b = context.actorEmail) !== null && _b !== void 0 ? _b : context.actorUserId) !== null && _c !== void 0 ? _c : 'system'}`,
            ],
            details: {
                message: context.message,
                summary: context.summary,
                detailsKeys: context.detailsKeys,
                alertKey,
                cooldownMinutes: ACTIVITY_LOG_ALERT_COOLDOWN_MS / 60000,
            },
        });
        await persistFailureAlertMarker(admin, context, alertKey);
    }
    catch (alertError) {
        const message = alertError instanceof Error ? alertError.message : String(alertError);
        logActivityFailure(Object.assign(Object.assign({}, context), { message }), 'platform_activity_log_alert_failed');
    }
}
async function writePlatformActivity(admin, input) {
    var _a, _b, _c;
    const forceFailure = process.env.NODE_ENV !== 'production' &&
        process.env.CC_ACTIVITY_LOG_FORCE_FAIL === '1';
    if (forceFailure) {
        const context = toFailureContext(input, 'Forced activity log failure simulation (CC_ACTIVITY_LOG_FORCE_FAIL=1)');
        logActivityFailure(context, 'platform_activity_log_write_forced_failure');
        const alertKey = `${input.action}:${input.entityType}`;
        if (await shouldSendFailureAlert(admin, context, alertKey, Date.now())) {
            void sendFailureAlert(admin, context, alertKey);
        }
        return;
    }
    const { error } = await admin.from('platform_admin_activity_log').insert({
        actor_user_id: (_a = input.actorUserId) !== null && _a !== void 0 ? _a : null,
        actor_email: input.actorEmail,
        entity_type: input.entityType,
        entity_id: (_b = input.entityId) !== null && _b !== void 0 ? _b : null,
        action: input.action,
        summary: input.summary,
        details: (_c = input.details) !== null && _c !== void 0 ? _c : {},
    });
    if (error) {
        const context = toFailureContext(input, error.message);
        logActivityFailure(context, 'platform_activity_log_write_failed');
        const alertKey = `${input.action}:${input.entityType}`;
        if (await shouldSendFailureAlert(admin, context, alertKey, Date.now())) {
            void sendFailureAlert(admin, context, alertKey);
        }
    }
}
