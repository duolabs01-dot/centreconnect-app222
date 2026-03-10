'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotificationPreferencesAction = updateNotificationPreferencesAction;
const zod_1 = require("zod");
const portal_session_1 = require("@/lib/ecd/portal-session");
const updateNotificationPreferencesSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email_announcements: zod_1.z.boolean(),
    email_applications: zod_1.z.boolean(),
    email_job_applications: zod_1.z.boolean(),
    push_announcements: zod_1.z.boolean(),
    push_applications: zod_1.z.boolean(),
    push_pickup: zod_1.z.boolean(),
    digest_frequency: zod_1.z.enum(['realtime', 'daily', 'weekly', 'off']),
});
async function updateNotificationPreferencesAction(input) {
    const parsed = updateNotificationPreferencesSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid data' };
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    if (session.user.id !== parsed.data.userId)
        return { error: 'Unauthorized' };
    const { error } = await session.supabase.from('notification_preferences').upsert({
        user_id: parsed.data.userId,
        email_announcements: parsed.data.email_announcements,
        email_applications: parsed.data.email_applications,
        email_job_applications: parsed.data.email_job_applications,
        push_announcements: parsed.data.push_announcements,
        push_applications: parsed.data.push_applications,
        push_pickup: parsed.data.push_pickup,
        digest_frequency: parsed.data.digest_frequency,
        updated_at: new Date().toISOString(),
    });
    if (error)
        return { error: error.message };
    return { success: true };
}
