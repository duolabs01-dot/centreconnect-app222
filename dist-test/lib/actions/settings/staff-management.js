'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteStaffAction = inviteStaffAction;
exports.removeStaffAction = removeStaffAction;
exports.changeStaffRoleAction = changeStaffRoleAction;
const zod_1 = require("zod");
const portal_session_1 = require("@/lib/ecd/portal-session");
const inviteStaffSchema = zod_1.z.object({
    ecdId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['ecd_staff', 'ecd_supervisor', 'ecd_admin']),
    name: zod_1.z.string().min(2),
});
const removeStaffSchema = zod_1.z.object({
    ecdId: zod_1.z.string().uuid(),
    staffUserId: zod_1.z.string().uuid(),
});
const changeRoleSchema = zod_1.z.object({
    ecdId: zod_1.z.string().uuid(),
    staffUserId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['ecd_staff', 'ecd_supervisor', 'ecd_admin']),
});
async function assertAdminAccess(ecdId) {
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    if (session.role !== 'ecd_admin' || session.ecdId !== ecdId)
        return null;
    return session;
}
async function inviteStaffAction(input) {
    const parsed = inviteStaffSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid data' };
    const session = await assertAdminAccess(parsed.data.ecdId);
    if (!session)
        return { error: 'Only centre admins can invite staff' };
    const ticketNumber = `STAFF-${Date.now().toString().slice(-8)}`;
    const description = [
        'Staff invite request',
        `Name: ${parsed.data.name}`,
        `Email: ${parsed.data.email}`,
        `Role requested: ${parsed.data.role}`,
        'Please process invitation and assignment.',
    ].join('\n');
    const { error } = await session.supabase.from('support_tickets').insert({
        ticket_number: ticketNumber,
        ecd_id: parsed.data.ecdId,
        created_by: session.user.id,
        subject: `Staff invitation request - ${parsed.data.email}`,
        description,
        category: 'application',
        priority: 2,
        status: 'open',
    });
    if (error)
        return { error: error.message };
    return { success: true, message: 'Invitation request submitted.' };
}
async function removeStaffAction(input) {
    const parsed = removeStaffSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid data' };
    const session = await assertAdminAccess(parsed.data.ecdId);
    if (!session)
        return { error: 'Unauthorized' };
    if (parsed.data.staffUserId === session.user.id)
        return { error: 'You cannot remove yourself.' };
    const ticketNumber = `STAFF-${Date.now().toString().slice(-8)}`;
    const { error } = await session.supabase.from('support_tickets').insert({
        ticket_number: ticketNumber,
        ecd_id: parsed.data.ecdId,
        created_by: session.user.id,
        subject: `Staff removal request - ${parsed.data.staffUserId}`,
        description: `Please remove user ${parsed.data.staffUserId} from this centre.`,
        category: 'application',
        priority: 3,
        status: 'open',
    });
    if (error)
        return { error: error.message };
    return { success: true };
}
async function changeStaffRoleAction(input) {
    const parsed = changeRoleSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid data' };
    const session = await assertAdminAccess(parsed.data.ecdId);
    if (!session)
        return { error: 'Unauthorized' };
    const ticketNumber = `STAFF-${Date.now().toString().slice(-8)}`;
    const { error } = await session.supabase.from('support_tickets').insert({
        ticket_number: ticketNumber,
        ecd_id: parsed.data.ecdId,
        created_by: session.user.id,
        subject: `Staff role change request - ${parsed.data.staffUserId}`,
        description: `Please set role to ${parsed.data.role} for user ${parsed.data.staffUserId}.`,
        category: 'application',
        priority: 2,
        status: 'open',
    });
    if (error)
        return { error: error.message };
    return { success: true };
}
