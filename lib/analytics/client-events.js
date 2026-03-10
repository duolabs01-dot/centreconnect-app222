'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackAnalyticsEvent = trackAnalyticsEvent;
const analytics_1 = require("@vercel/analytics");
function sanitizeMetadata(metadata) {
    if (!metadata)
        return {};
    return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}
async function trackAnalyticsEvent(input) {
    var _a, _b, _c;
    const metadata = sanitizeMetadata(input.metadata);
    try {
        (0, analytics_1.track)(input.eventType, Object.assign({ ecdId: (_a = input.ecdId) !== null && _a !== void 0 ? _a : null, actorRole: (_b = input.actorRole) !== null && _b !== void 0 ? _b : 'anonymous', path: (_c = input.path) !== null && _c !== void 0 ? _c : null }, metadata));
    }
    catch (_d) {
        // Vercel analytics should never block UX.
    }
    if (!input.ecdId) {
        return;
    }
    const payload = JSON.stringify({
        ecdId: input.ecdId,
        eventType: input.eventType,
        actorRole: input.actorRole,
        path: input.path,
        durationMs: input.durationMs,
        sessionId: input.sessionId,
        metadata,
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/events', blob);
        return;
    }
    try {
        await fetch('/api/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
        });
    }
    catch (_e) {
        // Internal analytics should never block UX.
    }
}
