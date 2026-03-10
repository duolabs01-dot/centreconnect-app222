"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCentreSlug = normalizeCentreSlug;
exports.resolveCentreSlugCandidates = resolveCentreSlugCandidates;
function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    }
    catch (_a) {
        return value;
    }
}
function normalizeCentreSlug(value) {
    if (typeof value !== 'string')
        return null;
    const decoded = safeDecode(value).trim().replace(/^\/+|\/+$/g, '');
    if (!decoded)
        return null;
    return decoded.toLowerCase();
}
function resolveCentreSlugCandidates(value) {
    if (typeof value !== 'string')
        return [];
    const raw = value.trim();
    if (!raw)
        return [];
    const decoded = safeDecode(raw).trim();
    const normalized = normalizeCentreSlug(raw);
    return Array.from(new Set([normalized, decoded, raw].filter((entry) => Boolean(entry))));
}
