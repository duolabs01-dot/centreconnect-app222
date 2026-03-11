"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAllowedRole = sanitizeAllowedRole;
exports.resolveProvisionRoleFromSignals = resolveProvisionRoleFromSignals;
exports.resolveProvisionRole = resolveProvisionRole;
exports.syncAuthUserMetadataRole = syncAuthUserMetadataRole;
require("server-only");
function parseRole(value) {
    return value === 'platform_admin' ||
        value === 'ecd_admin' ||
        value === 'ecd_staff' ||
        value === 'ecd_supervisor' ||
        value === 'parent_user'
        ? value
        : null;
}
function parseEcdRole(value) {
    return value === 'ecd_admin' || value === 'ecd_staff' || value === 'ecd_supervisor' ? value : null;
}
function uniq(values) {
    return Array.from(new Set(values.filter((value) => Boolean(value && value.trim()))));
}
function sanitizeAllowedRole(value) {
    var _a;
    return (_a = parseRole(value)) !== null && _a !== void 0 ? _a : 'parent_user';
}
function resolveProvisionRoleFromSignals(signals) {
    const roleFromExisting = parseRole(signals.existingProfileRole);
    if (roleFromExisting === 'platform_admin') {
        return { role: 'platform_admin', source: 'profile' };
    }
    if (roleFromExisting === 'ecd_admin' || roleFromExisting === 'ecd_staff' || roleFromExisting === 'ecd_supervisor') {
        return { role: roleFromExisting, source: 'profile' };
    }
    const roleFromMembership = parseEcdRole(signals.membershipRole);
    if (roleFromMembership) {
        return { role: roleFromMembership, source: 'membership' };
    }
    const roleFromInvitation = parseEcdRole(signals.invitationRole);
    if (roleFromInvitation) {
        return { role: roleFromInvitation, source: 'invitation' };
    }
    const roleFromMetadata = parseRole(signals.metadataRole);
    if (roleFromMetadata) {
        return { role: roleFromMetadata, source: 'metadata' };
    }
    return { role: 'parent_user', source: 'fallback' };
}
async function resolveProvisionRole(input) {
    var _a, _b, _c, _d;
    const normalizedEmail = ((_a = input.email) !== null && _a !== void 0 ? _a : '').trim().toLowerCase();
    const roleFromMetadata = parseRole(input.metadataRole);
    const roleFromExisting = (_b = parseRole(input.existingProfileRole)) !== null && _b !== void 0 ? _b : (await (async () => {
        const { data } = await input.adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', input.userId)
            .maybeSingle();
        return parseRole(data === null || data === void 0 ? void 0 : data.role);
    })());
    const { data: membershipRows } = await input.adminClient
        .from('ecd_admins')
        .select('ecd_id,role,invited_at')
        .eq('user_id', input.userId)
        .order('invited_at', { ascending: false })
        .limit(20);
    const membershipRole = (_c = (membershipRows !== null && membershipRows !== void 0 ? membershipRows : [])
        .map((row) => parseEcdRole(row.role))
        .find((role) => Boolean(role))) !== null && _c !== void 0 ? _c : null;
    const membershipEcdIds = uniq((membershipRows !== null && membershipRows !== void 0 ? membershipRows : []).map((row) => row.ecd_id));
    if (membershipRole) {
        return {
            role: membershipRole,
            source: 'membership',
            existingProfileRole: roleFromExisting,
            membershipRole,
            invitationRole: null,
            ecdIds: membershipEcdIds,
        };
    }
    const { data: invitationByAuthUser } = await input.adminClient
        .from('ecd_admin_invitations')
        .select('ecd_id,role,invited_at')
        .eq('auth_user_id', input.userId)
        .order('invited_at', { ascending: false })
        .limit(20);
    const { data: invitationByEmail } = normalizedEmail
        ? await input.adminClient
            .from('ecd_admin_invitations')
            .select('ecd_id,role,invited_at')
            .eq('email', normalizedEmail)
            .order('invited_at', { ascending: false })
            .limit(20)
        : { data: [] };
    const invitationRows = [...(invitationByAuthUser !== null && invitationByAuthUser !== void 0 ? invitationByAuthUser : []), ...(invitationByEmail !== null && invitationByEmail !== void 0 ? invitationByEmail : [])];
    const invitationRole = (_d = invitationRows
        .map((row) => parseEcdRole(row.role))
        .find((role) => Boolean(role))) !== null && _d !== void 0 ? _d : null;
    const invitationEcdIds = uniq(invitationRows.map((row) => row.ecd_id));
    const resolved = resolveProvisionRoleFromSignals({
        existingProfileRole: roleFromExisting,
        membershipRole,
        invitationRole,
        metadataRole: roleFromMetadata,
    });
    if (resolved.source === 'membership') {
        return {
            role: resolved.role,
            source: resolved.source,
            existingProfileRole: roleFromExisting,
            membershipRole,
            invitationRole,
            ecdIds: membershipEcdIds,
        };
    }
    if (resolved.source === 'invitation') {
        return {
            role: resolved.role,
            source: resolved.source,
            existingProfileRole: roleFromExisting,
            membershipRole,
            invitationRole,
            ecdIds: invitationEcdIds,
        };
    }
    return {
        role: resolved.role,
        source: resolved.source,
        existingProfileRole: roleFromExisting,
        membershipRole,
        invitationRole,
        ecdIds: [],
    };
}
async function syncAuthUserMetadataRole(input) {
    var _a, _b;
    const { data: userResult, error: fetchError } = await input.adminClient.auth.admin.getUserById(input.userId);
    if (fetchError)
        return { ok: false, error: fetchError.message };
    const currentMetadata = ((_b = (_a = userResult.user) === null || _a === void 0 ? void 0 : _a.user_metadata) !== null && _b !== void 0 ? _b : {});
    if (currentMetadata.role === input.role) {
        return { ok: true, changed: false };
    }
    const { error: updateError } = await input.adminClient.auth.admin.updateUserById(input.userId, {
        user_metadata: Object.assign(Object.assign({}, currentMetadata), { role: input.role }),
    });
    if (updateError)
        return { ok: false, error: updateError.message };
    return { ok: true, changed: true };
}
