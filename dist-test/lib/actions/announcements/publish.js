'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishAnnouncementAction = publishAnnouncementAction;
const zod_1 = require("zod");
const cache_1 = require("next/cache");
const portal_session_1 = require("@/lib/ecd/portal-session");
const multi_channel_1 = require("@/lib/notifications/multi-channel");
const publishAnnouncementSchema = zod_1.z.object({
    ecdId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3),
    body: zod_1.z.string().min(10),
    audience: zod_1.z.enum(['all', 'class', 'individual']),
    template_type: zod_1.z.string().nullable().optional(),
    postToPublicPage: zod_1.z.boolean().default(true),
    sendNotifications: zod_1.z.boolean().default(true),
});
async function publishAnnouncementAction(input) {
    var _a, _b, _c, _d, _e;
    const parsed = publishAnnouncementSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid input' };
    try {
        const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
        if (session.ecdId !== parsed.data.ecdId)
            return { error: 'Unauthorized' };
        const { ecdId, title, body, audience, template_type, sendNotifications } = parsed.data;
        if (audience === 'individual' || audience === 'class') {
            return { error: 'Individual or class audience needs recipient targeting. Use Messages for targeted sends.' };
        }
        const { data: announcement, error: insertError } = await session.supabase
            .from('announcements')
            .insert({
            ecd_id: ecdId,
            title,
            content: body,
            body,
            audience,
            template_type: template_type !== null && template_type !== void 0 ? template_type : null,
            is_published: true,
            published_at: new Date().toISOString(),
            created_by: session.user.id,
            author_id: session.user.id,
        })
            .select('id')
            .single();
        if (insertError || !announcement) {
            return { error: (_a = insertError === null || insertError === void 0 ? void 0 : insertError.message) !== null && _a !== void 0 ? _a : 'Failed to create announcement' };
        }
        const { data: eligibleApps } = await session.supabase
            .from('applications')
            .select('parent_id')
            .eq('ecd_id', ecdId)
            .in('status', ['approved', 'enrolled']);
        const parentIds = Array.from(new Set((eligibleApps !== null && eligibleApps !== void 0 ? eligibleApps : []).map((row) => row.parent_id).filter(Boolean)));
        const { data: centre } = await session.supabase
            .from('ecd_centres')
            .select('slug,name,email')
            .eq('id', ecdId)
            .maybeSingle();
        const centreName = ((_b = centre === null || centre === void 0 ? void 0 : centre.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'your creche';
        if (sendNotifications && parentIds.length > 0) {
            const { data: parentContactsRaw } = await session.supabase
                .from('parents')
                .select('id,alt_phone,user_profiles(phone)')
                .in('id', parentIds);
            const parentPhoneById = new Map();
            for (const row of (parentContactsRaw !== null && parentContactsRaw !== void 0 ? parentContactsRaw : [])) {
                const profileRaw = row.user_profiles;
                const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
                parentPhoneById.set(row.id, (_d = (_c = profile === null || profile === void 0 ? void 0 : profile.phone) !== null && _c !== void 0 ? _c : row.alt_phone) !== null && _d !== void 0 ? _d : null);
            }
            const announcementMessage = body.length > 240 ? `${body.slice(0, 237)}...` : body;
            await Promise.all(parentIds.map((parentId) => {
                var _a;
                return (0, multi_channel_1.sendParentInAppAndWhatsappNotification)(session.supabase, {
                    parent_id: parentId,
                    ecd_id: ecdId,
                    application_id: null,
                    template_key: template_type !== null && template_type !== void 0 ? template_type : 'announcement',
                    title,
                    message: announcementMessage,
                    parent_phone: (_a = parentPhoneById.get(parentId)) !== null && _a !== void 0 ? _a : null,
                    is_read: false,
                });
            }));
            await (0, multi_channel_1.sendEcdInAppAndEmailNotification)(session.supabase, {
                ecd_id: ecdId,
                title: 'Announcement published',
                message: `"${title}" was published to ${parentIds.length} families.`,
                metadata: {
                    kind: 'announcement_published',
                    announcement_id: announcement.id,
                    recipient_count: parentIds.length,
                },
                email_recipient: (_e = centre === null || centre === void 0 ? void 0 : centre.email) !== null && _e !== void 0 ? _e : null,
                email_subject: `[CentreConnect] Announcement published: ${title}`,
                email_body: `<p>Your announcement <strong>${title}</strong> was published to ${parentIds.length} families at ${centreName}.</p>`,
                is_read: false,
            });
        }
        (0, cache_1.revalidatePath)('/ecd/announcements');
        (0, cache_1.revalidatePath)('/parent/notifications');
        if (centre === null || centre === void 0 ? void 0 : centre.slug) {
            (0, cache_1.revalidatePath)(`/centre/${centre.slug}`);
            (0, cache_1.revalidatePath)(`/c/${centre.slug}`);
        }
        return {
            success: true,
            announcementId: announcement.id,
            recipientCount: parentIds.length,
        };
    }
    catch (err) {
        console.error('publishAnnouncementAction failed:', err);
        return { error: 'An unexpected error occurred while publishing. Please try again.' };
    }
}
