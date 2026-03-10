"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertInviteDomainHealth = assertInviteDomainHealth;
exports.resolvePublicAppUrl = resolvePublicAppUrl;
exports.normalizeAppUrl = normalizeAppUrl;
exports.coerceAuthCallbackRedirect = coerceAuthCallbackRedirect;
exports.buildEcdWelcomePath = buildEcdWelcomePath;
exports.buildAuthCallbackRedirect = buildAuthCallbackRedirect;
exports.buildFirstPartyConfirmLink = buildFirstPartyConfirmLink;
exports.buildDefaultEcdOnboardingRedirect = buildDefaultEcdOnboardingRedirect;
exports.buildLockedResetPasswordRedirect = buildLockedResetPasswordRedirect;
exports.sanitizeGeneratedAccessLink = sanitizeGeneratedAccessLink;
exports.sanitizeGeneratedAccessLinkWithDiagnostics = sanitizeGeneratedAccessLinkWithDiagnostics;
exports.generateMagicFirstAccessLink = generateMagicFirstAccessLink;
const config_1 = require("@/lib/config");
function toOrigin(raw) {
    const value = (raw !== null && raw !== void 0 ? raw : '').trim();
    if (!value)
        return null;
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        return new URL(withProtocol).origin;
    }
    catch (_a) {
        return null;
    }
}
function resolveCanonicalOrigin() {
    var _a;
    return (_a = toOrigin(config_1.ROOT_DOMAIN)) !== null && _a !== void 0 ? _a : 'https://centerconnect.co.za';
}
function shouldForceCanonicalOrigin() {
    if (process.env.CC_FORCE_CANONICAL_URL === '1')
        return true;
    return process.env.VERCEL_ENV === 'production';
}
function isLocalHostname(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}
function isBlockedHostname(hostname) {
    return hostname.endsWith('.supabase.co') || hostname.endsWith('.vercel.app');
}
function allowedInviteHosts(canonicalHost) {
    return new Set([canonicalHost, `www.${canonicalHost}`, 'localhost', '127.0.0.1']);
}
function readInviteUrlEnvValues() {
    var _a, _b, _c, _d, _e;
    return [
        { key: 'NEXT_PUBLIC_APP_URL', value: (_a = process.env.NEXT_PUBLIC_APP_URL) !== null && _a !== void 0 ? _a : '' },
        { key: 'SUPABASE_SITE_URL', value: (_b = process.env.SUPABASE_SITE_URL) !== null && _b !== void 0 ? _b : '' },
        { key: 'GOTRUE_SITE_URL', value: (_c = process.env.GOTRUE_SITE_URL) !== null && _c !== void 0 ? _c : '' },
        { key: 'SITE_URL', value: (_d = process.env.SITE_URL) !== null && _d !== void 0 ? _d : '' },
        { key: 'AUTH_SITE_URL', value: (_e = process.env.AUTH_SITE_URL) !== null && _e !== void 0 ? _e : '' },
    ];
}
function assertInviteDomainHealth() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const canonicalOrigin = resolveCanonicalOrigin();
    const canonicalHost = new URL(canonicalOrigin).hostname;
    const resolvedAppHost = new URL(normalizeAppUrl()).hostname;
    const isProduction = shouldForceCanonicalOrigin();
    if (isProduction) {
        const requiredEnv = [
            { key: 'NEXT_PUBLIC_APP_URL', value: (_b = (_a = process.env.NEXT_PUBLIC_APP_URL) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '' },
            { key: 'NEXT_PUBLIC_ROOT_DOMAIN', value: (_d = (_c = process.env.NEXT_PUBLIC_ROOT_DOMAIN) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '' },
        ];
        const missing = requiredEnv.filter((entry) => entry.value.length === 0).map((entry) => entry.key);
        const hasSupabaseSiteUrl = ((_f = (_e = process.env.SUPABASE_SITE_URL) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : '').length > 0 ||
            ((_h = (_g = process.env.GOTRUE_SITE_URL) === null || _g === void 0 ? void 0 : _g.trim()) !== null && _h !== void 0 ? _h : '').length > 0 ||
            ((_k = (_j = process.env.SITE_URL) === null || _j === void 0 ? void 0 : _j.trim()) !== null && _k !== void 0 ? _k : '').length > 0 ||
            ((_m = (_l = process.env.AUTH_SITE_URL) === null || _l === void 0 ? void 0 : _l.trim()) !== null && _m !== void 0 ? _m : '').length > 0;
        if (!hasSupabaseSiteUrl) {
            missing.push('SUPABASE_SITE_URL|GOTRUE_SITE_URL|SITE_URL|AUTH_SITE_URL');
        }
        if (missing.length > 0) {
            return {
                ok: false,
                code: 'missing_env',
                message: 'Invite links are blocked: required production URL env vars are missing.',
                details: missing.map((key) => ({ key, value: 'missing' })),
            };
        }
    }
    if (!isLocalHostname(resolvedAppHost) && resolvedAppHost !== canonicalHost && resolvedAppHost !== `www.${canonicalHost}`) {
        return {
            ok: false,
            code: 'non_canonical_host',
            message: `Invite links are blocked: app host must be ${canonicalHost}, got ${resolvedAppHost}.`,
            details: [{ key: 'resolvedAppHost', value: resolvedAppHost }],
        };
    }
    const allowedHosts = allowedInviteHosts(canonicalHost);
    const details = [];
    for (const entry of readInviteUrlEnvValues()) {
        const raw = entry.value.trim();
        if (!raw)
            continue;
        const parsed = toOrigin(raw);
        if (!parsed) {
            return {
                ok: false,
                code: 'invalid_url',
                message: `Invite links are blocked: ${entry.key} is not a valid URL/domain.`,
                details: [{ key: entry.key, value: raw }],
            };
        }
        const host = new URL(parsed).hostname;
        details.push({ key: entry.key, value: host });
        if (isBlockedHostname(host)) {
            return {
                ok: false,
                code: 'blocked_host',
                message: `Invite links are blocked: ${entry.key} cannot point to ${host}. Use ${canonicalHost}.`,
                details,
            };
        }
        if (!allowedHosts.has(host)) {
            return {
                ok: false,
                code: 'non_canonical_host',
                message: `Invite links are blocked: ${entry.key} host must be ${canonicalHost} (or localhost in dev).`,
                details,
            };
        }
    }
    return {
        ok: true,
        code: 'ok',
        message: 'Invite domain health check passed.',
        details,
    };
}
function resolvePublicAppUrl(preferred) {
    void preferred;
    return (0, config_1.requireConfiguredAppUrl)();
}
function normalizeAppUrl(value) {
    void value;
    return (0, config_1.requireConfiguredAppUrl)();
}
function sanitizeNextPath(nextPath) {
    if (!nextPath.startsWith('/'))
        return '/ecd/welcome?onboarding=1';
    if (nextPath.startsWith('//'))
        return '/ecd/welcome?onboarding=1';
    return nextPath;
}
function sanitizeConfirmType(value) {
    const normalized = (value !== null && value !== void 0 ? value : '').trim().toLowerCase();
    if (normalized === 'signup' ||
        normalized === 'magiclink' ||
        normalized === 'invite' ||
        normalized === 'recovery' ||
        normalized === 'email_change') {
        return normalized;
    }
    return 'magiclink';
}
function sanitizeConfirmNextPath(value) {
    if (!value.startsWith('/'))
        return '/ecd/welcome?onboarding=1';
    if (value.startsWith('//'))
        return '/ecd/welcome?onboarding=1';
    return value;
}
function resolveConfirmNextPathFromRedirect(redirectTo) {
    try {
        const parsed = new URL(redirectTo, normalizeAppUrl());
        const nextParam = parsed.searchParams.get('next');
        if (!nextParam)
            return '/ecd/welcome?onboarding=1';
        return sanitizeConfirmNextPath(nextParam);
    }
    catch (_a) {
        return '/ecd/welcome?onboarding=1';
    }
}
function coerceAuthCallbackRedirect(redirectTo, fallbackNextPath = '/ecd/welcome?onboarding=1') {
    const safeFallback = sanitizeConfirmNextPath(fallbackNextPath);
    const candidate = (redirectTo !== null && redirectTo !== void 0 ? redirectTo : '').trim();
    if (!candidate)
        return buildAuthCallbackRedirect(safeFallback);
    try {
        const appUrl = normalizeAppUrl();
        const parsed = new URL(candidate, appUrl);
        const nextParam = parsed.searchParams.get('next');
        if (nextParam)
            return buildAuthCallbackRedirect(nextParam);
        const isFirstPartyPath = candidate.startsWith('/') || parsed.origin === appUrl;
        if (isFirstPartyPath &&
            parsed.pathname.startsWith('/') &&
            parsed.pathname !== '/auth/callback' &&
            parsed.pathname !== '/auth/confirm') {
            const directPath = `${parsed.pathname}${parsed.search}`;
            return buildAuthCallbackRedirect(directPath);
        }
    }
    catch (_a) {
        // Fall back to the default onboarding destination below.
    }
    return buildAuthCallbackRedirect(safeFallback);
}
function buildEcdWelcomePath(input = {}) {
    var _a, _b, _c, _d;
    const params = new URLSearchParams();
    const name = (_a = input.name) === null || _a === void 0 ? void 0 : _a.trim();
    const centre = (_b = input.centre) === null || _b === void 0 ? void 0 : _b.trim();
    const location = (_c = input.location) === null || _c === void 0 ? void 0 : _c.trim();
    if (name)
        params.set('name', name);
    if (centre)
        params.set('centre', centre);
    if (location)
        params.set('location', location);
    if ((_d = input.onboarding) !== null && _d !== void 0 ? _d : true)
        params.set('onboarding', '1');
    const query = params.toString();
    return query.length > 0 ? `/ecd/welcome?${query}` : '/ecd/welcome';
}
function buildAuthCallbackRedirect(nextPath, preferredOrigin) {
    void preferredOrigin;
    const safeNext = sanitizeNextPath(nextPath);
    return `${normalizeAppUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
function buildFirstPartyConfirmLink(input) {
    var _a;
    const token = ((_a = input.hashedToken) !== null && _a !== void 0 ? _a : '').trim();
    if (!token)
        return null;
    const url = new URL('/auth/confirm', normalizeAppUrl());
    url.searchParams.set('token_hash', token);
    url.searchParams.set('type', sanitizeConfirmType(input.verificationType));
    url.searchParams.set('next', sanitizeConfirmNextPath(input.nextPath));
    return url.toString();
}
function buildDefaultEcdOnboardingRedirect() {
    return buildAuthCallbackRedirect(buildEcdWelcomePath({ onboarding: true }));
}
function buildLockedResetPasswordRedirect(email, preferredOrigin) {
    void preferredOrigin;
    const resetPath = `/reset-password?locked_email=${encodeURIComponent(email)}`;
    return buildAuthCallbackRedirect(resetPath);
}
function isAllowedAppHost(hostname) {
    const appHost = new URL(normalizeAppUrl()).hostname;
    const canonicalHost = new URL(resolveCanonicalOrigin()).hostname;
    return hostname === appHost || hostname === canonicalHost;
}
function sanitizeRedirectUrl(redirectTo, fallback) {
    try {
        const parsed = new URL(redirectTo, normalizeAppUrl());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            return fallback;
        if (!isAllowedAppHost(parsed.hostname))
            return fallback;
        return parsed.toString();
    }
    catch (_a) {
        return fallback;
    }
}
function isExpectedSupabaseAuthPath(pathname) {
    const normalized = pathname.trim().toLowerCase();
    return normalized.startsWith('/auth/v1/');
}
function looksLikeDomainPath(pathname) {
    const normalized = pathname.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized);
}
function sanitizeGeneratedAccessLink(input) {
    var _a;
    const fallback = input.fallbackRedirectTo;
    const candidate = ((_a = input.actionLink) !== null && _a !== void 0 ? _a : '').trim();
    if (!candidate)
        return fallback;
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            return fallback;
        if (parsed.hostname.endsWith('.supabase.co')) {
            if (!isExpectedSupabaseAuthPath(parsed.pathname)) {
                if (looksLikeDomainPath(parsed.pathname) && parsed.hash.includes('access_token')) {
                    try {
                        const fallbackUrl = new URL(fallback);
                        fallbackUrl.hash = parsed.hash;
                        return fallbackUrl.toString();
                    }
                    catch (_b) {
                        return fallback;
                    }
                }
                return fallback;
            }
            const redirectTo = parsed.searchParams.get('redirect_to');
            if (!redirectTo) {
                parsed.searchParams.set('redirect_to', fallback);
                return parsed.toString();
            }
            const safeRedirect = sanitizeRedirectUrl(redirectTo, fallback);
            if (safeRedirect !== redirectTo) {
                parsed.searchParams.set('redirect_to', safeRedirect);
            }
            return parsed.toString();
        }
        if (!isAllowedAppHost(parsed.hostname))
            return fallback;
        return parsed.toString();
    }
    catch (_c) {
        return fallback;
    }
}
function extractHostAndPath(raw) {
    const value = (raw !== null && raw !== void 0 ? raw : '').trim();
    if (!value)
        return { host: null, path: null };
    try {
        const parsed = new URL(value);
        return { host: parsed.hostname, path: parsed.pathname || '/' };
    }
    catch (_a) {
        return { host: null, path: null };
    }
}
function sanitizeGeneratedAccessLinkWithDiagnostics(input) {
    var _a;
    const sanitizedLink = sanitizeGeneratedAccessLink(input);
    const fallback = input.fallbackRedirectTo;
    const original = ((_a = input.actionLink) !== null && _a !== void 0 ? _a : '').trim();
    const originalInfo = extractHostAndPath(original);
    const sanitizedInfo = extractHostAndPath(sanitizedLink);
    const fallbackInfo = extractHostAndPath(fallback);
    const diagnostics = {
        originalHost: originalInfo.host,
        originalPath: originalInfo.path,
        sanitizedHost: sanitizedInfo.host,
        sanitizedPath: sanitizedInfo.path,
        usedFallback: sanitizedInfo.host === fallbackInfo.host &&
            sanitizedInfo.path === fallbackInfo.path &&
            sanitizedLink.startsWith(fallback),
        changed: original.length > 0 && sanitizedLink !== original,
    };
    return {
        link: sanitizedLink,
        diagnostics,
    };
}
async function generateMagicFirstAccessLink(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    const { adminClient, email, redirectTo, preferMagicLink = false } = input;
    const errors = [];
    const confirmNextPath = resolveConfirmNextPathFromRedirect(redirectTo);
    const magicResult = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
    });
    const magicLink = (_d = (_c = (_b = (_a = magicResult.data) === null || _a === void 0 ? void 0 : _a.properties) === null || _b === void 0 ? void 0 : _b.action_link) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '';
    if (!magicResult.error && magicLink) {
        const firstPartyConfirmLink = buildFirstPartyConfirmLink({
            hashedToken: (_g = (_f = (_e = magicResult.data) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f.hashed_token) !== null && _g !== void 0 ? _g : null,
            verificationType: (_k = (_j = (_h = magicResult.data) === null || _h === void 0 ? void 0 : _h.properties) === null || _j === void 0 ? void 0 : _j.verification_type) !== null && _k !== void 0 ? _k : 'magiclink',
            nextPath: confirmNextPath,
        });
        const safeMagicLink = sanitizeGeneratedAccessLink({
            actionLink: magicLink,
            fallbackRedirectTo: redirectTo,
        });
        return {
            link: firstPartyConfirmLink !== null && firstPartyConfirmLink !== void 0 ? firstPartyConfirmLink : safeMagicLink,
            authUserId: (_o = (_m = (_l = magicResult.data) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.id) !== null && _o !== void 0 ? _o : null,
            mode: 'magiclink',
            warning: preferMagicLink ? null : null,
        };
    }
    if ((_p = magicResult.error) === null || _p === void 0 ? void 0 : _p.message) {
        errors.push(`magiclink: ${magicResult.error.message}`);
    }
    const inviteResult = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo },
    });
    const inviteLink = (_t = (_s = (_r = (_q = inviteResult.data) === null || _q === void 0 ? void 0 : _q.properties) === null || _r === void 0 ? void 0 : _r.action_link) === null || _s === void 0 ? void 0 : _s.trim()) !== null && _t !== void 0 ? _t : '';
    if (!inviteResult.error && inviteLink) {
        const firstPartyConfirmLink = buildFirstPartyConfirmLink({
            hashedToken: (_w = (_v = (_u = inviteResult.data) === null || _u === void 0 ? void 0 : _u.properties) === null || _v === void 0 ? void 0 : _v.hashed_token) !== null && _w !== void 0 ? _w : null,
            verificationType: (_z = (_y = (_x = inviteResult.data) === null || _x === void 0 ? void 0 : _x.properties) === null || _y === void 0 ? void 0 : _y.verification_type) !== null && _z !== void 0 ? _z : 'invite',
            nextPath: confirmNextPath,
        });
        const safeInviteLink = sanitizeGeneratedAccessLink({
            actionLink: inviteLink,
            fallbackRedirectTo: redirectTo,
        });
        return {
            link: firstPartyConfirmLink !== null && firstPartyConfirmLink !== void 0 ? firstPartyConfirmLink : safeInviteLink,
            authUserId: (_2 = (_1 = (_0 = inviteResult.data) === null || _0 === void 0 ? void 0 : _0.user) === null || _1 === void 0 ? void 0 : _1.id) !== null && _2 !== void 0 ? _2 : null,
            mode: 'invite',
            warning: preferMagicLink ? 'Sent invite link as fallback.' : null,
        };
    }
    if ((_3 = inviteResult.error) === null || _3 === void 0 ? void 0 : _3.message) {
        errors.push(`invite: ${inviteResult.error.message}`);
    }
    return {
        link: '',
        authUserId: null,
        mode: preferMagicLink ? 'magiclink' : 'invite',
        warning: errors.length > 0 ? errors.join(' | ') : 'Failed to generate access link.',
    };
}
