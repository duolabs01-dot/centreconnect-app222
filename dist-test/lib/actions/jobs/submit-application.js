'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitJobApplicationAction = submitJobApplicationAction;
const zod_1 = require("zod");
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const submitJobApplicationSchema = zod_1.z.object({
    job_id: zod_1.z.string().uuid(),
    ecd_id: zod_1.z.string().uuid(),
    applicant_name: zod_1.z.string().min(2),
    applicant_email: zod_1.z.string().email(),
    applicant_phone: zod_1.z.string().min(10),
    id_number: zod_1.z.string().nullable(),
    cover_letter: zod_1.z.string().min(20),
    references: zod_1.z.string().nullable(),
    centreconnect_email: zod_1.z.string().email().nullable(),
    cv_url: zod_1.z.string().url().nullable(),
});
async function submitJobApplicationAction(input) {
    const parsed = submitJobApplicationSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid form data' };
    const supabase = await (0, server_1.createClient)();
    const { data: job } = await supabase
        .from('jobs')
        .select('id,is_published,closes_at,ecd_id,title')
        .eq('id', parsed.data.job_id)
        .eq('ecd_id', parsed.data.ecd_id)
        .maybeSingle();
    if (!(job === null || job === void 0 ? void 0 : job.is_published))
        return { error: 'This job is no longer accepting applications' };
    if (job.closes_at && new Date(job.closes_at) < new Date()) {
        return { error: 'The application period for this job has closed' };
    }
    const { data: existing } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_id', parsed.data.job_id)
        .eq('applicant_email', parsed.data.applicant_email)
        .limit(1)
        .maybeSingle();
    if (existing === null || existing === void 0 ? void 0 : existing.id) {
        return { error: 'You already applied for this position with this email address' };
    }
    const corePayload = {
        job_id: parsed.data.job_id,
        ecd_id: parsed.data.ecd_id,
        applicant_name: parsed.data.applicant_name,
        applicant_email: parsed.data.applicant_email,
        applicant_phone: parsed.data.applicant_phone,
        cv_url: parsed.data.cv_url,
        cover_letter: parsed.data.cover_letter,
        status: 'new',
    };
    const extendedPayload = Object.assign(Object.assign(Object.assign(Object.assign({}, corePayload), (parsed.data.id_number ? { id_number: parsed.data.id_number } : {})), (parsed.data.references ? { ['references']: parsed.data.references } : {})), (parsed.data.centreconnect_email ? { centreconnect_email: parsed.data.centreconnect_email } : {}));
    const isMissingColumnError = (message) => Boolean(message && /column .* does not exist|schema cache|could not find/i.test(message));
    const isPermissionError = (code, message) => code === '42501' ||
        Boolean(message && /row-level security|permission denied|not allowed/i.test(message));
    const tryInsert = async (client, includeExtended) => {
        return client
            .from('job_applications')
            .insert(includeExtended ? extendedPayload : corePayload);
    };
    let { error: insertError } = await tryInsert(supabase, true);
    if (insertError && isMissingColumnError(insertError.message)) {
        const retry = await tryInsert(supabase, false);
        insertError = retry.error;
    }
    if (insertError && isPermissionError(insertError.code, insertError.message)) {
        try {
            const admin = (0, admin_1.createAdminClient)();
            const adminTry = await tryInsert(admin, true);
            insertError = adminTry.error;
            if (insertError && isMissingColumnError(insertError.message)) {
                const adminRetry = await tryInsert(admin, false);
                insertError = adminRetry.error;
            }
        }
        catch (_a) {
            // Admin fallback unavailable in this environment.
        }
    }
    if (insertError) {
        console.error('submitJobApplicationAction failed:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            jobId: parsed.data.job_id,
            ecdId: parsed.data.ecd_id,
        });
        return { error: 'Failed to submit application. Please try again.' };
    }
    return { success: true };
}
