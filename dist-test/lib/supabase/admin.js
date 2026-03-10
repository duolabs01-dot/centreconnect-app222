"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminClient = createAdminClient;
require("server-only");
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
function createAdminClient() {
    const { supabaseUrl, serviceRoleKey } = (0, env_1.requireSupabaseAdminEnv)('admin-client');
    return (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
