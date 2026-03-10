'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGuardianAction = addGuardianAction;
const zod_1 = require("zod");
const server_1 = require("@/lib/supabase/server");
const schema = zod_1.z.object({
    child_ids: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    full_name: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(10),
    email: zod_1.z.string().email().nullable(),
    relationship: zod_1.z.string().min(2),
    import_source: zod_1.z.enum(['manual', 'device_contacts', 'whatsapp']),
    can_pickup: zod_1.z.boolean(),
    can_view_applications: zod_1.z.boolean(),
    can_receive_announcements: zod_1.z.boolean(),
    can_generate_pickup_code: zod_1.z.boolean(),
});
function normalizePhone(value) {
    const digits = value.replace(/[^\d+]/g, '');
    return digits.trim();
}
async function addGuardianAction(input) {
    var _a;
    const parsed = schema.safeParse((() => {
        const raw = (input !== null && input !== void 0 ? input : {});
        const childIds = Array.isArray(raw.child_ids)
            ? raw.child_ids
            : typeof raw.child_id === 'string'
                ? [raw.child_id]
                : [];
        return Object.assign(Object.assign({}, raw), { child_ids: childIds });
    })());
    if (!parsed.success)
        return { error: 'Invalid data' };
    const supabase = await (0, server_1.createClient)();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user)
        return { error: 'Unauthorized' };
    const childIds = Array.from(new Set(parsed.data.child_ids));
    const { data: children } = await supabase
        .from('children')
        .select('id')
        .in('id', childIds)
        .eq('parent_id', user.id)
        .limit(childIds.length);
    if (!children || children.length !== childIds.length) {
        return { error: 'One or more selected children could not be found.' };
    }
    const phone = normalizePhone(parsed.data.phone);
    const { data: existing } = await supabase
        .from('guardians')
        .select('id,child_id')
        .in('child_id', childIds)
        .eq('phone', phone);
    const existingByChild = new Set((existing !== null && existing !== void 0 ? existing : []).map((row) => row.child_id));
    const newChildIds = childIds.filter((id) => !existingByChild.has(id));
    if (newChildIds.length === 0) {
        return { error: 'This co-parent is already linked to the selected children.' };
    }
    const rows = newChildIds.map((childId) => {
        var _a;
        return ({
            parent_id: user.id,
            child_id: childId,
            full_name: parsed.data.full_name.trim(),
            relationship: parsed.data.relationship.trim(),
            phone,
            email: ((_a = parsed.data.email) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            import_source: parsed.data.import_source,
            can_pickup: parsed.data.can_pickup,
            can_view_applications: parsed.data.can_view_applications,
            can_receive_announcements: parsed.data.can_receive_announcements,
            can_generate_pickup_code: parsed.data.can_generate_pickup_code,
            created_at: new Date().toISOString(),
        });
    });
    const { data: insertedRows, error } = await supabase
        .from('guardians')
        .insert(rows)
        .select('id,child_id');
    if (error) {
        return { error: error.message };
    }
    return {
        success: true,
        createdCount: (_a = insertedRows === null || insertedRows === void 0 ? void 0 : insertedRows.length) !== null && _a !== void 0 ? _a : rows.length,
        guardians: insertedRows !== null && insertedRows !== void 0 ? insertedRows : [],
    };
}
