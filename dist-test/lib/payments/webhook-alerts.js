"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndAlertWebhookHealth = checkAndAlertWebhookHealth;
require("server-only");
const platform_admin_action_notification_1 = require("@/lib/email/platform-admin-action-notification");
const activity_log_1 = require("@/lib/admin/activity-log");
const structured_logs_1 = require("@/lib/payments/structured-logs");
function parsePositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return Math.floor(parsed);
}
function minutesBetween(from, to) {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}
async function checkAndAlertWebhookHealth(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const now = (_a = input.now) !== null && _a !== void 0 ? _a : new Date();
    const lagThresholdMinutes = parsePositiveInt(process.env.BILLING_WEBHOOK_LAG_ALERT_MINUTES, 15);
    const failureLookbackHours = parsePositiveInt(process.env.BILLING_WEBHOOK_FAILURE_ALERT_LOOKBACK_HOURS, 24);
    const failureLookbackStart = new Date(now.getTime() - failureLookbackHours * 60 * 60 * 1000).toISOString();
    const lagCutoff = new Date(now.getTime() - lagThresholdMinutes * 60 * 1000).toISOString();
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
    ]);
    const laggedRows = (_b = laggedResult.data) !== null && _b !== void 0 ? _b : [];
    const oldestLag = ((_c = laggedRows[0]) === null || _c === void 0 ? void 0 : _c.created_at) ? minutesBetween(new Date(laggedRows[0].created_at), now) : 0;
    const result = {
        failedCount24h: failedCount !== null && failedCount !== void 0 ? failedCount : 0,
        laggedReceivedCount: laggedRows.length,
        maxLagMinutes: oldestLag,
        alertSent: false,
    };
    if (result.failedCount24h === 0 && result.laggedReceivedCount === 0) {
        (0, structured_logs_1.logBillingEvent)('webhook_health_ok', {
            failedCount24h: result.failedCount24h,
            laggedReceivedCount: result.laggedReceivedCount,
            lagThresholdMinutes,
        });
        return result;
    }
    const { data: recentAlert } = await input.admin
        .from('platform_admin_activity_log')
        .select('created_at,details')
        .eq('action', 'alert_webhook_pipeline')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (recentAlert === null || recentAlert === void 0 ? void 0 : recentAlert.created_at) {
        const last = new Date(recentAlert.created_at);
        const sameMetrics = Number((_e = (_d = recentAlert.details) === null || _d === void 0 ? void 0 : _d.failedCount24h) !== null && _e !== void 0 ? _e : -1) === result.failedCount24h &&
            Number((_g = (_f = recentAlert.details) === null || _f === void 0 ? void 0 : _f.laggedReceivedCount) !== null && _g !== void 0 ? _g : -1) === result.laggedReceivedCount;
        const withinOneHour = now.getTime() - last.getTime() < 60 * 60 * 1000;
        if (sameMetrics && withinOneHour) {
            (0, structured_logs_1.logBillingEvent)('webhook_health_alert_suppressed', {
                failedCount24h: result.failedCount24h,
                laggedReceivedCount: result.laggedReceivedCount,
            }, 'warn');
            return result;
        }
    }
    await (0, activity_log_1.writePlatformActivity)(input.admin, {
        actorUserId: (_j = (_h = input.actor) === null || _h === void 0 ? void 0 : _h.userId) !== null && _j !== void 0 ? _j : null,
        actorEmail: (_l = (_k = input.actor) === null || _k === void 0 ? void 0 : _k.email) !== null && _l !== void 0 ? _l : null,
        entityType: 'bulk',
        action: 'alert_webhook_pipeline',
        summary: 'Webhook pipeline alert triggered for failures or reconciliation lag',
        details: {
            failedCount24h: result.failedCount24h,
            laggedReceivedCount: result.laggedReceivedCount,
            maxLagMinutes: result.maxLagMinutes,
            lagThresholdMinutes,
            failureLookbackHours,
            actor: (_o = (_m = input.actor) === null || _m === void 0 ? void 0 : _m.sourceLabel) !== null && _o !== void 0 ? _o : 'system',
        },
    });
    void (0, platform_admin_action_notification_1.sendPlatformAdminActionNotification)({
        subject: 'Webhook Pipeline Alert',
        heading: 'Webhook failures or reconciliation lag detected.',
        lines: [
            `Failed events (last ${failureLookbackHours}h): ${result.failedCount24h}`,
            `Lagged received events: ${result.laggedReceivedCount}`,
            `Oldest lag: ${result.maxLagMinutes} minutes`,
            `Actor: ${(_s = (_q = (_p = input.actor) === null || _p === void 0 ? void 0 : _p.email) !== null && _q !== void 0 ? _q : (_r = input.actor) === null || _r === void 0 ? void 0 : _r.sourceLabel) !== null && _s !== void 0 ? _s : 'system'}`,
        ],
        details: {
            failedCount24h: result.failedCount24h,
            laggedReceivedCount: result.laggedReceivedCount,
            maxLagMinutes: result.maxLagMinutes,
            lagThresholdMinutes,
            failureLookbackHours,
        },
    });
    (0, structured_logs_1.logBillingEvent)('webhook_health_alert_sent', {
        failedCount24h: result.failedCount24h,
        laggedReceivedCount: result.laggedReceivedCount,
        maxLagMinutes: result.maxLagMinutes,
    }, 'warn');
    return Object.assign(Object.assign({}, result), { alertSent: true });
}
