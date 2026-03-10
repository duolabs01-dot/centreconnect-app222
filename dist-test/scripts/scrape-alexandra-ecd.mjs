import fs from 'node:fs/promises';
import path from 'node:path';
const ALEX_VIEWBOX = '28.075,-26.055,28.145,-26.115';
const OUTPUT_JSON = path.resolve(process.cwd(), 'data', 'alexandra-ecd-scrape.json');
const OUTPUT_CSV = path.resolve(process.cwd(), 'data', 'alexandra-ecd-scrape.csv');
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function normalizeName(value) {
    return (value !== null && value !== void 0 ? value : '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function csvEscape(value) {
    const text = String(value !== null && value !== void 0 ? value : '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
}
async function fetchOverpass() {
    var _a;
    const query = '[out:json][timeout:90];(' +
        'node["amenity"~"^(kindergarten|childcare)$"](-26.115,28.075,-26.055,28.145);' +
        'way["amenity"~"^(kindergarten|childcare)$"](-26.115,28.075,-26.055,28.145);' +
        'relation["amenity"~"^(kindergarten|childcare)$"](-26.115,28.075,-26.055,28.145);' +
        ');out center tags;';
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
    ];
    let payload = null;
    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ data: query }),
            });
            if (!response.ok) {
                lastError = new Error(`Overpass failed (${endpoint}): ${response.status}`);
                continue;
            }
            payload = await response.json();
            break;
        }
        catch (error) {
            lastError = error;
        }
    }
    if (!payload) {
        throw lastError !== null && lastError !== void 0 ? lastError : new Error('Overpass failed across all endpoints');
    }
    return ((_a = payload.elements) !== null && _a !== void 0 ? _a : []).map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const lat = (_c = (_a = item.lat) !== null && _a !== void 0 ? _a : (_b = item.center) === null || _b === void 0 ? void 0 : _b.lat) !== null && _c !== void 0 ? _c : null;
        const lon = (_f = (_d = item.lon) !== null && _d !== void 0 ? _d : (_e = item.center) === null || _e === void 0 ? void 0 : _e.lon) !== null && _f !== void 0 ? _f : null;
        const tags = (_g = item.tags) !== null && _g !== void 0 ? _g : {};
        const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']]
            .filter(Boolean)
            .join(', ');
        return {
            name: (_h = tags.name) !== null && _h !== void 0 ? _h : null,
            source: 'openstreetmap_overpass',
            source_url: `https://www.openstreetmap.org/${item.type}/${item.id}`,
            lat,
            lon,
            address: address || null,
            phone: (_k = (_j = tags.phone) !== null && _j !== void 0 ? _j : tags['contact:phone']) !== null && _k !== void 0 ? _k : null,
            email: (_m = (_l = tags.email) !== null && _l !== void 0 ? _l : tags['contact:email']) !== null && _m !== void 0 ? _m : null,
            amenity: (_o = tags.amenity) !== null && _o !== void 0 ? _o : null,
            confidence: 'high',
            raw_tags: tags,
        };
    });
}
function parseCojNamesFromHtml(html) {
    const marker = /The following ECD centre's took part in the games;([^.\n]+)/i.exec(html);
    if (!marker)
        return [];
    return marker[1]
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}
async function fetchCojNames() {
    const url = 'https://joburg.org.za/media_/Newsroom/Pages/2022%20News%20Articles/April/The-City-hosts-annual-Kiddies-Games-in-the-heart-of-Alex.aspx';
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'centreconnect-scraper/1.0' },
        });
        if (!response.ok) {
            throw new Error(`CoJ page failed: ${response.status}`);
        }
        const html = await response.text();
        const parsed = parseCojNamesFromHtml(html);
        if (parsed.length > 0) {
            return parsed.map((name) => ({
                name,
                source: 'coj_kiddies_games_2022',
                source_url: url,
            }));
        }
    }
    catch (_a) {
        // Continue with a known fallback list if the source endpoint blocks TLS in this environment.
    }
    const fallbackNames = [
        'Mojadife',
        'Bophelong',
        'Sweeto',
        'Siyabangena',
        'Alex ECD',
        'Lukhanyiso',
        'Isolihle',
        'Zakhele',
        'Little Flowers',
    ];
    return fallbackNames.map((name) => ({
        name,
        source: 'coj_kiddies_games_2022_fallback',
        source_url: url,
    }));
}
async function geocodeInAlexandra(name) {
    var _a, _b, _c;
    const query = `${name}, Alexandra, Johannesburg`;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=${encodeURIComponent(ALEX_VIEWBOX)}` +
        `&bounded=1&addressdetails=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'centreconnect-scraper/1.0 (contact: local-run)' },
    });
    if (!response.ok) {
        return null;
    }
    const rows = await response.json();
    const best = rows === null || rows === void 0 ? void 0 : rows[0];
    if (!best)
        return null;
    return {
        lat: best.lat ? Number(best.lat) : null,
        lon: best.lon ? Number(best.lon) : null,
        address: (_a = best.display_name) !== null && _a !== void 0 ? _a : null,
        osm_type: (_b = best.osm_type) !== null && _b !== void 0 ? _b : null,
        osm_id: (_c = best.osm_id) !== null && _c !== void 0 ? _c : null,
    };
}
async function main() {
    var _a, _b, _c;
    const [overpassRows, cojRows] = await Promise.all([fetchOverpass(), fetchCojNames()]);
    const enrichedCoj = [];
    for (const row of cojRows) {
        const geo = await geocodeInAlexandra(row.name);
        enrichedCoj.push({
            name: row.name,
            source: row.source,
            source_url: row.source_url,
            lat: (_a = geo === null || geo === void 0 ? void 0 : geo.lat) !== null && _a !== void 0 ? _a : null,
            lon: (_b = geo === null || geo === void 0 ? void 0 : geo.lon) !== null && _b !== void 0 ? _b : null,
            address: (_c = geo === null || geo === void 0 ? void 0 : geo.address) !== null && _c !== void 0 ? _c : null,
            phone: null,
            email: null,
            amenity: 'ecd',
            confidence: geo ? 'medium' : 'low',
            raw_tags: geo !== null && geo !== void 0 ? geo : null,
        });
        await sleep(700);
    }
    const merged = [...overpassRows, ...enrichedCoj];
    const dedup = new Map();
    for (const row of merged) {
        const key = normalizeName(row.name) || `${row.lat},${row.lon}`;
        if (!key)
            continue;
        const prev = dedup.get(key);
        if (!prev) {
            dedup.set(key, row);
            continue;
        }
        const prefer = (prev.confidence === 'high' ? 2 : prev.confidence === 'medium' ? 1 : 0) >=
            (row.confidence === 'high' ? 2 : row.confidence === 'medium' ? 1 : 0)
            ? prev
            : row;
        dedup.set(key, Object.assign(Object.assign({}, prefer), { source: `${prev.source}|${row.source}` }));
    }
    const result = Array.from(dedup.values())
        .filter((row) => row.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
    await fs.writeFile(OUTPUT_JSON, JSON.stringify({
        generated_at: new Date().toISOString(),
        area: 'Alexandra, Johannesburg',
        records: result,
    }, null, 2), 'utf8');
    const header = [
        'name',
        'source',
        'source_url',
        'lat',
        'lon',
        'address',
        'phone',
        'email',
        'amenity',
        'confidence',
    ];
    const lines = [header.join(',')];
    for (const row of result) {
        lines.push([
            row.name,
            row.source,
            row.source_url,
            row.lat,
            row.lon,
            row.address,
            row.phone,
            row.email,
            row.amenity,
            row.confidence,
        ]
            .map(csvEscape)
            .join(','));
    }
    await fs.writeFile(OUTPUT_CSV, `${lines.join('\n')}\n`, 'utf8');
    console.log(`Saved ${result.length} records`);
    console.log(`JSON: ${OUTPUT_JSON}`);
    console.log(`CSV : ${OUTPUT_CSV}`);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
