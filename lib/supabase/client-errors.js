"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNavigatorLockTimeoutError = isNavigatorLockTimeoutError;
exports.toFriendlyClientError = toFriendlyClientError;
function isNavigatorLockTimeoutError(error) {
    var _a;
    const message = typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
            ? String((_a = error.message) !== null && _a !== void 0 ? _a : '')
            : '';
    const normalized = message.toLowerCase();
    return (normalized.includes('lockmanager') &&
        normalized.includes('auth-token') &&
        normalized.includes('timed out'));
}
function toFriendlyClientError(error, fallback) {
    if (isNavigatorLockTimeoutError(error)) {
        return 'Your session is busy right now. Please wait a few seconds and try again.';
    }
    if (typeof error === 'string' && error.trim())
        return error;
    if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message;
        if (typeof message === 'string' && message.trim())
            return message;
    }
    return fallback;
}
