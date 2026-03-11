'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitApplicationAction = submitApplicationAction;
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/supabase/env");
const application_documents_1 = require("@/lib/admissions/application-documents");
const age_group_pricing_1 = require("@/lib/pricing/age-group-pricing");
const schema = zod_1.z.object({
    ecd_id: zod_1.z.string().uuid(),
    child_id: zod_1.z.string().uuid(),
    share_multiple_flag: zod_1.z.boolean().default(false),
    parent_message: zod_1.z.string().max(1000).optional(),
    access_token: zod_1.z.string().min(16).optional(),
});
function createApplicationNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    return `APP-${y}${m}${d}-${nonce}`;
}
async function submitApplicationAction(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        return { error: 'Invalid application data' };
    }
    const supabase = await (0, server_1.createClient)();
    const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
    ]);
    let user = (_c = (_a = userData.user) !== null && _a !== void 0 ? _a : (_b = sessionData.session) === null || _b === void 0 ? void 0 : _b.user) !== null && _c !== void 0 ? _c : null;
    if (!user && parsed.data.access_token) {
        const { data: tokenUserData } = await supabase.auth.getUser(parsed.data.access_token);
        user = (_d = tokenUserData.user) !== null && _d !== void 0 ? _d : null;
    }
    if (!user) {
        return { error: 'Please log in to apply' };
    }
    const hasSessionContext = Boolean(userData.user || ((_e = sessionData.session) === null || _e === void 0 ? void 0 : _e.user));
    const usingTokenScopedClient = !hasSessionContext && Boolean(parsed.data.access_token);
    const { supabaseUrl, supabaseAnonKey } = (0, env_1.readSupabasePublicEnv)();
    if (usingTokenScopedClient && (!supabaseUrl || !supabaseAnonKey)) {
        return { error: 'Server configuration error. Please contact support.' };
    }
    const db = usingTokenScopedClient
        ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${parsed.data.access_token}`,
                },
            },
        })
        : supabase;
    // Keep parent records present even when profile setup is still partial.
    // This ensures ECD teams can still resolve parent context for pipeline items.
    await db.from('parents').upsert({ id: user.id }, { onConflict: 'id' });
    const { data: child } = await db
        .from('children')
        .select('id,parent_id,first_name,last_name,date_of_birth,gender')
        .eq('id', parsed.data.child_id)
        .eq('parent_id', user.id)
        .maybeSingle();
    if (!child) {
        return { error: 'Child not found' };
    }
    const { data: centrePricing } = await db
        .from('ecd_centres')
        .select('age_group_pricing,monthly_fee_min')
        .eq('id', parsed.data.ecd_id)
        .maybeSingle();
    const resolvedFee = (0, age_group_pricing_1.resolveAgeGroupFeeForDateOfBirth)({
        dateOfBirth: child.date_of_birth,
        ageGroupPricing: centrePricing === null || centrePricing === void 0 ? void 0 : centrePricing.age_group_pricing,
        fallbackMonthlyFeeRand: (_f = centrePricing === null || centrePricing === void 0 ? void 0 : centrePricing.monthly_fee_min) !== null && _f !== void 0 ? _f : null,
    });
    const { data: documents } = await db.from('parent_documents').select('doc_type').eq('parent_id', user.id).limit(80);
    const documentChecklist = (0, application_documents_1.evaluateApplicationDocumentChecklist)((documents !== null && documents !== void 0 ? documents : []).map((doc) => doc.doc_type));
    const hasMissingDocuments = documentChecklist.missingCodes.length > 0;
    const nextStatus = hasMissingDocuments ? 'partial' : 'submitted';
    const { data: duplicate } = await db
        .from('applications')
        .select('id,status')
        .eq('parent_id', user.id)
        .eq('ecd_id', parsed.data.ecd_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (duplicate === null || duplicate === void 0 ? void 0 : duplicate.id) {
        return {
            error: 'Application already submitted for this creche. View your existing status instead.',
            existingApplicationId: duplicate.id,
            existingApplicationStatus: (_g = duplicate.status) !== null && _g !== void 0 ? _g : null,
        };
    }
    let applicationId = null;
    let insertError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await db
            .from('applications')
            .insert({
            application_number: createApplicationNumber(),
            ecd_id: parsed.data.ecd_id,
            parent_id: user.id,
            child_id: parsed.data.child_id,
            status: nextStatus,
            monthly_fee_cents: (_h = resolvedFee === null || resolvedFee === void 0 ? void 0 : resolvedFee.monthlyFeeCents) !== null && _h !== void 0 ? _h : 0,
            missing_documents: documentChecklist.missingCodes,
            share_multiple_flag: parsed.data.share_multiple_flag,
            parent_message: (_j = parsed.data.parent_message) !== null && _j !== void 0 ? _j : null,
            submitted_at: new Date().toISOString(),
        })
            .select('id')
            .single();
        if (!error) {
            applicationId = (_k = data === null || data === void 0 ? void 0 : data.id) !== null && _k !== void 0 ? _k : null;
            insertError = null;
            break;
        }
        insertError = error;
        if (error.code !== '23505') {
            break;
        }
    }
    if (insertError) {
        if ((_l = insertError.message) === null || _l === void 0 ? void 0 : _l.includes('infinite recursion')) {
            return { error: 'Server configuration error. Please contact support.' };
        }
        if ((_m = insertError.message) === null || _m === void 0 ? void 0 : _m.toLowerCase().includes('row-level security')) {
            return { error: 'Your session expired. Please sign in again and retry.' };
        }
        return { error: 'Could not submit application. Please try again.' };
    }
    // Notify ECD team immediately when a new application lands.
    // This runs out-of-band and should never block submission success.
    try {
        const admin = (0, admin_1.createAdminClient)();
        const [{ data: childInfo }, { data: centreInfo }, { data: parentProfile }] = await Promise.all([
            admin
                .from('children')
                .select('first_name,last_name')
                .eq('id', parsed.data.child_id)
                .maybeSingle(),
            admin
                .from('ecd_centres')
                .select('name')
                .eq('id', parsed.data.ecd_id)
                .maybeSingle(),
            admin
                .from('user_profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle(),
        ]);
        const childName = [childInfo === null || childInfo === void 0 ? void 0 : childInfo.first_name, childInfo === null || childInfo === void 0 ? void 0 : childInfo.last_name].filter(Boolean).join(' ').trim() || 'a child';
        const centreName = ((_o = centreInfo === null || centreInfo === void 0 ? void 0 : centreInfo.name) === null || _o === void 0 ? void 0 : _o.trim()) || 'your centre';
        const parentName = ((_p = parentProfile === null || parentProfile === void 0 ? void 0 : parentProfile.full_name) === null || _p === void 0 ? void 0 : _p.trim()) || ((_q = user.email) === null || _q === void 0 ? void 0 : _q.split('@')[0]) || 'A parent';
        const notificationTitle = nextStatus === 'partial' ? 'Partial application in pipeline' : 'New application submitted';
        const notificationMessage = nextStatus === 'partial'
            ? `${parentName} started a partial application for ${childName} at ${centreName}. Missing docs: ${documentChecklist.missingLabels.join(', ')}.`
            : `${parentName} submitted an application for ${childName} at ${centreName}.`;
        await admin.from('ecd_notifications').insert({
            ecd_id: parsed.data.ecd_id,
            application_id: applicationId,
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
                kind: nextStatus === 'partial' ? 'application_partial_submitted' : 'application_submitted',
                application_id: applicationId,
                parent_id: user.id,
                child_id: parsed.data.child_id,
                missing_documents: documentChecklist.missingCodes,
            },
            is_read: false,
        });
        if (nextStatus === 'partial' && applicationId) {
            const missingSummary = documentChecklist.missingLabels.slice(0, 5).join(', ');
            await admin.from('parent_notifications').insert({
                parent_id: user.id,
                ecd_id: parsed.data.ecd_id,
                application_id: applicationId,
                template_key: 'missing_documents',
                title: 'Almost there! 📄✨',
                message: `Great start, ${parentName}! We saved ${childName}'s application at ${centreName}. Please upload the remaining documents (${missingSummary}) so the crèche can review quickly 😊.`,
                is_read: false,
            });
        }
    }
    catch (_r) {
        // Non-blocking: ECD notifications should not fail application submission.
    }
    return {
        success: true,
        applicationId,
        status: nextStatus,
        missingDocuments: documentChecklist.missingLabels,
        uploadedDocumentsCount: documentChecklist.uploadedCount,
        totalRequiredDocuments: documentChecklist.totalRequired,
    };
}
