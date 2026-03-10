'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCentreProfileAction = updateCentreProfileAction;
const zod_1 = require("zod");
const cache_1 = require("next/cache");
const portal_session_1 = require("@/lib/ecd/portal-session");
const updateCentreProfileSchema = zod_1.z.object({
    ecdId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2).max(120),
    address: zod_1.z.string().max(255).optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().max(30).optional().or(zod_1.z.literal('')),
    email: zod_1.z.string().email(),
    description: zod_1.z.string().max(2000).optional().or(zod_1.z.literal('')),
    logo_url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    banner_url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
});
async function updateCentreProfileAction(input) {
    var _a, _b, _c, _d, _e;
    const parsed = updateCentreProfileSchema.safeParse(input);
    if (!parsed.success)
        return { error: 'Invalid data', fields: parsed.error.flatten().fieldErrors };
    const session = await (0, portal_session_1.requireEcdPortalSession)({ cached: false });
    if (session.role !== 'ecd_admin' || session.ecdId !== parsed.data.ecdId) {
        return { error: 'Only centre admins can update profile settings.' };
    }
    const { error } = await session.supabase
        .from('ecd_centres')
        .update({
        name: parsed.data.name,
        address: ((_a = parsed.data.address) === null || _a === void 0 ? void 0 : _a.trim()) || null,
        phone: ((_b = parsed.data.phone) === null || _b === void 0 ? void 0 : _b.trim()) || null,
        email: parsed.data.email,
        description: ((_c = parsed.data.description) === null || _c === void 0 ? void 0 : _c.trim()) || null,
        logo_url: ((_d = parsed.data.logo_url) === null || _d === void 0 ? void 0 : _d.trim()) || null,
        cover_image_url: ((_e = parsed.data.banner_url) === null || _e === void 0 ? void 0 : _e.trim()) || null,
        updated_at: new Date().toISOString(),
    })
        .eq('id', parsed.data.ecdId);
    if (error)
        return { error: error.message };
    const { data: centre } = await session.supabase
        .from('ecd_centres')
        .select('slug')
        .eq('id', parsed.data.ecdId)
        .maybeSingle();
    (0, cache_1.revalidatePath)('/ecd/profile');
    if (centre === null || centre === void 0 ? void 0 : centre.slug) {
        (0, cache_1.revalidatePath)(`/centre/${centre.slug}`);
        (0, cache_1.revalidatePath)(`/c/${centre.slug}`);
    }
    return { success: true };
}
