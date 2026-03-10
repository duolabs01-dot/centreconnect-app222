'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePickupCode = generatePickupCode;
const server_1 = require("@/lib/supabase/server");
function randomSixDigitCode() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return String(bytes[0] % 1000000).padStart(6, '0');
}
async function generatePickupCode(input) {
    const supabase = await (0, server_1.createClient)();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { success: false, error: 'Not authenticated' };
    if (input.generatedByRole !== 'centre') {
        return { success: false, error: 'Pickup code generation is centre-managed only' };
    }
    const code = randomSixDigitCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.rpc('generate_pickup_code_atomic', {
        p_ecd_id: input.ecdId,
        p_child_id: input.childId,
        p_parent_id: input.parentId,
        p_generated_by_role: input.generatedByRole,
        p_code: code,
        p_expires_at: expiresAt,
    });
    if (error || !data || data.success !== true) {
        const message = (data && typeof data.error === 'string' && data.error) ||
            (error === null || error === void 0 ? void 0 : error.message) ||
            'Failed to generate pickup code';
        return { success: false, error: message };
    }
    return { success: true, code };
}
