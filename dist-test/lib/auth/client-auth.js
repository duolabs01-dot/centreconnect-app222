"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInWithPasswordRetry = signInWithPasswordRetry;
exports.ensureProfileWithRetry = ensureProfileWithRetry;
exports.isEcdRole = isEcdRole;
exports.destinationForRole = destinationForRole;
const RETRY_DELAY_MS = 350;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isTransientAuthMessage(message) {
    const lowered = message.toLowerCase();
    return (lowered.includes('network') ||
        lowered.includes('fetch') ||
        lowered.includes('timeout') ||
        lowered.includes('gateway') ||
        lowered.includes('temporar'));
}
function isRetryableHttpStatus(status) {
    return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
async function signInWithPasswordRetry(client, credentials, maxAttempts = 2) {
    var _a, _b;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const { data, error } = await client.auth.signInWithPassword(credentials);
            if (!error) {
                if (!((_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.id))
                    throw new Error('Sign in returned no user');
                return data.user;
            }
            const status = typeof error.status === 'number' ? error.status : 0;
            const message = ((_b = error.message) !== null && _b !== void 0 ? _b : 'Failed to sign in').trim();
            const shouldRetry = attempt < maxAttempts && (isRetryableHttpStatus(status) || isTransientAuthMessage(message));
            if (!shouldRetry)
                throw new Error(message);
            lastError = new Error(message);
            await sleep(RETRY_DELAY_MS * attempt);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sign in';
            const shouldRetry = attempt < maxAttempts && isTransientAuthMessage(message);
            if (!shouldRetry)
                throw new Error(message);
            lastError = new Error(message);
            await sleep(RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError !== null && lastError !== void 0 ? lastError : new Error('Failed to sign in');
}
function parseAuthRole(value) {
    if (value === 'platform_admin' ||
        value === 'ecd_admin' ||
        value === 'ecd_staff' ||
        value === 'ecd_supervisor' ||
        value === 'parent_user') {
        return value;
    }
    return null;
}
async function ensureProfileWithRetry(maxAttempts = 2) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch('/api/auth/ensure-profile', {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = (await response.json().catch(() => ({})));
            if (response.ok) {
                return { role: parseAuthRole(payload.role) };
            }
            const message = payload.error || `Account setup failed (${response.status})`;
            const shouldRetry = attempt < maxAttempts && isRetryableHttpStatus(response.status);
            if (!shouldRetry)
                throw new Error(message);
            lastError = new Error(message);
            await sleep(RETRY_DELAY_MS * attempt);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Account setup failed';
            const shouldRetry = attempt < maxAttempts && isTransientAuthMessage(message);
            if (!shouldRetry)
                throw new Error(message);
            lastError = new Error(message);
            await sleep(RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError !== null && lastError !== void 0 ? lastError : new Error('Account setup failed');
}
function isEcdRole(role) {
    return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor';
}
function destinationForRole(role) {
    if (role === 'platform_admin')
        return '/admin/command';
    if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor')
        return '/ecd/dashboard';
    return '/parent/dashboard';
}
