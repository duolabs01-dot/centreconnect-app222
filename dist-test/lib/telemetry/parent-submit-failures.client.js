'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportParentSubmitFailure = reportParentSubmitFailure;
function clamp(value, max) {
    const trimmed = value.trim();
    if (!trimmed)
        return '';
    return trimmed.slice(0, max);
}
function reportParentSubmitFailure(input) {
    var _a, _b;
    if (typeof window === 'undefined')
        return;
    const route = clamp(input.route, 160);
    const form = clamp(input.form, 80);
    const failureType = clamp(input.failureType, 80);
    const message = clamp(input.message, 600);
    if (!route || !form || !failureType || !message)
        return;
    const payload = JSON.stringify({
        route,
        form,
        failureType,
        message,
        code: input.code ? clamp(input.code, 80) : undefined,
        source: (_a = input.source) !== null && _a !== void 0 ? _a : 'client',
        context: (_b = input.context) !== null && _b !== void 0 ? _b : {},
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/parent/submit-failures', blob);
        return;
    }
    void fetch('/api/parent/submit-failures', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true,
    }).catch(() => {
        // Telemetry should never block parent UX.
    });
}
