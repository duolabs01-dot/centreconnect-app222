'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPickupCode = verifyPickupCode;
const server_1 = require("@/lib/supabase/server");
const multi_channel_1 = require("@/lib/notifications/multi-channel");
async function verifyPickupCode(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const normalizedCode = input.code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
        return { success: false, error: 'invalid' };
    }
    const supabase = await (0, server_1.createClient)();
    const { data, error } = await supabase.rpc('verify_pickup_code_atomic', {
        p_ecd_id: input.ecdId,
        p_child_id: input.childId,
        p_code: normalizedCode,
    });
    if (error || !data) {
        return { success: false, error: 'invalid' };
    }
    const result = data;
    if (!result.success) {
        return { success: false, error: (_a = result.error) !== null && _a !== void 0 ? _a : 'invalid' };
    }
    const [{ data: child }, { data: centre }] = await Promise.all([
        supabase
            .from('children')
            .select('id,parent_id,first_name,last_name')
            .eq('id', input.childId)
            .eq('ecd_id', input.ecdId)
            .maybeSingle(),
        supabase.from('ecd_centres').select('name,email').eq('id', input.ecdId).maybeSingle(),
    ]);
    let whatsappHref = null;
    if (child === null || child === void 0 ? void 0 : child.parent_id) {
        const [{ data: parent }, { data: application }] = await Promise.all([
            supabase
                .from('parents')
                .select('id,alt_phone,user_profiles(phone)')
                .eq('id', child.parent_id)
                .maybeSingle(),
            supabase
                .from('applications')
                .select('id')
                .eq('ecd_id', input.ecdId)
                .eq('child_id', input.childId)
                .in('status', ['approved', 'enrolled', 'waitlisted'])
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);
        const parentProfileRaw = parent === null || parent === void 0 ? void 0 : parent.user_profiles;
        const parentProfile = Array.isArray(parentProfileRaw) ? parentProfileRaw[0] : parentProfileRaw;
        const parentPhone = (_c = (_b = parentProfile === null || parentProfile === void 0 ? void 0 : parentProfile.phone) !== null && _b !== void 0 ? _b : parent === null || parent === void 0 ? void 0 : parent.alt_phone) !== null && _c !== void 0 ? _c : null;
        const childName = `${(_d = child.first_name) !== null && _d !== void 0 ? _d : 'Child'} ${(_e = child.last_name) !== null && _e !== void 0 ? _e : ''}`.trim();
        const guardianName = (_f = result.guardianName) !== null && _f !== void 0 ? _f : 'an authorised guardian';
        const parentNotification = await (0, multi_channel_1.sendParentInAppAndWhatsappNotification)(supabase, {
            parent_id: child.parent_id,
            ecd_id: input.ecdId,
            application_id: (_g = application === null || application === void 0 ? void 0 : application.id) !== null && _g !== void 0 ? _g : null,
            template_key: 'pickup_verified',
            title: `${childName} pickup verified`,
            message: `${childName} was released to ${guardianName}. Pickup has been verified by your centre team.`,
            parent_phone: parentPhone,
            whatsapp_event_type: 'pickup_verified',
            whatsapp_event_key: `pickup_verified:${input.ecdId}:${input.childId}:${Date.now()}`,
            whatsapp_metadata: {
                child_name: childName,
                guardian_name: guardianName,
            },
            is_read: false,
        });
        whatsappHref = (_h = parentNotification.whatsappHref) !== null && _h !== void 0 ? _h : null;
        await (0, multi_channel_1.sendEcdInAppAndEmailNotification)(supabase, {
            ecd_id: input.ecdId,
            application_id: (_j = application === null || application === void 0 ? void 0 : application.id) !== null && _j !== void 0 ? _j : null,
            title: 'Pickup verified',
            message: `${childName} pickup was verified for ${guardianName}.`,
            metadata: {
                kind: 'pickup_verified',
                child_id: input.childId,
            },
            email_recipient: (_k = centre === null || centre === void 0 ? void 0 : centre.email) !== null && _k !== void 0 ? _k : null,
            email_subject: `[CentreConnect] Pickup verified for ${childName}`,
            email_body: `<p>Pickup was verified for <strong>${childName}</strong>.</p><p>Guardian: ${guardianName}.</p>`,
            is_read: false,
        });
    }
    return {
        success: true,
        childName: (_l = result.childName) !== null && _l !== void 0 ? _l : 'Child',
        guardianName: (_m = result.guardianName) !== null && _m !== void 0 ? _m : null,
        childPhotoUrl: (_o = result.childPhotoUrl) !== null && _o !== void 0 ? _o : null,
        whatsappHref,
    };
}
