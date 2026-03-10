import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const TARGET_EMAIL = 'duolabs01@gmail.com';
const TARGET_CENTRE_SLUG = 'sunshine-early-learning';
function loadDotEnvLocal() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath))
        return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const idx = line.indexOf('=');
        if (idx <= 0)
            continue;
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key])
            process.env[key] = value;
    }
}
function makeId(suffix) {
    return `9f7a0000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
}
function closesInDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}
async function main() {
    loadDotEnvLocal();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersRes.error)
        throw usersRes.error;
    const authUser = usersRes.data.users.find((u) => { var _a; return ((_a = u.email) !== null && _a !== void 0 ? _a : '').toLowerCase() === TARGET_EMAIL.toLowerCase(); });
    if (!authUser)
        throw new Error(`Auth user not found for ${TARGET_EMAIL}`);
    let { data: centre } = await supabase
        .from('ecd_centres')
        .select('id,slug,name')
        .eq('slug', TARGET_CENTRE_SLUG)
        .maybeSingle();
    if (!centre) {
        const { data: fallbackCentre, error: fallbackErr } = await supabase
            .from('ecd_centres')
            .select('id,slug,name')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (fallbackErr || !fallbackCentre)
            throw fallbackErr !== null && fallbackErr !== void 0 ? fallbackErr : new Error('No active ECD centre found');
        centre = fallbackCentre;
    }
    const publishedAt = new Date().toISOString();
    const rows = [
        {
            id: makeId(9001),
            ecd_id: centre.id,
            title: 'ECD Assistant Teacher',
            role_type: 'assistant',
            description: 'Support daily learning activities, classroom setup, and child supervision.',
            requirements: 'ECD Level 4 or equivalent experience. Caring attitude and strong communication.',
            is_published: true,
            published_at: publishedAt,
            closes_at: closesInDays(14),
            created_by: authUser.id,
        },
        {
            id: makeId(9002),
            ecd_id: centre.id,
            title: 'Aftercare Support Practitioner',
            role_type: 'practitioner',
            description: 'Lead aftercare routines, homework support, and parent handover updates.',
            requirements: 'Experience with ages 4-6. Reliable attendance and positive behaviour guidance.',
            is_published: true,
            published_at: publishedAt,
            closes_at: closesInDays(21),
            created_by: authUser.id,
        },
    ];
    const upsert = await supabase.from('jobs').upsert(rows, { onConflict: 'id' });
    if (upsert.error)
        throw upsert.error;
    console.log('DEMO_JOBS_SEED_SUCCESS');
    console.log(JSON.stringify({
        email: TARGET_EMAIL,
        centre: `${centre.name} (${centre.slug})`,
        createdJobs: rows.length,
    }, null, 2));
}
main().catch((error) => {
    console.error('DEMO_JOBS_SEED_FAILED');
    console.error(error);
    process.exitCode = 1;
});
