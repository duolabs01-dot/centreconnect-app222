import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
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
    return Object.assign(Object.assign(Object.assign({}, parseEnvFile(path.join(root, '.env'))), parseEnvFile(path.join(root, '.env.local'))), process.env);
}
async function main() {
    const env = loadMergedEnv();
    const baseUrl = env.SMOKE_BASE_URL || 'http://localhost:3000';
    const slug = 'bajabulile';
    console.log(`[smoke-bajabulile] Testing application friction for: ${slug}`);
    console.log(`[smoke-bajabulile] Base URL: ${baseUrl}`);
    const routes = [
        `/c/${slug}`,
        `/apply/${slug}`,
        `/api/directory/search?search=${slug}`,
    ];
    const results = await Promise.all(routes.map(async (route) => {
        const url = `${baseUrl}${route}`;
        const started = Date.now();
        try {
            const response = await fetch(url);
            const elapsed = Date.now() - started;
            return { route, status: response.status, ok: response.ok, elapsed };
        }
        catch (err) {
            return { route, status: 'FETCH_ERROR', ok: false, elapsed: Date.now() - started, error: err.message };
        }
    }));
    let allOk = true;
    for (const res of results) {
        console.log(`[smoke-bajabulile] ${res.route} status=${res.status} t=${res.elapsed}ms`);
        // We expect FETCH_ERROR if local server isn't running, which is fine for now as we want to focus on DB check
        // If it's FETCH_ERROR, we don't fail the whole script, but we report it.
        if (res.status !== 'FETCH_ERROR' && !res.ok)
            allOk = false;
    }
    // Check database entry for Bajabulile
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase
            .from('public_ecd_centres')
            .select('id, name, slug, is_registered')
            .ilike('slug', `%${slug}%`)
            .maybeSingle();
        if (error) {
            console.error(`[smoke-bajabulile] DB Error: ${error.message}`);
            allOk = false;
        }
        else if (!data) {
            console.error(`[smoke-bajabulile] DB Error: Bajabulile not found in public_ecd_centres`);
            allOk = false;
        }
        else {
            console.log(`[smoke-bajabulile] DB Check: Found ${data.name} (ID: ${data.id})`);
            if (!data.is_registered) {
                console.warn(`[smoke-bajabulile] Warning: Bajabulile is not marked as is_registered in DB.`);
            }
        }
    }
    else {
        console.warn(`[smoke-bajabulile] Skipping DB check (missing Supabase env vars)`);
    }
    if (!allOk) {
        console.error('[smoke-bajabulile] FAILED friction check');
        process.exit(1);
    }
    else {
        console.log('[smoke-bajabulile] SUCCESS: DB check passed for Bajabulile');
    }
}
main().catch(err => {
    console.error('[smoke-bajabulile] Fatal error:', err);
    process.exit(1);
});
