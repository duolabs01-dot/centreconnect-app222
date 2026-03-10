"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchWhatsappEvent = dispatchWhatsappEvent;
require("server-only");
const crypto_1 = require("crypto");
const whatsapp_1 = require("@/lib/communications/whatsapp");
const env_1 = require("@/lib/supabase/env");
function buildDefaultEventKey(eventType, centreId) {
    return `whatsapp:${eventType}:${(centreId === null || centreId === void 0 ? void 0 : centreId.trim()) || 'global'}:${Date.now()}:${(0, crypto_1.randomUUID)()}`;
}
function getFunctionUrl() {
    var _a;
    const direct = (_a = process.env.WHATSAPP_NOTIFIER_FUNCTION_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (direct)
        return direct.replace(/\/+$/, '');
    const { supabaseUrl } = (0, env_1.requireSupabaseAdminEnv)('whatsapp-notifier-dispatch');
    return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/whatsapp-notifier`;
}
async function dispatchWhatsappEvent(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const message = input.message.trim();
    const eventKey = ((_a = input.eventKey) === null || _a === void 0 ? void 0 : _a.trim()) || buildDefaultEventKey(input.eventType, input.centreId);
    const fallbackHref = (0, whatsapp_1.createWhatsappClickToChatLink)((_b = input.recipientPhone) !== null && _b !== void 0 ? _b : null, message);
    if (!message) {
        return {
            ok: false,
            eventKey,
            whatsappHref: fallbackHref,
            error: 'Message is required for WhatsApp notification dispatch.',
        };
    }
    let serviceRoleKey;
    let functionUrl;
    try {
        const env = (0, env_1.requireSupabaseAdminEnv)('whatsapp-notifier-dispatch');
        serviceRoleKey = env.serviceRoleKey;
        functionUrl = getFunctionUrl();
    }
    catch (error) {
        return {
            ok: false,
            eventKey,
            whatsappHref: fallbackHref,
            error: error instanceof Error ? error.message : 'Supabase admin env is missing for WhatsApp notifier dispatch.',
        };
    }
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
    };
    const secret = (_c = process.env.WHATSAPP_NOTIFIER_SECRET) === null || _c === void 0 ? void 0 : _c.trim();
    if (secret) {
        headers['x-whatsapp-notifier-secret'] = secret;
    }
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                event_key: eventKey,
                event_type: input.eventType,
                centre_id: (_d = input.centreId) !== null && _d !== void 0 ? _d : null,
                parent_id: (_e = input.parentId) !== null && _e !== void 0 ? _e : null,
                application_id: (_f = input.applicationId) !== null && _f !== void 0 ? _f : null,
                recipient_phone: (_g = input.recipientPhone) !== null && _g !== void 0 ? _g : null,
                recipient_name: (_h = input.recipientName) !== null && _h !== void 0 ? _h : null,
                message,
                metadata: (_j = input.metadata) !== null && _j !== void 0 ? _j : {},
            }),
            cache: 'no-store',
        });
        const responseText = await response.text();
        const parsed = (responseText ? JSON.parse(responseText) : {});
        const resolvedHref = (_l = (_k = parsed.delivery) === null || _k === void 0 ? void 0 : _k.click_to_chat_url) !== null && _l !== void 0 ? _l : fallbackHref;
        if (!response.ok || parsed.ok === false) {
            return {
                ok: false,
                eventKey: ((_m = parsed.event_key) === null || _m === void 0 ? void 0 : _m.trim()) || eventKey,
                whatsappHref: resolvedHref,
                error: parsed.error || `WhatsApp notifier failed with status ${response.status}.`,
            };
        }
        return {
            ok: true,
            eventKey: ((_o = parsed.event_key) === null || _o === void 0 ? void 0 : _o.trim()) || eventKey,
            whatsappHref: resolvedHref,
            error: null,
        };
    }
    catch (error) {
        return {
            ok: false,
            eventKey,
            whatsappHref: fallbackHref,
            error: error instanceof Error ? error.message : 'Failed to call WhatsApp notifier edge function.',
        };
    }
}
