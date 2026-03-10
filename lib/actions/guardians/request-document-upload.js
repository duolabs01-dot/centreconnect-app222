'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestCoParentDocumentUploadAction = requestCoParentDocumentUploadAction;
const cache_1 = require("next/cache");
const zod_1 = require("zod");
const application_documents_1 = require("@/lib/admissions/application-documents");
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const multi_channel_1 = require("@/lib/notifications/multi-channel");
const requestDocumentUploadSchema = zod_1.z.object({
    childId: zod_1.z.string().uuid(),
    requestedForUserId: zod_1.z.string().uuid(),
    documentCodes: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    customMessage: zod_1.z.string().max(1000).optional().nullable(),
});
function normalizeText(value) {
    const trimmed = String(value !== null && value !== void 0 ? value : '').trim();
    return trimmed.length > 0 ? trimmed : null;
}
async function requestCoParentDocumentUploadAction(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const parsed = requestDocumentUploadSchema.safeParse(input);
    if (!parsed.success)
        return { ok: false, error: 'Invalid document request payload.' };
    const supabase = await (0, server_1.createClient)();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user)
        return { ok: false, error: 'Please sign in again.' };
    const payload = parsed.data;
    if (payload.requestedForUserId === user.id) {
        return { ok: false, error: 'Select another linked parent.' };
    }
    const admin = (0, admin_1.createAdminClient)();
    const { data: childRaw } = await admin
        .from('children')
        .select('id,parent_id,ecd_id,first_name,last_name')
        .eq('id', payload.childId)
        .maybeSingle();
    const child = (_a = childRaw) !== null && _a !== void 0 ? _a : null;
    if (!child)
        return { ok: false, error: 'Child profile not found.' };
    const { data: guardianRowsRaw } = await admin
        .from('guardians')
        .select('id,parent_id,linked_user_id,full_name,phone')
        .eq('child_id', child.id)
        .eq('parent_id', child.parent_id);
    const guardianRows = (guardianRowsRaw !== null && guardianRowsRaw !== void 0 ? guardianRowsRaw : []);
    const linkedUserIds = guardianRows
        .map((guardian) => guardian.linked_user_id)
        .filter((value) => Boolean(value));
    const linkedUsers = new Set([child.parent_id, ...linkedUserIds]);
    if (!linkedUsers.has(user.id)) {
        return { ok: false, error: 'You are not linked to this child profile.' };
    }
    if (!linkedUsers.has(payload.requestedForUserId)) {
        return { ok: false, error: 'The selected parent is not linked to this child profile.' };
    }
    const { data: applicationRaw } = await admin
        .from('applications')
        .select('id,ecd_id')
        .eq('child_id', child.id)
        .in('status', ['partial', 'draft', 'submitted', 'in_review', 'approved', 'enrolled', 'waitlisted'])
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    const ecdId = (_c = (_b = child.ecd_id) !== null && _b !== void 0 ? _b : applicationRaw === null || applicationRaw === void 0 ? void 0 : applicationRaw.ecd_id) !== null && _c !== void 0 ? _c : null;
    if (!ecdId) {
        return {
            ok: false,
            error: 'This child is not linked to a creche yet. Submit an application first, then request documents.',
        };
    }
    const applicationId = (_d = applicationRaw === null || applicationRaw === void 0 ? void 0 : applicationRaw.id) !== null && _d !== void 0 ? _d : null;
    const profileIds = Array.from(linkedUsers);
    const { data: profilesRaw } = await admin
        .from('user_profiles')
        .select('id,full_name,phone')
        .in('id', profileIds);
    const profiles = (profilesRaw !== null && profilesRaw !== void 0 ? profilesRaw : []);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const byGuardian = (_e = guardianRows.find((guardian) => guardian.linked_user_id === user.id)) !== null && _e !== void 0 ? _e : null;
    const forGuardian = (_f = guardianRows.find((guardian) => guardian.linked_user_id === payload.requestedForUserId)) !== null && _f !== void 0 ? _f : null;
    const normalizedCodes = Array.from(new Set(payload.documentCodes.map((code) => String(code).trim()).filter(Boolean)));
    if (normalizedCodes.length === 0)
        return { ok: false, error: 'Select at least one document.' };
    const childName = [child.first_name, child.last_name].filter(Boolean).join(' ').trim() || 'the child';
    const requesterLabel = normalizeText((_g = profileById.get(user.id)) === null || _g === void 0 ? void 0 : _g.full_name) ||
        normalizeText(byGuardian === null || byGuardian === void 0 ? void 0 : byGuardian.full_name) ||
        'Linked parent';
    const recipientLabel = normalizeText((_h = profileById.get(payload.requestedForUserId)) === null || _h === void 0 ? void 0 : _h.full_name) ||
        normalizeText(forGuardian === null || forGuardian === void 0 ? void 0 : forGuardian.full_name) ||
        'Linked parent';
    const requestedLabels = (0, application_documents_1.toApplicationDocumentLabels)(normalizedCodes);
    const defaultMessage = `Hi ${recipientLabel}, ${requesterLabel} asked for ${requestedLabels.join(', ')} for ${childName}.`;
    const message = normalizeText(payload.customMessage) || defaultMessage;
    const { error: insertError } = await admin.from('child_document_requests').insert({
        ecd_id: ecdId,
        application_id: applicationId,
        child_id: child.id,
        requested_by_user_id: user.id,
        requested_for_user_id: payload.requestedForUserId,
        requested_by_guardian_id: (_j = byGuardian === null || byGuardian === void 0 ? void 0 : byGuardian.id) !== null && _j !== void 0 ? _j : null,
        requested_for_guardian_id: (_k = forGuardian === null || forGuardian === void 0 ? void 0 : forGuardian.id) !== null && _k !== void 0 ? _k : null,
        requested_by_label: requesterLabel,
        requested_for_label: recipientLabel,
        document_codes: normalizedCodes,
        message,
        status: 'requested',
    });
    if (insertError) {
        return { ok: false, error: insertError.message || 'Could not save this document request.' };
    }
    const { data: centre } = await admin
        .from('ecd_centres')
        .select('name,email')
        .eq('id', ecdId)
        .maybeSingle();
    const centreName = ((_l = centre === null || centre === void 0 ? void 0 : centre.name) === null || _l === void 0 ? void 0 : _l.trim()) || 'your creche';
    const notificationMessage = `${message}\n\nFrom ${centreName}. Open your profile documents to upload now.`;
    const recipientPhone = normalizeText((_m = profileById.get(payload.requestedForUserId)) === null || _m === void 0 ? void 0 : _m.phone) || normalizeText(forGuardian === null || forGuardian === void 0 ? void 0 : forGuardian.phone);
    const whatsappEventKey = `document_request_from_coparent:${applicationId !== null && applicationId !== void 0 ? applicationId : child.id}:${user.id}:${payload.requestedForUserId}:${Date.now()}`;
    const parentNotification = await (0, multi_channel_1.sendParentInAppAndWhatsappNotification)(admin, {
        parent_id: payload.requestedForUserId,
        ecd_id: ecdId,
        application_id: applicationId,
        template_key: 'document_request',
        title: `Document request for ${childName}`,
        message: notificationMessage,
        parent_phone: recipientPhone,
        recipient_name: recipientLabel,
        whatsapp_event_type: 'document_request_from_coparent',
        whatsapp_event_key: whatsappEventKey,
        whatsapp_metadata: {
            requested_by_user_id: user.id,
            requested_for_user_id: payload.requestedForUserId,
            child_name: childName,
            document_codes: normalizedCodes,
        },
        is_read: false,
    });
    if (!parentNotification.ok) {
        return { ok: false, error: parentNotification.error || 'Request saved, but notification failed.' };
    }
    await (0, multi_channel_1.sendParentInAppAndWhatsappNotification)(admin, {
        parent_id: user.id,
        ecd_id: ecdId,
        application_id: applicationId,
        template_key: 'document_request',
        title: `Document request sent to ${recipientLabel}`,
        message: `You asked ${recipientLabel} to upload: ${requestedLabels.join(', ')} for ${childName}.`,
        parent_phone: normalizeText((_o = profileById.get(user.id)) === null || _o === void 0 ? void 0 : _o.phone),
        is_read: false,
    });
    await (0, multi_channel_1.sendEcdInAppAndEmailNotification)(admin, {
        ecd_id: ecdId,
        application_id: applicationId,
        title: 'Co-parent document request',
        message: `${requesterLabel} requested documents from ${recipientLabel} for ${childName}.`,
        metadata: {
            kind: 'co_parent_document_request',
            child_id: child.id,
            requested_by_user_id: user.id,
            requested_for_user_id: payload.requestedForUserId,
            document_codes: normalizedCodes,
        },
        email_recipient: (_p = centre === null || centre === void 0 ? void 0 : centre.email) !== null && _p !== void 0 ? _p : null,
        email_subject: `[CentreConnect] Document request for ${childName}`,
        email_body: `<p>${requesterLabel} requested documents from ${recipientLabel} for <strong>${childName}</strong>.</p><p>Open applications to monitor upload progress.</p>`,
        is_read: false,
    });
    (0, cache_1.revalidatePath)('/parent/profile/guardians');
    (0, cache_1.revalidatePath)('/parent/profile/documents');
    return {
        ok: true,
        message: `Request sent to ${recipientLabel}.`,
        whatsappHref: (_q = parentNotification.whatsappHref) !== null && _q !== void 0 ? _q : undefined,
    };
}
