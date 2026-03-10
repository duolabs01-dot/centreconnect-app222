'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateParentPreferencesAction = updateParentPreferencesAction;
const server_1 = require("@/lib/supabase/server");
const zod_1 = require("zod");
const events_1 = require("@/lib/security/events");
const preferencesSchema = zod_1.z.object({
    max_monthly_budget: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .optional()
        .transform((value) => {
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return value !== null && value !== void 0 ? value : null;
    }),
    preferred_radius_km: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .optional()
        .transform((value) => {
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return value !== null && value !== void 0 ? value : null;
    }),
    preferred_suburbs: zod_1.z.string().trim().optional(),
    transport_needed: zod_1.z.boolean().optional(),
    preferred_start_month: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
async function logPreferencesSubmitFailure(input) {
    var _a, _b, _c, _d, _e;
    try {
        const supabase = (_a = input.supabase) !== null && _a !== void 0 ? _a : (await (0, server_1.createClient)());
        const parentId = (_d = (_b = input.parentId) !== null && _b !== void 0 ? _b : (_c = (await supabase.auth.getUser()).data.user) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
        if (!parentId)
            return;
        await supabase.from('parent_form_submit_failures').insert({
            parent_id: parentId,
            route_path: '/parent/preferences',
            form_name: 'preferences_update',
            failure_type: input.failureType,
            source: 'server',
            error_message: input.message,
            context: (_e = input.context) !== null && _e !== void 0 ? _e : {},
        });
    }
    catch (_f) {
        // Telemetry must never block the parent flow.
    }
}
async function updateParentPreferencesAction(input) {
    var _a, _b, _c, _d, _e, _f;
    const parsed = preferencesSchema.safeParse(input);
    if (!parsed.success) {
        await logPreferencesSubmitFailure({
            failureType: 'validation_failed',
            message: 'Invalid preference values',
            context: {
                issue_count: parsed.error.issues.length,
            },
        });
        return { error: 'Invalid preference values' };
    }
    const supabase = await (0, server_1.createClient)();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Please log in to update preferences' };
    }
    const suburbs = (_b = (_a = parsed.data.preferred_suburbs) === null || _a === void 0 ? void 0 : _a.split(',').map((value) => value.trim()).filter(Boolean)) !== null && _b !== void 0 ? _b : null;
    const { error } = await supabase.from('parents').upsert({
        id: user.id,
        max_monthly_budget: (_c = parsed.data.max_monthly_budget) !== null && _c !== void 0 ? _c : null,
        preferred_radius_km: (_d = parsed.data.preferred_radius_km) !== null && _d !== void 0 ? _d : null,
        preferred_suburbs: suburbs,
        transport_needed: (_e = parsed.data.transport_needed) !== null && _e !== void 0 ? _e : false,
        preferred_start_month: (_f = parsed.data.preferred_start_month) !== null && _f !== void 0 ? _f : null,
    }, { onConflict: 'id' });
    if (error) {
        await logPreferencesSubmitFailure({
            supabase,
            parentId: user.id,
            failureType: 'submit_failed',
            message: error.message || 'Failed to update preferences',
        });
        return { error: error.message };
    }
    await (0, events_1.logSecurityEvent)(user.id, 'preferences_update', 'Parent updated discovery and budget preferences.');
    return { success: true };
}
