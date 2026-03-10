"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueParentWelcomeSequence = enqueueParentWelcomeSequence;
require("server-only");
const WELCOME_TEMPLATE_KEYS = [
    'cc_welcome_intro',
    'cc_welcome_inbox_guide',
    'cc_welcome_legal',
    'cc_welcome_security',
];
const WELCOME_TEMPLATE_ROWS = [
    {
        template_key: 'cc_welcome_intro',
        title: 'Welcome to CentreConnect',
        body: 'Hi {{parent_name}}, welcome aboard. CentreConnect helps families discover centres, track applications, and stay in sync with daily updates in one place.',
    },
    {
        template_key: 'cc_welcome_inbox_guide',
        title: 'Your Notifications Live Here',
        body: 'Open the bell in your top bar anytime, or go to /parent/notifications for your full inbox.',
    },
    {
        template_key: 'cc_welcome_legal',
        title: 'Quick Legal and Terms Note',
        body: 'By using CentreConnect, you agree to our Terms, Privacy Policy, and POPIA security commitments. You can review these under /terms, /privacy, and /popia-security.',
    },
    {
        template_key: 'cc_welcome_security',
        title: 'Security, With Heart',
        body: 'We use secure sessions, strict role-based access, and verified pickup workflows to protect your family data and child safety records.',
    },
];
function firstName(value) {
    const full = String(value !== null && value !== void 0 ? value : '').trim();
    if (!full)
        return 'there';
    const token = full.split(/\s+/).find(Boolean);
    return token !== null && token !== void 0 ? token : 'there';
}
function hydrateBody(template, name) {
    return template.replaceAll('{{parent_name}}', name);
}
function mapRowsForParent(parentId, parentName, fallbackCentreId) {
    return WELCOME_TEMPLATE_ROWS.map((row) => ({
        parent_id: parentId,
        ecd_id: fallbackCentreId,
        template_key: row.template_key,
        title: row.title,
        message: hydrateBody(row.body, parentName),
        is_read: false,
    }));
}
async function getFallbackCentreId(db) {
    var _a;
    const { data, error } = await db
        .from('ecd_centres')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error) {
        return null;
    }
    return (_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : null;
}
function isNotNullEcdConstraint(errorMessage) {
    const message = String(errorMessage !== null && errorMessage !== void 0 ? errorMessage : '').toLowerCase();
    return message.includes('null value in column "ecd_id"') && message.includes('not-null constraint');
}
async function enqueueParentWelcomeSequence(db, args) {
    var _a, _b, _c;
    const parentId = args.parentId.trim();
    if (!parentId) {
        return { ok: false, inserted: 0, error: 'parentId is required.' };
    }
    const normalizedName = firstName(args.parentName);
    const { data: existingRows, error: existingError } = await db
        .from('parent_notifications')
        .select('id')
        .eq('parent_id', parentId)
        .in('template_key', [...WELCOME_TEMPLATE_KEYS])
        .limit(1);
    if (existingError) {
        return { ok: false, inserted: 0, error: existingError.message };
    }
    if ((existingRows !== null && existingRows !== void 0 ? existingRows : []).length > 0) {
        return { ok: true, inserted: 0, error: null };
    }
    const { error: templateError } = await db.from('communication_templates').upsert(WELCOME_TEMPLATE_ROWS.map((row) => ({
        template_key: row.template_key,
        title: row.title,
        body: row.body,
        is_active: true,
    })), { onConflict: 'template_key' });
    if (templateError) {
        return { ok: false, inserted: 0, error: templateError.message };
    }
    const primaryPayload = mapRowsForParent(parentId, normalizedName, null);
    const primaryInsert = await db.from('parent_notifications').insert(primaryPayload);
    if (!primaryInsert.error) {
        return { ok: true, inserted: primaryPayload.length, error: null };
    }
    if (!isNotNullEcdConstraint((_a = primaryInsert.error) === null || _a === void 0 ? void 0 : _a.message)) {
        return { ok: false, inserted: 0, error: (_c = (_b = primaryInsert.error) === null || _b === void 0 ? void 0 : _b.message) !== null && _c !== void 0 ? _c : 'Failed to enqueue welcome notifications.' };
    }
    const fallbackCentreId = await getFallbackCentreId(db);
    if (!fallbackCentreId) {
        return {
            ok: false,
            inserted: 0,
            error: 'parent_notifications requires ecd_id and no fallback centre is available.',
        };
    }
    const fallbackPayload = mapRowsForParent(parentId, normalizedName, fallbackCentreId);
    const fallbackInsert = await db.from('parent_notifications').insert(fallbackPayload);
    if (fallbackInsert.error) {
        return { ok: false, inserted: 0, error: fallbackInsert.error.message };
    }
    return { ok: true, inserted: fallbackPayload.length, error: null };
}
