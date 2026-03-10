'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = updateTicketStatus;
const admin_1 = require("@/lib/supabase/admin");
const platform_admin_1 = require("@/lib/auth/platform-admin");
const cache_1 = require("next/cache");
const zod_1 = require("zod");
const updateTicketStatusSchema = zod_1.z.object({
    ticketId: zod_1.z.string().uuid(),
    newStatus: zod_1.z.enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed']),
});
async function updateTicketStatus(ticketId, newStatus) {
    const parsed = updateTicketStatusSchema.safeParse({ ticketId, newStatus });
    if (!parsed.success) {
        return { success: false, error: 'Invalid ticket update request.' };
    }
    const platformAdmin = await (0, platform_admin_1.requirePlatformAdmin)();
    if (!platformAdmin) {
        return { success: false, error: 'Forbidden' };
    }
    const supabaseAdmin = (0, admin_1.createAdminClient)();
    const { data, error } = await supabaseAdmin
        .from('support_tickets')
        .update({ status: parsed.data.newStatus, updated_at: new Date().toISOString() })
        .eq('id', parsed.data.ticketId)
        .select();
    if (error) {
        console.error('Error updating ticket status:', error);
        return { success: false, error: error.message };
    }
    (0, cache_1.revalidatePath)('/admin/support'); // Revalidate the support page to show updated status
    return { success: true, data };
}
