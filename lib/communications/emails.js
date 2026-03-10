"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEmail = queueEmail;
// lib/communications/emails.ts
const admin_1 = require("@/lib/supabase/admin");
async function queueEmail(recipient, subject, body) {
    const supabaseAdmin = (0, admin_1.createAdminClient)();
    const { data, error } = await supabaseAdmin
        .from('email_queue')
        .insert({
        recipient,
        subject,
        body,
        status: 'pending',
    })
        .select();
    if (error) {
        console.error('Error queuing email:', error.message);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}
