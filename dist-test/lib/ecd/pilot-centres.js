"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNCLAIMED_CENTRE_DISCLAIMER = void 0;
exports.isPilotCentreIdentity = isPilotCentreIdentity;
const PILOT_CENTRE_KEYWORDS = ['sakhisizwe', 'bajhabulile', 'bajabulile'];
exports.UNCLAIMED_CENTRE_DISCLAIMER = 'This centre is not yet using our online portal. Some details might be outdated, so we recommend reaching out directly using the WhatsApp or call buttons below.';
function normalizeIdentifier(value) {
    return (value !== null && value !== void 0 ? value : '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function isPilotCentreIdentity(input) {
    const normalizedName = normalizeIdentifier(input.name);
    const normalizedSlug = normalizeIdentifier(input.slug);
    return PILOT_CENTRE_KEYWORDS.some((keyword) => normalizedName.includes(keyword) || normalizedSlug.includes(keyword));
}
