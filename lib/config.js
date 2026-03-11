"use strict";
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_APP_URL = exports.SUPPORT_EMAIL = exports.ROOT_DOMAIN = exports.APP_URL = void 0;
exports.requireConfiguredAppUrl = requireConfiguredAppUrl;
const APP_URL_CONFIG_ERROR = 'NEXT_PUBLIC_APP_URL is misconfigured. Set it to your app domain in Vercel.';
function resolveDevelopmentFallbackUrl() {
    const vercelUrl = ((process.env.VERCEL_URL) ?? '').trim();
    if (vercelUrl) {
        const withProtocol = /^https?:\/\//i.test(vercelUrl) ? vercelUrl : `https://${vercelUrl}`;
        try {
            return new URL(withProtocol).origin.replace(/\/$/, '');
        }
        catch {
        }
    }
    return 'http://localhost:3010';
}
function parseConfiguredAppUrl(value) {
    const trimmed = (value !== null && value !== void 0 ? value : '').trim();
    if (!trimmed) {
        if (process.env.NODE_ENV !== 'production') {
            return resolveDevelopmentFallbackUrl();
        }
        throw new Error(APP_URL_CONFIG_ERROR);
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed;
    try {
        parsed = new URL(withProtocol);
    }
    catch (_a) {
        throw new Error(APP_URL_CONFIG_ERROR);
    }
    if (parsed.hostname.includes('supabase.co')) {
        if (process.env.NODE_ENV !== 'production') {
            return resolveDevelopmentFallbackUrl();
        }
        throw new Error(APP_URL_CONFIG_ERROR);
    }
    return parsed.origin.replace(/\/$/, '');
}
function requireConfiguredAppUrl() {
    return parseConfiguredAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}
exports.APP_URL = (_a = process.env.NEXT_PUBLIC_APP_URL) !== null && _a !== void 0 ? _a : 'https://centerconnect.co.za';
exports.ROOT_DOMAIN = (_b = process.env.NEXT_PUBLIC_ROOT_DOMAIN) !== null && _b !== void 0 ? _b : 'centerconnect.co.za';
exports.SUPPORT_EMAIL = (_c = process.env.SUPPORT_EMAIL) !== null && _c !== void 0 ? _c : 'admin@centerconnect.co.za';
exports.EMAIL_APP_URL = (_d = process.env.NEXT_PUBLIC_EMAIL_APP_URL) !== null && _d !== void 0 ? _d : 'https://centerconnect.co.za';
