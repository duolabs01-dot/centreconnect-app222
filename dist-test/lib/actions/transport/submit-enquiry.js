'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitTransportEnquiryAction = submitTransportEnquiryAction;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
const cache_1 = require("next/cache");
const zod_1 = require("zod");
const env_1 = require("@/lib/supabase/env");
const schema = zod_1.z.object({
    ecd_id: zod_1.z.string().uuid(),
    pickup_address: zod_1.z.string().min(5),
    notes: zod_1.z.string().optional(),
    child_id: zod_1.z.string().uuid().optional(),
});
async function submitTransportEnquiryAction(input) {
    var _a, _b;
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        return { error: 'Invalid input' };
    }
    const { supabaseUrl, supabaseAnonKey } = (0, env_1.requireSupabasePublicEnv)('submit-transport-enquiry-action');
    const supabase = (0, ssr_1.createServerClient)(supabaseUrl, supabaseAnonKey, { cookies: { getAll: () => (0, headers_1.cookies)().getAll() } });
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Please log in to request a transport quote' };
    }
    const { data: enquiry, error } = await supabase
        .from('transport_enquiries')
        .insert({
        ecd_id: parsed.data.ecd_id,
        parent_id: user.id,
        child_id: (_a = parsed.data.child_id) !== null && _a !== void 0 ? _a : null,
        pickup_address: parsed.data.pickup_address,
        notes: (_b = parsed.data.notes) !== null && _b !== void 0 ? _b : null,
        status: 'pending',
    })
        .select('id')
        .single();
    if (error || !enquiry) {
        return { error: 'Failed to submit enquiry. Please try again.' };
    }
    const { data: admins } = await supabase
        .from('ecd_admins')
        .select('user_id')
        .eq('ecd_id', parsed.data.ecd_id);
    const adminIds = Array.from(new Set((admins !== null && admins !== void 0 ? admins : []).map((row) => row.user_id).filter(Boolean)));
    if (adminIds.length) {
        await supabase.from('notifications').insert(adminIds.map((adminId) => ({
            user_id: adminId,
            ecd_id: parsed.data.ecd_id,
            type: 'transport_enquiry',
            title: 'New Transport Enquiry',
            body: `Pickup address: ${parsed.data.pickup_address}`,
            data: { enquiry_id: enquiry.id },
        })));
        const participantIds = Array.from(new Set([user.id, ...adminIds]));
        const { data: thread } = await supabase
            .from('message_threads')
            .insert({
            ecd_id: parsed.data.ecd_id,
            context_type: 'general',
            context_id: enquiry.id,
            participant_ids: participantIds,
        })
            .select('id')
            .single();
        if (thread) {
            await supabase.from('messages').insert({
                thread_id: thread.id,
                sender_id: user.id,
                body: [
                    'Transport Quote Request',
                    '',
                    `Pickup address: ${parsed.data.pickup_address}`,
                    parsed.data.notes ? `Notes: ${parsed.data.notes}` : '',
                ]
                    .filter(Boolean)
                    .join('\n'),
            });
        }
    }
    (0, cache_1.revalidatePath)('/dashboard/communications');
    return { success: true, enquiryId: enquiry.id };
}
