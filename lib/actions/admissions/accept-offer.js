'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptOffer = acceptOffer;
const server_1 = require("@/lib/supabase/server");
const multi_channel_1 = require("@/lib/notifications/multi-channel");
async function acceptOffer(applicationId) {
    var _a, _b, _c, _d, _e, _f, _g;
    const supabase = await (0, server_1.createClient)();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }
    const { data: application, error: fetchError } = await supabase
        .from('applications')
        .select('id,parent_id,status')
        .eq('id', applicationId)
        .eq('parent_id', user.id)
        .maybeSingle();
    if (fetchError || !application) {
        return { success: false, error: 'Application not found' };
    }
    if (application.status !== 'approved') {
        return { success: false, error: 'Offer is not available for acceptance' };
    }
    const { error: rpcError } = await supabase.rpc('accept_offer_atomic', {
        p_application_id: applicationId,
    });
    if (rpcError) {
        return { success: false, error: rpcError.message };
    }
    const { data: refreshed } = await supabase
        .from('applications')
        .select('id,parent_id,ecd_id,application_number,children(first_name,last_name),parents(id,alt_phone,user_profiles(full_name,phone)),ecd_centres(name,email)')
        .eq('id', applicationId)
        .eq('parent_id', user.id)
        .maybeSingle();
    if (refreshed) {
        const childRaw = refreshed.children;
        const child = Array.isArray(childRaw) ? childRaw[0] : childRaw;
        const parentRaw = refreshed.parents;
        const parent = Array.isArray(parentRaw) ? parentRaw[0] : parentRaw;
        const parentProfileRaw = parent === null || parent === void 0 ? void 0 : parent.user_profiles;
        const parentProfile = Array.isArray(parentProfileRaw) ? parentProfileRaw[0] : parentProfileRaw;
        const centreRaw = refreshed.ecd_centres;
        const centre = Array.isArray(centreRaw) ? centreRaw[0] : centreRaw;
        const childName = `${(_a = child === null || child === void 0 ? void 0 : child.first_name) !== null && _a !== void 0 ? _a : 'Child'} ${(_b = child === null || child === void 0 ? void 0 : child.last_name) !== null && _b !== void 0 ? _b : ''}`.trim();
        const parentPhone = (_d = (_c = parentProfile === null || parentProfile === void 0 ? void 0 : parentProfile.phone) !== null && _c !== void 0 ? _c : parent === null || parent === void 0 ? void 0 : parent.alt_phone) !== null && _d !== void 0 ? _d : null;
        const centreName = (_e = centre === null || centre === void 0 ? void 0 : centre.name) !== null && _e !== void 0 ? _e : 'your creche';
        await (0, multi_channel_1.sendParentInAppAndWhatsappNotification)(supabase, {
            parent_id: user.id,
            ecd_id: refreshed.ecd_id,
            application_id: applicationId,
            template_key: 'offer_acceptance',
            title: 'Enrollment confirmed',
            message: `You accepted ${childName}'s offer from ${centreName}. Enrollment is now confirmed.`,
            parent_phone: parentPhone,
            recipient_name: (_f = parentProfile === null || parentProfile === void 0 ? void 0 : parentProfile.full_name) !== null && _f !== void 0 ? _f : 'Parent',
            whatsapp_event_type: 'offer_acceptance',
            whatsapp_event_key: `offer_acceptance:${applicationId}:${user.id}`,
            whatsapp_metadata: {
                child_name: childName,
                centre_name: centreName,
            },
            is_read: false,
        });
        await (0, multi_channel_1.sendEcdInAppAndEmailNotification)(supabase, {
            ecd_id: refreshed.ecd_id,
            application_id: applicationId,
            title: 'Offer accepted',
            message: `A parent accepted the offer for ${childName}.`,
            metadata: {
                kind: 'offer_accepted',
                application_id: applicationId,
                child_name: childName,
            },
            email_recipient: (_g = centre === null || centre === void 0 ? void 0 : centre.email) !== null && _g !== void 0 ? _g : null,
            email_subject: `[CentreConnect] Offer accepted for ${childName}`,
            email_body: `<p>A parent accepted the offer for <strong>${childName}</strong>.</p><p>Open Admissions to continue onboarding.</p>`,
        });
    }
    return { success: true };
}
