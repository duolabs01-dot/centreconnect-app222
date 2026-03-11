'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleShortlist = toggleShortlist;
const cache_1 = require("next/cache");
const server_1 = require("@/lib/supabase/server");
async function toggleShortlist(centreId) {
    const supabase = await (0, server_1.createClient)();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { error: 'Not authenticated' };
    const { data: existing } = await supabase
        .from('parent_shortlists')
        .select('id')
        .eq('parent_id', user.id)
        .eq('centre_id', centreId)
        .maybeSingle();
    if (existing) {
        await supabase
            .from('parent_shortlists')
            .delete()
            .eq('parent_id', user.id)
            .eq('centre_id', centreId);
        (0, cache_1.revalidatePath)('/parent/shortlist');
        return { saved: false };
    }
    else {
        await supabase
            .from('parent_shortlists')
            .insert({ parent_id: user.id, centre_id: centreId });
        (0, cache_1.revalidatePath)('/parent/shortlist');
        return { saved: true };
    }
}
