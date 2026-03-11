"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canShowMultipleApplicationsFlag = canShowMultipleApplicationsFlag;
require("server-only");
const server_1 = require("@/lib/supabase/server");
const ACTIVE_APPLICATION_STATUSES = ['draft', 'partial', 'submitted', 'in_review', 'approved', 'waitlisted'];
async function canShowMultipleApplicationsFlag(parentId, childId, ecdId) {
    const supabase = await (0, server_1.createClient)();
    const { data: currentApplication } = await supabase
        .from('applications')
        .select('id,share_multiple_flag')
        .eq('parent_id', parentId)
        .eq('child_id', childId)
        .eq('ecd_id', ecdId)
        .maybeSingle();
    if (!(currentApplication === null || currentApplication === void 0 ? void 0 : currentApplication.share_multiple_flag)) {
        return false;
    }
    const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', parentId)
        .eq('child_id', childId)
        .in('status', [...ACTIVE_APPLICATION_STATUSES]);
    return (count !== null && count !== void 0 ? count : 0) >= 3;
}
