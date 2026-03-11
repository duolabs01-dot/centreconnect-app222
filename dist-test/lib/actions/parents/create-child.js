'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChildSchema = void 0;
exports.createChildAction = createChildAction;
const zod_1 = require("zod");
const server_1 = require("@/lib/supabase/server");
const childSchema = zod_1.z.object({
    first_name: zod_1.z.string().min(1),
    last_name: zod_1.z.string().min(1),
    date_of_birth: zod_1.z.string().min(1),
    gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
});
exports.createChildSchema = childSchema;
async function createChildAction(input) {
    var _a;
    const parsed = childSchema.safeParse(input);
    if (!parsed.success) {
        return { error: 'Please provide valid child information.' };
    }
    const supabase = await (0, server_1.createClient)();
    const { data: { user }, error: userError, } = await supabase.auth.getUser();
    if (userError || !user) {
        return { error: 'Please sign in again before adding a child.' };
    }
    const { error, data } = await supabase
        .from('children')
        .insert(Object.assign(Object.assign({ parent_id: user.id }, parsed.data), { gender: (_a = parsed.data.gender) !== null && _a !== void 0 ? _a : null }))
        .select('id,first_name,last_name,date_of_birth,gender')
        .single();
    if (error || !data) {
        return { error: (error === null || error === void 0 ? void 0 : error.message) || 'Failed to add child.' };
    }
    return { success: true, child: data };
}
