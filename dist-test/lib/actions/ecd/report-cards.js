'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveReportCardAction = saveReportCardAction;
exports.publishReportCardAction = publishReportCardAction;
exports.deleteReportCardAction = deleteReportCardAction;
const cache_1 = require("next/cache");
const zod_1 = require("zod");
const portal_session_1 = require("@/lib/ecd/portal-session");
const dateValueSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(zod_1.z.literal('')).nullable();
const areaSchema = zod_1.z.object({
    area_name: zod_1.z.string().min(1).max(120),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(800).optional().or(zod_1.z.literal('')).nullable(),
    sort_order: zod_1.z.number().int().min(0).max(100).default(0),
});
const saveReportCardSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional().or(zod_1.z.literal('')).nullable(),
    child_id: zod_1.z.string().uuid(),
    term: zod_1.z.string().min(2).max(80),
    period_start: dateValueSchema,
    period_end: dateValueSchema,
    overall_comment: zod_1.z.string().max(2500).optional().or(zod_1.z.literal('')).nullable(),
    areas: zod_1.z.array(areaSchema).min(1).max(20),
});
const reportCardIdSchema = zod_1.z.string().uuid();
function normalizeDateInput(value) {
    if (!value)
        return null;
    const normalized = value.trim();
    return normalized || null;
}
function normalizeTextInput(value) {
    if (!value)
        return null;
    const normalized = value.trim();
    return normalized || null;
}
function isMissingReportCardsSchemaError(error) {
    var _a;
    if (!error)
        return false;
    const message = ((_a = error.message) !== null && _a !== void 0 ? _a : '').toLowerCase();
    return (error.code === '42P01' ||
        message.includes('relation "report_cards" does not exist') ||
        message.includes('relation "report_card_areas" does not exist'));
}
function formatReportCardError(error, fallback) {
    if (isMissingReportCardsSchemaError(error)) {
        return 'Report Cards is not enabled yet. Run Supabase migrations 048 and 049, then refresh.';
    }
    return (error === null || error === void 0 ? void 0 : error.message) || fallback;
}
async function saveReportCardAction(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    const parsed = saveReportCardSchema.safeParse(input);
    if (!parsed.success) {
        const firstIssue = (_b = (_a = parsed.error.issues[0]) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : 'Invalid report card input.';
        return { success: false, message: firstIssue };
    }
    const payload = parsed.data;
    const periodStart = normalizeDateInput(payload.period_start);
    const periodEnd = normalizeDateInput(payload.period_end);
    if (periodStart && periodEnd && periodStart > periodEnd) {
        return { success: false, message: 'Period end date must be on or after period start date.' };
    }
    const [directChildLink, legacyApplicationLink] = await Promise.all([
        session.supabase
            .from('children')
            .select('id')
            .eq('id', payload.child_id)
            .eq('ecd_id', session.ecdId)
            .maybeSingle(),
        session.supabase
            .from('applications')
            .select('id')
            .eq('child_id', payload.child_id)
            .eq('ecd_id', session.ecdId)
            .limit(1)
            .maybeSingle(),
    ]);
    if (directChildLink.error && legacyApplicationLink.error) {
        return {
            success: false,
            message: formatReportCardError((_c = directChildLink.error) !== null && _c !== void 0 ? _c : legacyApplicationLink.error, 'Unable to verify child membership for this centre.'),
        };
    }
    const hasChildLink = Boolean(((_d = directChildLink.data) === null || _d === void 0 ? void 0 : _d.id) || ((_e = legacyApplicationLink.data) === null || _e === void 0 ? void 0 : _e.id));
    if (!hasChildLink) {
        return { success: false, message: 'This child is not linked to your centre.' };
    }
    const { data: teacherProfile } = await session.supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();
    const teacherName = (_g = (_f = normalizeTextInput(teacherProfile === null || teacherProfile === void 0 ? void 0 : teacherProfile.full_name)) !== null && _f !== void 0 ? _f : session.user.email) !== null && _g !== void 0 ? _g : 'ECD Staff';
    const teacherIdForWrite = teacherProfile ? session.user.id : null;
    const normalizedTerm = payload.term.trim();
    const existingForTerm = await session.supabase
        .from('report_cards')
        .select('id,status')
        .eq('ecd_id', session.ecdId)
        .eq('child_id', payload.child_id)
        .eq('term', normalizedTerm)
        .maybeSingle();
    if (existingForTerm.error) {
        return { success: false, message: formatReportCardError(existingForTerm.error, 'Unable to check existing report cards.') };
    }
    const resolvedId = (_h = normalizeTextInput(payload.id)) !== null && _h !== void 0 ? _h : (((_j = existingForTerm.data) === null || _j === void 0 ? void 0 : _j.id) ? String(existingForTerm.data.id) : null);
    if (resolvedId) {
        const { data: updated, error: updateError } = await session.supabase
            .from('report_cards')
            .update({
            term: normalizedTerm,
            period_start: periodStart,
            period_end: periodEnd,
            overall_comment: normalizeTextInput(payload.overall_comment),
            teacher_id: teacherIdForWrite,
            teacher_name: teacherName,
            updated_at: new Date().toISOString(),
        })
            .eq('id', resolvedId)
            .eq('ecd_id', session.ecdId)
            .select('id')
            .maybeSingle();
        if (updateError || !(updated === null || updated === void 0 ? void 0 : updated.id)) {
            return { success: false, message: formatReportCardError(updateError, 'Unable to update report card.') };
        }
        const { error: deleteAreasError } = await session.supabase
            .from('report_card_areas')
            .delete()
            .eq('report_card_id', resolvedId);
        if (deleteAreasError) {
            return { success: false, message: formatReportCardError(deleteAreasError, 'Unable to refresh report card areas.') };
        }
        const { error: insertAreasError } = await session.supabase.from('report_card_areas').insert(payload.areas.map((area, index) => {
            var _a;
            return ({
                report_card_id: resolvedId,
                area_name: area.area_name.trim(),
                rating: area.rating,
                comment: normalizeTextInput(area.comment),
                sort_order: (_a = area.sort_order) !== null && _a !== void 0 ? _a : index,
            });
        }));
        if (insertAreasError) {
            return { success: false, message: formatReportCardError(insertAreasError, 'Unable to save report card areas.') };
        }
        (0, cache_1.revalidatePath)('/ecd/report-cards');
        (0, cache_1.revalidatePath)('/parent/report-cards');
        return { success: true, message: 'Report card saved.', reportCardId: resolvedId };
    }
    const { data: inserted, error: insertError } = await session.supabase
        .from('report_cards')
        .insert({
        ecd_id: session.ecdId,
        child_id: payload.child_id,
        term: normalizedTerm,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'draft',
        teacher_id: teacherIdForWrite,
        teacher_name: teacherName,
        overall_comment: normalizeTextInput(payload.overall_comment),
    })
        .select('id')
        .maybeSingle();
    if (insertError || !(inserted === null || inserted === void 0 ? void 0 : inserted.id)) {
        return { success: false, message: formatReportCardError(insertError, 'Unable to create report card.') };
    }
    const createdId = String(inserted.id);
    const { error: areaInsertError } = await session.supabase.from('report_card_areas').insert(payload.areas.map((area, index) => {
        var _a;
        return ({
            report_card_id: createdId,
            area_name: area.area_name.trim(),
            rating: area.rating,
            comment: normalizeTextInput(area.comment),
            sort_order: (_a = area.sort_order) !== null && _a !== void 0 ? _a : index,
        });
    }));
    if (areaInsertError) {
        return { success: false, message: formatReportCardError(areaInsertError, 'Unable to save report card areas.') };
    }
    (0, cache_1.revalidatePath)('/ecd/report-cards');
    (0, cache_1.revalidatePath)('/parent/report-cards');
    return { success: true, message: 'Report card saved as draft.', reportCardId: createdId };
}
async function publishReportCardAction(reportCardIdRaw) {
    const parsed = reportCardIdSchema.safeParse(reportCardIdRaw);
    if (!parsed.success) {
        return { success: false, message: 'Invalid report card identifier.' };
    }
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    const { data: updated, error } = await session.supabase
        .from('report_cards')
        .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .eq('id', parsed.data)
        .eq('ecd_id', session.ecdId)
        .select('id')
        .maybeSingle();
    if (error || !(updated === null || updated === void 0 ? void 0 : updated.id)) {
        return { success: false, message: formatReportCardError(error, 'Unable to publish report card.') };
    }
    (0, cache_1.revalidatePath)('/ecd/report-cards');
    (0, cache_1.revalidatePath)('/parent/report-cards');
    return { success: true, message: 'Report card published to parents.', reportCardId: String(updated.id) };
}
async function deleteReportCardAction(reportCardIdRaw) {
    const parsed = reportCardIdSchema.safeParse(reportCardIdRaw);
    if (!parsed.success) {
        return { success: false, message: 'Invalid report card identifier.' };
    }
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    const { data: existing, error: existingError } = await session.supabase
        .from('report_cards')
        .select('id,status')
        .eq('id', parsed.data)
        .eq('ecd_id', session.ecdId)
        .maybeSingle();
    if (existingError || !(existing === null || existing === void 0 ? void 0 : existing.id)) {
        return { success: false, message: formatReportCardError(existingError, 'Report card not found.') };
    }
    if (existing.status === 'published') {
        return { success: false, message: 'Published report cards cannot be deleted.' };
    }
    const { error: deleteError } = await session.supabase
        .from('report_cards')
        .delete()
        .eq('id', parsed.data)
        .eq('ecd_id', session.ecdId);
    if (deleteError) {
        return { success: false, message: formatReportCardError(deleteError, 'Unable to delete report card.') };
    }
    (0, cache_1.revalidatePath)('/ecd/report-cards');
    (0, cache_1.revalidatePath)('/parent/report-cards');
    return { success: true, message: 'Draft report card deleted.', reportCardId: parsed.data };
}
