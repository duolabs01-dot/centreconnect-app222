"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSession = registerSession;
exports.validateSession = validateSession;
exports.clearSession = clearSession;
const env_1 = require("@/lib/supabase/env");
function getSupabaseConfig() {
    const { supabaseUrl, supabaseAnonKey } = (0, env_1.readSupabasePublicEnv)();
    return { supabaseUrl, supabaseAnonKey };
}
function withAuthHeaders(sessionToken, includeJson = false) {
    const { supabaseAnonKey } = getSupabaseConfig();
    const headers = new Headers();
    if (supabaseAnonKey) {
        headers.set('apikey', supabaseAnonKey);
    }
    if (sessionToken) {
        headers.set('Authorization', `Bearer ${sessionToken}`);
    }
    if (includeJson) {
        headers.set('Content-Type', 'application/json');
    }
    return headers;
}
async function registerSession(userId, sessionToken, deviceHint, ipAddress, region, userAgent) {
    const { supabaseUrl } = getSupabaseConfig();
    if (!supabaseUrl || !userId || !sessionToken)
        return false;
    try {
        await fetch(`${supabaseUrl}/rest/v1/user_sessions?on_conflict=user_id`, {
            method: 'POST',
            headers: (() => {
                const headers = withAuthHeaders(sessionToken, true);
                headers.set('Prefer', 'resolution=merge-duplicates,return=minimal');
                return headers;
            })(),
            body: JSON.stringify({
                user_id: userId,
                session_token: sessionToken,
                device_hint: deviceHint !== null && deviceHint !== void 0 ? deviceHint : 'unknown',
                ip_address: ipAddress,
                region: region,
                user_agent: userAgent,
                last_seen_at: new Date().toISOString(),
            }),
            cache: 'no-store',
        });
        return true;
    }
    catch (_a) {
        return false;
    }
}
async function validateSession(userId, sessionToken) {
    var _a;
    const { supabaseUrl } = getSupabaseConfig();
    if (!supabaseUrl || !userId)
        return false;
    if (!sessionToken)
        return false;
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${encodeURIComponent(userId)}&select=session_token`, {
            method: 'GET',
            headers: withAuthHeaders(sessionToken),
            cache: 'no-store',
        });
        if (!response.ok)
            return false;
        const data = (await response.json().catch(() => []));
        if (!Array.isArray(data) || data.length === 0)
            return false;
        return ((_a = data[0]) === null || _a === void 0 ? void 0 : _a.session_token) === sessionToken;
    }
    catch (_b) {
        return false;
    }
}
async function clearSession(userId) {
    const { supabaseUrl } = getSupabaseConfig();
    const serviceRoleKey = (0, env_1.readSupabaseServiceRoleKey)();
    if (!supabaseUrl || !serviceRoleKey || !userId)
        return;
    await fetch(`${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: (() => {
            const headers = new Headers();
            headers.set('apikey', serviceRoleKey);
            headers.set('Authorization', `Bearer ${serviceRoleKey}`);
            headers.set('Prefer', 'return=minimal');
            return headers;
        })(),
        cache: 'no-store',
    });
}
