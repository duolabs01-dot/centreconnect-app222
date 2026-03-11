'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestCancellationAction = requestCancellationAction;
const zod_1 = require("zod");
const portal_session_1 = require("@/lib/ecd/portal-session");
const requestCancellationSchema = zod_1.z.object({
    ecdId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().min(10),
    confirmation: zod_1.z.literal('CANCEL'),
});
async function requestCancellationAction(input) {
    const parsed = requestCancellationSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid input', fields: parsed.error.flatten().fieldErrors };
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    if (session.role !== 'ecd_admin' || session.ecdId !== parsed.data.ecdId)
        return { error: 'Unauthorized' };
    const { data: existing } = await session.supabase
        .from('support_tickets')
        .select('id')
        .eq('ecd_id', parsed.data.ecdId)
        .eq('category', 'billing')
        .eq('status', 'open')
        .ilike('subject', 'Subscription cancellation request%')
        .limit(1)
        .maybeSingle();
    if (existing === null || existing === void 0 ? void 0 : existing.id) {
        return { error: 'A cancellation request is already open. Support will contact you.' };
    }
    const ticketNumber = `BILL-${Date.now().toString().slice(-8)}`;
    const { error } = await session.supabase.from('support_tickets').insert({
        ticket_number: ticketNumber,
        ecd_id: parsed.data.ecdId,
        created_by: session.user.id,
        subject: 'Subscription cancellation request',
        description: parsed.data.reason,
        category: 'billing',
        priority: 3,
        status: 'open',
    });
    if (error)
        return { error: error.message };
    return { success: true };
}
