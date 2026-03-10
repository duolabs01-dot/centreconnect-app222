"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTurnstileEnabled = isTurnstileEnabled;
exports.verifyTurnstileToken = verifyTurnstileToken;
require("server-only");
function getTurnstileSecretKey() {
    var _a;
    return ((_a = process.env.TURNSTILE_SECRET_KEY) === null || _a === void 0 ? void 0 : _a.trim()) || null;
}
function isTurnstileEnabled() {
    return Boolean(getTurnstileSecretKey());
}
async function verifyTurnstileToken(input) {
    var _a, _b;
    const secret = getTurnstileSecretKey();
    if (!secret) {
        return { ok: true, skipped: true };
    }
    const token = (_a = input.token) === null || _a === void 0 ? void 0 : _a.trim();
    if (!token) {
        return { ok: false, error: 'missing-token' };
    }
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (input.remoteIp)
        body.set('remoteip', input.remoteIp);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    if (!response.ok) {
        return { ok: false, error: `http-${response.status}` };
    }
    const payload = (await response.json());
    if (!payload.success) {
        return { ok: false, error: ((_b = payload['error-codes']) === null || _b === void 0 ? void 0 : _b.join(',')) || 'verify-failed' };
    }
    return { ok: true, skipped: false };
}
