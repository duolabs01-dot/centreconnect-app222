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
function dateInCurrentMonth(dayOffset) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = new Date(year, month, 1 + dayOffset);
    return date.toISOString().slice(0, 10);
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
        const { data: fallback } = await supabase
            .from('ecd_centres')
            .select('id,slug,name')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (!fallback)
            throw new Error('No active centre found');
        centre = fallback;
    }
    const rows = [
        {
            id: makeId(9101),
            ecd_id: centre.id,
            title: 'Birthday Celebration 🎂',
            description: 'Celebrate this month birthdays after morning circle.',
            event_date: dateInCurrentMonth(3),
            start_time: '10:00',
            end_time: '11:00',
            is_public: false,
            created_by: authUser.id,
        },
        {
            id: makeId(9102),
            ecd_id: centre.id,
            title: 'Parent Meeting 👨‍👩‍👧',
            description: 'Monthly parent update and Q&A with centre leadership.',
            event_date: dateInCurrentMonth(7),
            start_time: '17:30',
            end_time: '18:30',
            is_public: true,
            created_by: authUser.id,
        },
        {
            id: makeId(9103),
            ecd_id: centre.id,
            title: 'Sports Day 🏅',
            description: 'Movement and fun activities for all classes.',
            event_date: dateInCurrentMonth(10),
            start_time: '09:00',
            end_time: '12:00',
            is_public: true,
            created_by: authUser.id,
        },
        {
            id: makeId(9104),
            ecd_id: centre.id,
            title: 'Staff Planning Session',
            description: 'Internal planning for next week curriculum.',
            event_date: dateInCurrentMonth(12),
            start_time: '15:30',
            end_time: '16:30',
            is_public: false,
            created_by: authUser.id,
        },
        {
            id: makeId(9105),
            ecd_id: centre.id,
            title: 'Open Day for New Parents',
            description: 'Walkthrough for new families and Q&A.',
            event_date: dateInCurrentMonth(17),
            start_time: '10:00',
            end_time: '12:00',
            is_public: true,
            created_by: authUser.id,
        },
        {
            id: makeId(9106),
            ecd_id: centre.id,
            title: 'Health & Safety Drill',
            description: 'Internal safety drill and classroom checks.',
            event_date: dateInCurrentMonth(20),
            start_time: '09:30',
            end_time: '10:00',
            is_public: false,
            created_by: authUser.id,
        },
    ];
    const upsert = await supabase.from('calendar_events').upsert(rows, { onConflict: 'id' });
    if (upsert.error)
        throw upsert.error;
    console.log('DEMO_EVENTS_SEED_SUCCESS');
    console.log(JSON.stringify({
        email: TARGET_EMAIL,
        centre: `${centre.name} (${centre.slug})`,
        createdEvents: rows.length,
    }, null, 2));
}
main().catch((error) => {
    console.error('DEMO_EVENTS_SEED_FAILED');
    console.error(error);
    process.exitCode = 1;
});
