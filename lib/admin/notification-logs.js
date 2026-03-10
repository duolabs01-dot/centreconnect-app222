"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationEventKey = createNotificationEventKey;
exports.upsertNotificationLog = upsertNotificationLog;
require("server-only");
const crypto_1 = require("crypto");
function createNotificationEventKey(prefix, centreId) {
    const parts = [prefix.trim(), (centreId === null || centreId === void 0 ? void 0 : centreId.trim()) || 'global', Date.now().toString(), (0, crypto_1.randomUUID)()];
    return parts.join(':');
}
async function upsertNotificationLog(admin, input) {
    var _a, _b, _c, _d, _e, _f;
    const { error } = await admin.from('notification_logs').upsert({
        centre_id: (_a = input.centreId) !== null && _a !== void 0 ? _a : null,
        event_key: input.eventKey,
        event_type: input.eventType,
        channel: input.channel,
        recipient: ((_b = input.recipient) === null || _b === void 0 ? void 0 : _b.trim()) || null,
        status: input.status,
        provider: input.provider,
        provider_message_id: (_c = input.providerMessageId) !== null && _c !== void 0 ? _c : null,
        payload: (_d = input.payload) !== null && _d !== void 0 ? _d : {},
        error_message: (_e = input.errorMessage) !== null && _e !== void 0 ? _e : null,
        created_at: (_f = input.createdAt) !== null && _f !== void 0 ? _f : new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'event_key,channel' });
    if (error) {
        console.error('Failed to upsert notification log:', error.message);
        return { success: false, error: error.message };
    }
    return { success: true };
}
