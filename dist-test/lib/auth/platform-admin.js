"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlatformAdmin = requirePlatformAdmin;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
function getBearerToken(request) {
    if (!request)
        return null;
    const authHeader = request.headers.get('authorization');
    if (!authHeader)
        return null;
    const [scheme, token] = authHeader.split(' ');
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
        return null;
    }
    return token;
}
function getPlatformAdminEmailAllowlist() {
    const raw = [
        process.env.PLATFORM_ADMIN_EMAIL,
        process.env.UAT_PLATFORM_ADMIN_EMAIL,
        process.env.PLATFORM_ADMIN_EMAILS,
    ]
        .filter((value) => Boolean(value && value.trim()))
        .join(',');
    return new Set(raw
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean));
}
async function getUserFromBearerToken(token, adminClient) {
    const { data: { user }, error, } = await adminClient.auth.getUser(token);
    if (error)
        return null;
    return user !== null && user !== void 0 ? user : null;
}
async function requirePlatformAdmin(request) {
    var _a, _b, _c, _d;
    const bearerToken = getBearerToken(request);
    const adminClient = (0, admin_1.createAdminClient)();
    const allowlistedEmails = getPlatformAdminEmailAllowlist();
    let userId = null;
    let email = null;
    if (bearerToken) {
        const tokenUser = await getUserFromBearerToken(bearerToken, adminClient);
        userId = (_a = tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.id) !== null && _a !== void 0 ? _a : null;
        email = (_b = tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.email) !== null && _b !== void 0 ? _b : null;
    }
    else {
        const supabase = await (0, server_1.createClient)();
        const { data: { user }, } = await supabase.auth.getUser();
        userId = (_c = user === null || user === void 0 ? void 0 : user.id) !== null && _c !== void 0 ? _c : null;
        email = (_d = user === null || user === void 0 ? void 0 : user.email) !== null && _d !== void 0 ? _d : null;
    }
    if (!userId) {
        return null;
    }
    const { data: profile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
    if ((profile === null || profile === void 0 ? void 0 : profile.role) !== 'platform_admin') {
        const normalizedEmail = (email !== null && email !== void 0 ? email : '').trim().toLowerCase();
        const allowlisted = normalizedEmail.length > 0 && allowlistedEmails.has(normalizedEmail);
        if (!allowlisted) {
            return null;
        }
        await adminClient.from('user_profiles').upsert({
            id: userId,
            role: 'platform_admin',
        }, { onConflict: 'id' });
    }
    return {
        userId,
        email,
    };
}
