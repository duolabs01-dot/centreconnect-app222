import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
const args = new Set(process.argv.slice(2));
const isLive = args.has('--live');
const isDryRun = args.has('--dry-run') || !isLive;
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
function loadMergedEnv() {
    const root = process.cwd();
    const fileEnv = Object.assign(Object.assign({}, parseEnvFile(path.join(root, '.env'))), parseEnvFile(path.join(root, '.env.local')));
    return Object.assign(Object.assign({}, fileEnv), process.env);
}
function requireEnv(env, key) {
    var _a;
    const value = String((_a = env[key]) !== null && _a !== void 0 ? _a : '').trim();
    if (!value) {
        throw new Error(`Missing required env key: ${key}`);
    }
    return value;
}
function reportLine(message) {
    console.log(`[parent-live-smoke] ${message}`);
}
async function main() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const env = loadMergedEnv();
    const supabaseUrl = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
    const now = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const testEmail = `uat-parent-${now}-${random}@example.com`;
    const testPassword = `ParentUAT!${Math.random().toString(36).slice(2, 10)}`;
    const report = {
        mode: isDryRun ? 'dry-run' : 'live',
        startedAt: new Date().toISOString(),
        checks: {
            createParentAuthUser: 'pending',
            parentCanCreateChild: 'pending',
            parentCanCreateEmergencyContact: 'pending',
            cleanup: 'pending',
        },
        metadata: {
            testEmail,
        },
        failures: [],
    };
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
    let userId = null;
    let childId = null;
    let emergencyId = null;
    try {
        if (isDryRun) {
            report.checks.createParentAuthUser = 'skipped(dry-run)';
            report.checks.parentCanCreateChild = 'skipped(dry-run)';
            report.checks.parentCanCreateEmergencyContact = 'skipped(dry-run)';
            report.checks.cleanup = 'skipped(dry-run)';
            reportLine('Dry run completed. No remote writes executed.');
        }
        else {
            const userResult = await admin.auth.admin.createUser({
                email: testEmail,
                password: testPassword,
                email_confirm: true,
                user_metadata: {
                    role: 'parent_user',
                    full_name: 'Parent UAT',
                    first_name: 'Parent',
                    phone: '0820000000',
                },
            });
            if (userResult.error || !((_b = (_a = userResult.data) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id)) {
                throw new Error(((_c = userResult.error) === null || _c === void 0 ? void 0 : _c.message) || 'Failed to create auth user');
            }
            userId = userResult.data.user.id;
            report.checks.createParentAuthUser = 'passed';
            reportLine(`Created test auth user ${userId}`);
            const profileUpsert = await admin.from('user_profiles').upsert({
                id: userId,
                role: 'parent_user',
                full_name: 'Parent UAT',
                phone: '0820000000',
            }, { onConflict: 'id' });
            if (profileUpsert.error) {
                throw new Error(`Failed to upsert profile: ${profileUpsert.error.message}`);
            }
            const parentUpsert = await admin
                .from('parents')
                .upsert({ id: userId }, { onConflict: 'id' });
            if (parentUpsert.error) {
                throw new Error(`Failed to upsert parent: ${parentUpsert.error.message}`);
            }
            const signIn = await anon.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });
            if (signIn.error || !((_e = (_d = signIn.data) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.id)) {
                throw new Error(((_f = signIn.error) === null || _f === void 0 ? void 0 : _f.message) || 'Failed to sign in as test parent');
            }
            const childInsert = await anon
                .from('children')
                .insert({
                parent_id: userId,
                first_name: 'Uat',
                last_name: 'Child',
                date_of_birth: '2021-06-01',
                gender: 'female',
                allergies: ['Peanut'],
                medical_conditions: ['Asthma'],
                special_needs: null,
            })
                .select('id,parent_id,first_name,last_name')
                .single();
            if (childInsert.error || !((_g = childInsert.data) === null || _g === void 0 ? void 0 : _g.id)) {
                throw new Error(((_h = childInsert.error) === null || _h === void 0 ? void 0 : _h.message) || 'Failed to create child profile');
            }
            childId = childInsert.data.id;
            if (childInsert.data.parent_id !== userId) {
                throw new Error('Created child profile has unexpected parent_id');
            }
            report.checks.parentCanCreateChild = 'passed';
            reportLine(`Created child profile ${childId}`);
            const emergencyInsert = await anon
                .from('parent_emergency_contacts')
                .insert({
                parent_id: userId,
                full_name: 'UAT Emergency',
                phone: '0830000000',
                relationship: 'Parent',
                is_primary: true,
            })
                .select('id,parent_id,full_name')
                .single();
            if (emergencyInsert.error || !((_j = emergencyInsert.data) === null || _j === void 0 ? void 0 : _j.id)) {
                throw new Error(((_k = emergencyInsert.error) === null || _k === void 0 ? void 0 : _k.message) || 'Failed to create emergency contact');
            }
            emergencyId = emergencyInsert.data.id;
            if (emergencyInsert.data.parent_id !== userId) {
                throw new Error('Emergency contact has unexpected parent_id');
            }
            report.checks.parentCanCreateEmergencyContact = 'passed';
            reportLine(`Created emergency contact ${emergencyId}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.failures.push(message);
        if (report.checks.createParentAuthUser === 'pending')
            report.checks.createParentAuthUser = 'failed';
        if (report.checks.parentCanCreateChild === 'pending')
            report.checks.parentCanCreateChild = 'failed';
        if (report.checks.parentCanCreateEmergencyContact === 'pending') {
            report.checks.parentCanCreateEmergencyContact = 'failed';
        }
    }
    finally {
        if (isDryRun) {
            report.checks.cleanup = 'skipped(dry-run)';
        }
        else if (userId) {
            const cleanupErrors = [];
            if (emergencyId) {
                const cleanupEmergency = await admin
                    .from('parent_emergency_contacts')
                    .delete()
                    .eq('id', emergencyId);
                if (cleanupEmergency.error)
                    cleanupErrors.push(cleanupEmergency.error.message);
            }
            if (childId) {
                const cleanupChild = await admin.from('children').delete().eq('id', childId);
                if (cleanupChild.error)
                    cleanupErrors.push(cleanupChild.error.message);
            }
            const deleteUser = await admin.auth.admin.deleteUser(userId);
            if (deleteUser.error)
                cleanupErrors.push(deleteUser.error.message);
            report.checks.cleanup = cleanupErrors.length === 0 ? 'passed' : 'failed';
            for (const message of cleanupErrors) {
                report.failures.push(`cleanup: ${message}`);
            }
        }
        else {
            report.checks.cleanup = 'skipped(no-user-created)';
        }
    }
    report.endedAt = new Date().toISOString();
    report.success =
        report.failures.length === 0 &&
            (isDryRun ||
                (report.checks.createParentAuthUser === 'passed' &&
                    report.checks.parentCanCreateChild === 'passed' &&
                    report.checks.parentCanCreateEmergencyContact === 'passed' &&
                    report.checks.cleanup === 'passed'));
    const outDir = path.join(process.cwd(), 'tmp');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `parent-live-smoke-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    reportLine(`Report: ${outPath}`);
    reportLine(`createParentAuthUser=${report.checks.createParentAuthUser}`);
    reportLine(`parentCanCreateChild=${report.checks.parentCanCreateChild}`);
    reportLine(`parentCanCreateEmergencyContact=${report.checks.parentCanCreateEmergencyContact}`);
    reportLine(`cleanup=${report.checks.cleanup}`);
    if (!report.success) {
        for (const failure of report.failures) {
            reportLine(`FAILURE: ${failure}`);
        }
        process.exitCode = 1;
    }
    else {
        reportLine('Completed successfully.');
    }
}
main().catch((error) => {
    reportLine(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
