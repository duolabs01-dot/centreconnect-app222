import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
const CANONICAL_ADMIN_EMAIL = 'admin@centerconnect.co.za';
const LEGACY_ADMIN_EMAIL = 'admin@centreconnect.co.za';
const LEGACY_BAN_DURATION = '876000h'; // ~100 years
function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath))
        return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const idx = line.indexOf('=');
        if (idx <= 0)
            continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        parsed[key] = value;
    }
    return parsed;
}
function loadEnv() {
    const root = process.cwd();
    const fileEnv = Object.assign(Object.assign({}, parseEnvFile(path.join(root, '.env'))), parseEnvFile(path.join(root, '.env.local')));
    return Object.assign(Object.assign({}, fileEnv), process.env);
}
function readValue(env, keys) {
    var _a;
    for (const key of keys) {
        const value = String((_a = env[key]) !== null && _a !== void 0 ? _a : '').trim();
        if (value)
            return value;
    }
    return '';
}
function parseArgs(argv) {
    const result = {};
    for (let i = 0; i < argv.length; i += 1) {
        const raw = argv[i];
        if (!raw.startsWith('--'))
            continue;
        const key = raw.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            result[key] = next;
            i += 1;
        }
        else {
            result[key] = 'true';
        }
    }
    return result;
}
async function listAllUsers(admin) {
    var _a;
    const users = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error)
            throw new Error(`Failed listing users: ${error.message}`);
        const batch = (_a = data === null || data === void 0 ? void 0 : data.users) !== null && _a !== void 0 ? _a : [];
        users.push(...batch);
        if (batch.length < perPage)
            break;
        page += 1;
    }
    return users;
}
function byEmail(users, email) {
    var _a;
    const normalized = email.trim().toLowerCase();
    return (_a = users.find((user) => { var _a; return String((_a = user.email) !== null && _a !== void 0 ? _a : '').trim().toLowerCase() === normalized; })) !== null && _a !== void 0 ? _a : null;
}
async function ensurePlatformAdminProfile(admin, userId, fullName) {
    var _a;
    const fallbackName = String(fullName !== null && fullName !== void 0 ? fullName : '').trim() || 'CentreConnect Admin';
    const { data: existingProfile, error: existingProfileError } = await admin
        .from('user_profiles')
        .select('id,full_name')
        .eq('id', userId)
        .maybeSingle();
    if (existingProfileError) {
        throw new Error(`Failed reading platform_admin profile: ${existingProfileError.message}`);
    }
    if (existingProfile === null || existingProfile === void 0 ? void 0 : existingProfile.id) {
        const updates = { role: 'platform_admin' };
        if (!String((_a = existingProfile.full_name) !== null && _a !== void 0 ? _a : '').trim()) {
            updates.full_name = fallbackName;
        }
        const { error } = await admin.from('user_profiles').update(updates).eq('id', userId);
        if (error)
            throw new Error(`Failed updating platform_admin profile: ${error.message}`);
        return;
    }
    const { error } = await admin.from('user_profiles').insert({
        id: userId,
        role: 'platform_admin',
        full_name: fallbackName,
    });
    if (error)
        throw new Error(`Failed creating platform_admin profile: ${error.message}`);
}
async function demoteLegacyProfile(admin, userId) {
    const { error } = await admin
        .from('user_profiles')
        .update({ role: 'parent_user' })
        .eq('id', userId);
    if (error)
        throw new Error(`Failed demoting legacy profile: ${error.message}`);
}
async function updateAuthUser(admin, userId, payload, label) {
    const { error } = await admin.auth.admin.updateUserById(userId, payload);
    if (error)
        throw new Error(`Failed ${label}: ${error.message}`);
}
async function createCanonicalAdmin(admin, password) {
    var _a, _b, _c, _d, _e;
    const { data, error } = await admin.auth.admin.createUser({
        email: CANONICAL_ADMIN_EMAIL,
        password,
        email_confirm: true,
        user_metadata: { role: 'platform_admin' },
    });
    if (error || !((_a = data.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new Error(`Failed creating canonical admin user: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : 'unknown error'}`);
    }
    await ensurePlatformAdminProfile(admin, data.user.id, (_d = (_c = data.user.user_metadata) === null || _c === void 0 ? void 0 : _c.full_name) !== null && _d !== void 0 ? _d : (_e = data.user.user_metadata) === null || _e === void 0 ? void 0 : _e.name);
    return data.user.id;
}
async function main() {
    var _a, _b, _c, _d, _e, _f, _g;
    const args = parseArgs(process.argv.slice(2));
    const env = loadEnv();
    const supabaseUrl = readValue(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
    const serviceRole = readValue(env, ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY']);
    const password = String((_a = args.password) !== null && _a !== void 0 ? _a : '').trim();
    if (!supabaseUrl || !serviceRole) {
        throw new Error('Missing Supabase admin env. Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
    }
    if (!password) {
        throw new Error('Missing --password argument for canonical admin reset.');
    }
    const admin = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const users = await listAllUsers(admin);
    let canonical = byEmail(users, CANONICAL_ADMIN_EMAIL);
    let legacy = byEmail(users, LEGACY_ADMIN_EMAIL);
    if (!canonical && !legacy) {
        const createdId = await createCanonicalAdmin(admin, password);
        console.log(`Created canonical platform admin: ${CANONICAL_ADMIN_EMAIL} (${createdId})`);
        return;
    }
    if (!canonical && legacy) {
        await updateAuthUser(admin, legacy.id, {
            email: CANONICAL_ADMIN_EMAIL,
            password,
            email_confirm: true,
            user_metadata: Object.assign(Object.assign({}, ((_b = legacy.user_metadata) !== null && _b !== void 0 ? _b : {})), { role: 'platform_admin' }),
            ban_duration: 'none',
        }, 'migrating legacy admin email to canonical');
        canonical = Object.assign(Object.assign({}, legacy), { email: CANONICAL_ADMIN_EMAIL });
        legacy = null;
        console.log(`Migrated legacy admin email to canonical: ${CANONICAL_ADMIN_EMAIL}`);
    }
    if (!canonical) {
        throw new Error('Canonical admin account is still missing after migration step.');
    }
    await updateAuthUser(admin, canonical.id, {
        password,
        email_confirm: true,
        user_metadata: Object.assign(Object.assign({}, ((_c = canonical.user_metadata) !== null && _c !== void 0 ? _c : {})), { role: 'platform_admin' }),
        ban_duration: 'none',
    }, 'updating canonical admin password');
    await ensurePlatformAdminProfile(admin, canonical.id, (_e = (_d = canonical.user_metadata) === null || _d === void 0 ? void 0 : _d.full_name) !== null && _e !== void 0 ? _e : (_f = canonical.user_metadata) === null || _f === void 0 ? void 0 : _f.name);
    if (legacy && legacy.id !== canonical.id) {
        await updateAuthUser(admin, legacy.id, {
            ban_duration: LEGACY_BAN_DURATION,
            user_metadata: Object.assign(Object.assign({}, ((_g = legacy.user_metadata) !== null && _g !== void 0 ? _g : {})), { role: 'parent_user', replaced_by: CANONICAL_ADMIN_EMAIL }),
        }, 'banning legacy admin account');
        await demoteLegacyProfile(admin, legacy.id);
        console.log(`Legacy admin account disabled: ${LEGACY_ADMIN_EMAIL}`);
    }
    console.log(`Canonical platform admin is active: ${CANONICAL_ADMIN_EMAIL}`);
}
main().catch((error) => {
    console.error('[replace-platform-admin-account] Failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
