"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeInviteLog = writeInviteLog;
require("server-only");
const notification_logs_1 = require("@/lib/admin/notification-logs");
async function writeInviteLog(admin, input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const normalizedEmail = ((_a = input.ownerEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || null;
    const normalizedPhone = ((_b = input.ownerPhone) === null || _b === void 0 ? void 0 : _b.trim()) || null;
    const sentAt = (_c = input.sentAt) !== null && _c !== void 0 ? _c : new Date().toISOString();
    const { error } = await admin.from('invite_logs').insert({
        centre_id: (_d = input.centreId) !== null && _d !== void 0 ? _d : null,
        owner_email: normalizedEmail,
        owner_phone: normalizedPhone,
        invite_type: input.inviteType,
        sent_at: sentAt,
        status: (_e = input.status) !== null && _e !== void 0 ? _e : 'sent',
        notes: (_f = input.notes) !== null && _f !== void 0 ? _f : null,
    });
    if (error) {
        console.error('Failed to write invite log:', error.message);
        return { success: false, error: error.message };
    }
    const eventType = input.inviteType === 'welcome_pack' ? 'welcome_pack' : 'admin_access_invite';
    const channel = input.inviteType === 'whatsapp' ? 'whatsapp' : 'email';
    const recipient = channel === 'whatsapp' ? normalizedPhone !== null && normalizedPhone !== void 0 ? normalizedPhone : normalizedEmail : normalizedEmail;
    const inviteStatus = (_g = input.status) !== null && _g !== void 0 ? _g : 'sent';
    const notificationStatus = (_h = input.notificationStatus) !== null && _h !== void 0 ? _h : inviteStatus;
    const { error: notificationError } = await admin.from('notification_logs').upsert({
        centre_id: (_j = input.centreId) !== null && _j !== void 0 ? _j : null,
        event_key: ((_k = input.notificationEventKey) === null || _k === void 0 ? void 0 : _k.trim()) || (0, notification_logs_1.createNotificationEventKey)(eventType, input.centreId),
        event_type: eventType,
        channel,
        recipient,
        status: notificationStatus,
        provider: ((_l = input.notificationProvider) === null || _l === void 0 ? void 0 : _l.trim()) || 'invite_log_writer',
        provider_message_id: ((_m = input.notificationProviderMessageId) === null || _m === void 0 ? void 0 : _m.trim()) || null,
        payload: Object.assign({ source: 'invite_logs', invite_type: input.inviteType, notes: (_o = input.notes) !== null && _o !== void 0 ? _o : null }, ((_p = input.notificationPayload) !== null && _p !== void 0 ? _p : {})),
        error_message: (_q = input.notificationErrorMessage) !== null && _q !== void 0 ? _q : null,
        updated_at: new Date().toISOString(),
        created_at: sentAt,
    }, { onConflict: 'event_key,channel' });
    if (notificationError) {
        console.error('Failed to mirror invite log to notification_logs:', notificationError.message);
    }
    return { success: true };
}
