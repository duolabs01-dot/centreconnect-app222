import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
function loadDotEnvLocal() {
    const envPath = resolve(process.cwd(), '.env.local');
    if (!existsSync(envPath))
        return;
    const raw = readFileSync(envPath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const eq = line.indexOf('=');
        if (eq === -1)
            continue;
        const key = line.slice(0, eq).trim();
        if (!key || process.env[key] !== undefined)
            continue;
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}
loadDotEnvLocal();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
const AGE_GROUP_OPTIONS = ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6'];
const TAGLINES = [
    'Safe care and joyful learning every day.',
    'Strong foundations for confident little learners.',
    'Play-based learning with caring educators.',
    'Helping children grow, discover, and thrive.',
    'Where curiosity turns into school readiness.',
    'Trusted early learning close to home.',
    'Nurturing minds with warmth and structure.',
    'Big dreams start in small classrooms.',
];
const STREETS = [
    'Main Road',
    '4th Avenue',
    'Ndlovu Street',
    'Unity Lane',
    'Mahlangu Drive',
    '8th Street',
    'Freedom Way',
    'Mabaso Crescent',
];
const SUBURB_META = {
    Alexandra: { city: 'Johannesburg', lat: -26.1052, lng: 28.0872 },
    Marlboro: { city: 'Johannesburg', lat: -26.0891, lng: 28.0997 },
    Wynberg: { city: 'Johannesburg', lat: -26.0962, lng: 28.1034 },
    Bramley: { city: 'Johannesburg', lat: -26.0831, lng: 28.0876 },
    'Linbro Park': { city: 'Johannesburg', lat: -26.0674, lng: 28.1188 },
    Sandringham: { city: 'Johannesburg', lat: -26.1292, lng: 28.0947 },
    Kew: { city: 'Johannesburg', lat: -26.1253, lng: 28.1027 },
    'Orange Grove': { city: 'Johannesburg', lat: -26.1529, lng: 28.0929 },
    'Lombardy East': { city: 'Johannesburg', lat: -26.1252, lng: 28.1193 },
    'Halfway House': { city: 'Midrand', lat: -25.9838, lng: 28.1296 },
    Midrand: { city: 'Midrand', lat: -25.9975, lng: 28.1283 },
    'Ivory Park': { city: 'Midrand', lat: -25.9731, lng: 28.1892 },
    Tembisa: { city: 'Midrand', lat: -25.9981, lng: 28.2178 },
    'Rabie Ridge': { city: 'Midrand', lat: -25.9489, lng: 28.1462 },
    Clayville: { city: 'Midrand', lat: -25.9698, lng: 28.1577 },
};
const CENTRE_BLUEPRINTS = [
    { name: 'Alexandra Little Explorers ECD Centre', suburb: 'Alexandra' },
    { name: 'Marlboro Bright Start Academy', suburb: 'Marlboro' },
    { name: 'Wynberg Tiny Tots Learning Hub', suburb: 'Wynberg' },
    { name: 'Bramley Rainbow Steps Preschool', suburb: 'Bramley' },
    { name: 'Linbro Park Growing Minds ECD', suburb: 'Linbro Park' },
    { name: 'Sandringham Happy Hearts Early Learning', suburb: 'Sandringham' },
    { name: 'Kew Future Stars Preschool', suburb: 'Kew' },
    { name: 'Orange Grove Play and Learn House', suburb: 'Orange Grove' },
    { name: 'Lombardy East Sunshine Seeds ECD', suburb: 'Lombardy East' },
    { name: 'Halfway House Kinderpath Academy', suburb: 'Halfway House' },
    { name: 'Midrand KinderBridge Learning Centre', suburb: 'Midrand' },
    { name: 'Ivory Park Bright Futures Preschool', suburb: 'Ivory Park' },
    { name: 'Tembisa Imbewu Early Learning Centre', suburb: 'Tembisa' },
    { name: 'Rabie Ridge Tiny Trailblazers ECD', suburb: 'Rabie Ridge' },
    { name: 'Clayville Hope Garden Preschool', suburb: 'Clayville' },
    { name: 'Alexandra Ubuntu Kids Academy', suburb: 'Alexandra' },
    { name: 'Marlboro Smart Sprouts Daycare', suburb: 'Marlboro' },
    { name: 'Wynberg Blue Sky Early Years', suburb: 'Wynberg' },
    { name: 'Bramley Joyful Journey Preschool', suburb: 'Bramley' },
    { name: 'Linbro Park Curious Cubs Centre', suburb: 'Linbro Park' },
    { name: 'Sandringham Blossom Tree ECD', suburb: 'Sandringham' },
    { name: 'Kew Rising Stars Nursery School', suburb: 'Kew' },
    { name: 'Orange Grove Nurture Nest Preschool', suburb: 'Orange Grove' },
    { name: 'Lombardy East Wonder Years Academy', suburb: 'Lombardy East' },
    { name: 'Halfway House Little Lanterns ECD', suburb: 'Halfway House' },
    { name: 'Midrand Pioneer Cubs ECD', suburb: 'Midrand' },
    { name: 'Ivory Park Rainbow Bridge Learning', suburb: 'Ivory Park' },
    { name: 'Tembisa Young Scholars Nest', suburb: 'Tembisa' },
    { name: 'Rabie Ridge Bright Horizon ECD', suburb: 'Rabie Ridge' },
    { name: 'Clayville Bambino Bloom Centre', suburb: 'Clayville' },
    { name: 'Alexandra Starlight Kids Campus', suburb: 'Alexandra' },
    { name: 'Marlboro Little Achievers House', suburb: 'Marlboro' },
    { name: 'Wynberg Happy Path ECD Centre', suburb: 'Wynberg' },
    { name: 'Bramley Milestone Kids Preschool', suburb: 'Bramley' },
    { name: 'Linbro Park StartSmart Academy', suburb: 'Linbro Park' },
    { name: 'Sandringham Pebble Brook Learning', suburb: 'Sandringham' },
    { name: 'Kew PlayPatch Preschool', suburb: 'Kew' },
    { name: 'Orange Grove Heritage Kids ECD', suburb: 'Orange Grove' },
    { name: 'Lombardy East Promise Land Preschool', suburb: 'Lombardy East' },
    { name: 'Halfway House Giggle Grove Academy', suburb: 'Halfway House' },
    { name: 'Midrand Summit Kids Academy', suburb: 'Midrand' },
    { name: 'Ivory Park Dreamers Den ECD', suburb: 'Ivory Park' },
    { name: 'Tembisa Learning Lanterns Centre', suburb: 'Tembisa' },
    { name: 'Rabie Ridge Green Steps Preschool', suburb: 'Rabie Ridge' },
    { name: 'Clayville KinderBloom Academy', suburb: 'Clayville' },
    { name: 'Alexandra Brightnest Early Learning', suburb: 'Alexandra' },
    { name: 'Marlboro Little Leaders Academy', suburb: 'Marlboro' },
    { name: 'Wynberg KinderQuest ECD', suburb: 'Wynberg' },
    { name: 'Bramley Joy Sprout Preschool', suburb: 'Bramley' },
    { name: 'Linbro Park Family Tree ECD Centre', suburb: 'Linbro Park' },
];
if (CENTRE_BLUEPRINTS.length !== 50) {
    throw new Error(`Expected 50 centre blueprints, received ${CENTRE_BLUEPRINTS.length}`);
}
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}
function jitterCoordinate(base) {
    return Number((base + randFloat(-0.005, 0.005)).toFixed(6));
}
function toSlug(value) {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function randomAgeGroups() {
    const start = randInt(0, AGE_GROUP_OPTIONS.length - 2);
    const end = randInt(start + 1, AGE_GROUP_OPTIONS.length - 1);
    return AGE_GROUP_OPTIONS.slice(start, end + 1);
}
function buildDescription(name, suburb) {
    return [
        `${name} is a community-focused early learning centre in ${suburb}.`,
        'Educators use play, stories, and structured activities to build language, numeracy, and social confidence.',
        'Families receive regular feedback and practical guidance to support learning at home.',
    ].join(' ');
}
function formatPhone(index) {
    const base = String(1000000 + index * 173).padStart(7, '0');
    return `+27 10 ${base.slice(0, 3)} ${base.slice(3)}`;
}
function buildCentres() {
    return CENTRE_BLUEPRINTS.map((centre, index) => {
        const meta = SUBURB_META[centre.suburb];
        if (!meta) {
            throw new Error(`Missing coordinate mapping for suburb: ${centre.suburb}`);
        }
        const monthlyFeeMin = randInt(16, 70) * 50;
        const monthlyFeeMax = monthlyFeeMin + randInt(300, 800);
        const slug = toSlug(centre.name);
        return {
            id: randomUUID(),
            name: centre.name,
            slug,
            tagline: TAGLINES[index % TAGLINES.length],
            suburb: centre.suburb,
            city: meta.city,
            province: 'Gauteng',
            is_active: true,
            is_registered: index % 4 !== 0,
            latitude: jitterCoordinate(meta.lat),
            longitude: jitterCoordinate(meta.lng),
            age_groups: randomAgeGroups(),
            monthly_fee_min: monthlyFeeMin,
            monthly_fee_max: monthlyFeeMax,
            fees_display_mode: 'range',
            subsidy_accepted: index % 5 !== 0,
            capacity: randInt(20, 80),
            description: buildDescription(centre.name, centre.suburb),
            email: `info@${slug}.co.za`,
            phone: formatPhone(index + 1),
            address: `${randInt(12, 240)} ${STREETS[index % STREETS.length]}`,
        };
    });
}
async function main() {
    var _a;
    const centres = buildCentres();
    console.log(`Upserting ${centres.length} Alexandra-area centres...`);
    const { data, error } = await supabase
        .from('ecd_centres')
        .upsert(centres, { onConflict: 'slug', ignoreDuplicates: true })
        .select('id');
    if (error) {
        console.error('Seed failed:', error.message);
        if (error.details)
            console.error('Details:', error.details);
        if (error.hint)
            console.error('Hint:', error.hint);
        process.exitCode = 1;
        return;
    }
    const insertedOrUpdated = (_a = data === null || data === void 0 ? void 0 : data.length) !== null && _a !== void 0 ? _a : 0;
    console.log(`Seed complete. Upserted ${insertedOrUpdated} centre records (input: ${centres.length}).`);
}
main().catch((error) => {
    console.error('Unexpected seed error:', error);
    process.exitCode = 1;
});
