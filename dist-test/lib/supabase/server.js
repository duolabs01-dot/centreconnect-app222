"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
const config_1 = require("@/lib/config");
const env_1 = require("./env");
async function createClient() {
    (0, config_1.requireConfiguredAppUrl)();
    const cookieStore = (0, headers_1.cookies)();
    const { supabaseUrl, supabaseAnonKey } = (0, env_1.requireSupabasePublicEnv)('server-client');
    return (0, ssr_1.createServerClient)(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name) {
                var _a;
                return (_a = cookieStore.get(name)) === null || _a === void 0 ? void 0 : _a.value;
            },
            set(name, value, options) {
                try {
                    cookieStore.set(Object.assign({ name, value }, options));
                }
                catch (error) {
                    console.error(`[supabase] Failed to set cookie ${name}:`, error);
                }
            },
            remove(name, options) {
                try {
                    cookieStore.set(Object.assign({ name, value: '' }, options));
                }
                catch (error) {
                    console.error(`[supabase] Failed to remove cookie ${name}:`, error);
                }
            },
        },
    });
}
