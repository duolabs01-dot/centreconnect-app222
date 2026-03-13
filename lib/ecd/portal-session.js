"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEcdPortalSession = getEcdPortalSession;
exports.requireEcdPortalSession = requireEcdPortalSession;
require("server-only");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
async function getLatestMembership(supabase, userId) {
    const { data: memberships } = await supabase
        .from('ecd_admins')
        .select('ecd_id')
        .eq('user_id', userId)
        .order('invited_at', { ascending: false })
        .limit(10);
    const membershipRows = (memberships !== null && memberships !== void 0 ? memberships : []).filter((row) => Boolean(row === null || row === void 0 ? void 0 : row.ecd_id));
    if (membershipRows.length === 0)
        return null;
    const candidateIds = Array.from(new Set(membershipRows.map((row) => row.ecd_id)));
    const { data: visibleCentres } = await supabase.from('ecd_centres').select('id').in('id', candidateIds);
    const visibleSet = new Set((visibleCentres !== null && visibleCentres !== void 0 ? visibleCentres : []).map((centre) => centre.id));
    const validMembership = membershipRows.find((row) => visibleSet.has(row.ecd_id));
    if (validMembership === null || validMembership === void 0 ? void 0 : validMembership.ecd_id)
        return validMembership.ecd_id;
    return null;
}
async function tryRepairEcdMembership(input) {
    var _a, _b, _c;
    const normalizedEmail = ((_a = input.email) !== null && _a !== void 0 ? _a : '').trim().toLowerCase();
    try {
        const admin = (0, admin_1.createAdminClient)();
        let ecdIdToLink = null;
        let membershipRole = input.role;
        const { data: invitationByUserId } = await admin
            .from('ecd_admin_invitations')
            .select('ecd_id,role,invited_at')
            .eq('auth_user_id', input.userId)
            .order('invited_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        const { data: invitationByEmail } = normalizedEmail
            ? await admin
                .from('ecd_admin_invitations')
                .select('ecd_id,role,invited_at,auth_user_id,accepted_at')
                .eq('email', normalizedEmail)
                .order('invited_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : { data: null };
        const invitation = invitationByUserId !== null && invitationByUserId !== void 0 ? invitationByUserId : invitationByEmail;
        if (invitation === null || invitation === void 0 ? void 0 : invitation.ecd_id) {
            ecdIdToLink = invitation.ecd_id;
            if (invitation.role === 'ecd_admin' || invitation.role === 'ecd_staff' || invitation.role === 'ecd_supervisor') {
                membershipRole = invitation.role;
            }
        }
        if (!ecdIdToLink && input.role === 'ecd_admin' && normalizedEmail) {
            const { data: centreByEmail } = await admin
                .from('ecd_centres')
                .select('id')
                .eq('email', normalizedEmail)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            ecdIdToLink = (_b = centreByEmail === null || centreByEmail === void 0 ? void 0 : centreByEmail.id) !== null && _b !== void 0 ? _b : null;
        }
        if (!ecdIdToLink) {
            return;
        }
        await admin.from('ecd_admins').upsert({
            ecd_id: ecdIdToLink,
            user_id: input.userId,
            role: membershipRole,
            accepted_at: new Date().toISOString(),
        }, { onConflict: 'ecd_id,user_id' });
        if (membershipRole === 'ecd_admin') {
            await admin
                .from('ecd_centres')
                .update({ owner_id: input.userId })
                .eq('id', ecdIdToLink)
                .is('owner_id', null);
        }
        if ((invitationByEmail === null || invitationByEmail === void 0 ? void 0 : invitationByEmail.ecd_id) === ecdIdToLink && !invitationByEmail.auth_user_id) {
            await admin
                .from('ecd_admin_invitations')
                .update({
                auth_user_id: input.userId,
                accepted_at: (_c = invitationByEmail.accepted_at) !== null && _c !== void 0 ? _c : new Date().toISOString(),
            })
                .eq('ecd_id', ecdIdToLink)
                .eq('email', normalizedEmail);
        }
    }
    catch (_d) {
        // If admin fallback is unavailable, we keep normal auth flow without crashing.
    }
}
async function resolveEcdPortalSession() {
    var _a, _b;
    const supabase = await (0, server_1.createClient)();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user)
        return null;
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    const role = profile === null || profile === void 0 ? void 0 : profile.role;
    if (!role || (role !== 'ecd_admin' && role !== 'ecd_staff' && role !== 'ecd_supervisor')) {
        return null;
    }
    let ecdId = await getLatestMembership(supabase, user.id);
    if (!ecdId) {
        await tryRepairEcdMembership({
            userId: user.id,
            email: (_a = user.email) !== null && _a !== void 0 ? _a : null,
            role,
        });
        ecdId = await getLatestMembership(supabase, user.id);
    }
    if (!ecdId)
        return null;
    return {
        supabase,
        user: {
            id: user.id,
            email: (_b = user.email) !== null && _b !== void 0 ? _b : null,
        },
        role,
        ecdId,
    };
}
const getEcdPortalSessionCached = (0, react_1.cache)(resolveEcdPortalSession);
async function getEcdPortalSession(options = {}) {
    return options.cached === false ? await resolveEcdPortalSession() : await getEcdPortalSessionCached();
}
async function requireEcdPortalSession(options = {}) {
    const session = await getEcdPortalSession(options);
    if (!session) {
        (0, navigation_1.redirect)('/ecd/login');
    }
    return session;
}
