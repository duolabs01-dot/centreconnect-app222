"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWhatsappPhone = normalizeWhatsappPhone;
exports.createWhatsappClickToChatLink = createWhatsappClickToChatLink;
require("server-only");
function normalizePhone(raw) {
    const digits = String(raw !== null && raw !== void 0 ? raw : '').replace(/[^\d]/g, '');
    if (!digits)
        return null;
    if (digits.startsWith('0'))
        return `27${digits.slice(1)}`;
    if (digits.startsWith('27'))
        return digits;
    if (String(raw).trim().startsWith('+'))
        return String(raw).trim().replace(/[^\d]/g, '');
    return digits;
}
function normalizeWhatsappPhone(raw) {
    const normalized = normalizePhone(raw);
    return normalized ? `+${normalized}` : null;
}
function createWhatsappClickToChatLink(rawPhone, message) {
    const digits = normalizePhone(rawPhone);
    const text = message.trim();
    if (!digits || !text)
        return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
