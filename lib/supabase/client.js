"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
const env_1 = require("./env");
let browserClient = null;
function createClient() {
    const { supabaseUrl, supabaseAnonKey } = (0, env_1.requireSupabaseBrowserEnv)('browser-client');
    if (browserClient) {
        return browserClient;
    }
    browserClient = (0, ssr_1.createBrowserClient)(supabaseUrl, supabaseAnonKey);
    return browserClient;
}
