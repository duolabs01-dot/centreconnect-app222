"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWhatsappHref = toWhatsappHref;
exports.queueEmailNotification = queueEmailNotification;
exports.sendParentInAppNotification = sendParentInAppNotification;
exports.sendEcdInAppNotification = sendEcdInAppNotification;
exports.sendParentInAppAndWhatsappNotification = sendParentInAppAndWhatsappNotification;
exports.sendEcdInAppAndEmailNotification = sendEcdInAppAndEmailNotification;
require("server-only");
const dispatch_whatsapp_event_1 = require("@/lib/notifications/dispatch-whatsapp-event");
function normalizePhone(rawPhone) {
    const digits = String(rawPhone !== null && rawPhone !== void 0 ? rawPhone : '').replace(/[^\d]/g, '');
    if (!digits)
        return null;
    if (digits.startsWith('0'))
        return `27${digits.slice(1)}`;
    if (digits.startsWith('27'))
        return digits;
    return digits;
}
function toWhatsappHref(rawPhone, message) {
    const text = String(message !== null && message !== void 0 ? message : '').trim();
    if (!text)
        return null;
    const number = normalizePhone(rawPhone);
    if (!number)
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
async function queueEmailNotification(db, payload) {
    var _a, _b;
    const recipient = payload.recipient.trim();
    const subject = payload.subject.trim();
    const body = payload.body.trim();
    if (!recipient || !subject || !body) {
        return { ok: false, error: 'Missing recipient, subject, or body.' };
    }
    const { error } = await db.from('email_queue').insert({
        recipient,
        subject,
        body,
        status: (_a = payload.status) !== null && _a !== void 0 ? _a : 'pending',
    });
    return { ok: !error, error: (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : null };
}
async function sendParentInAppNotification(db, payload) {
    var _a, _b;
    const { error } = await db.from('parent_notifications').insert(Object.assign(Object.assign({}, payload), { is_read: (_a = payload.is_read) !== null && _a !== void 0 ? _a : false }));
    return { ok: !error, error: (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : null };
}
async function sendEcdInAppNotification(db, payload) {
    var _a, _b, _c;
    const { error } = await db.from('ecd_notifications').insert(Object.assign(Object.assign({}, payload), { metadata: (_a = payload.metadata) !== null && _a !== void 0 ? _a : {}, is_read: (_b = payload.is_read) !== null && _b !== void 0 ? _b : false }));
    return { ok: !error, error: (_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : null };
}
async function sendParentInAppAndWhatsappNotification(db, payload) {
    var _a, _b, _c, _d, _e, _f, _g;
    const inAppResult = await sendParentInAppNotification(db, {
        parent_id: payload.parent_id,
        ecd_id: payload.ecd_id,
        application_id: payload.application_id,
        template_key: payload.template_key,
        title: payload.title,
        message: payload.message,
        is_read: (_a = payload.is_read) !== null && _a !== void 0 ? _a : false,
    });
    let whatsappHref = toWhatsappHref(payload.parent_phone, payload.message);
    if (payload.whatsapp_event_type) {
        const dispatchResult = await (0, dispatch_whatsapp_event_1.dispatchWhatsappEvent)({
            eventType: payload.whatsapp_event_type,
            eventKey: (_b = payload.whatsapp_event_key) !== null && _b !== void 0 ? _b : null,
            centreId: payload.ecd_id,
            parentId: payload.parent_id,
            applicationId: (_c = payload.application_id) !== null && _c !== void 0 ? _c : null,
            recipientPhone: (_d = payload.parent_phone) !== null && _d !== void 0 ? _d : null,
            recipientName: (_e = payload.recipient_name) !== null && _e !== void 0 ? _e : null,
            message: payload.message,
            metadata: (_f = payload.whatsapp_metadata) !== null && _f !== void 0 ? _f : null,
        });
        whatsappHref = (_g = dispatchResult.whatsappHref) !== null && _g !== void 0 ? _g : whatsappHref;
        if (!dispatchResult.ok) {
            console.error('WhatsApp edge dispatch failed:', dispatchResult.error);
        }
    }
    return {
        ok: inAppResult.ok,
        inAppSent: inAppResult.ok,
        emailQueued: false,
        whatsappHref,
        error: inAppResult.error,
    };
}
async function sendEcdInAppAndEmailNotification(db, payload) {
    var _a;
    const inAppResult = await sendEcdInAppNotification(db, {
        ecd_id: payload.ecd_id,
        application_id: payload.application_id,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata,
        is_read: (_a = payload.is_read) !== null && _a !== void 0 ? _a : false,
    });
    let emailQueued = false;
    if (payload.email_recipient && payload.email_subject && payload.email_body) {
        const emailResult = await queueEmailNotification(db, {
            recipient: payload.email_recipient,
            subject: payload.email_subject,
            body: payload.email_body,
            status: 'pending',
        });
        emailQueued = emailResult.ok;
        if (!emailResult.ok) {
            return {
                ok: false,
                inAppSent: inAppResult.ok,
                emailQueued: false,
                whatsappHref: null,
                error: emailResult.error,
            };
        }
    }
    return {
        ok: inAppResult.ok,
        inAppSent: inAppResult.ok,
        emailQueued,
        whatsappHref: null,
        error: inAppResult.error,
    };
}
