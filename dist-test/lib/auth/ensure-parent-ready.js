"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureParentReady = ensureParentReady;
const client_1 = require("@/lib/supabase/client");
let profileBootstrapDone = false;
let profileBootstrapInFlight = null;
async function ensureProfileBootstrap() {
    if (profileBootstrapDone) {
        return { ok: true };
    }
    if (!profileBootstrapInFlight) {
        profileBootstrapInFlight = (async () => {
            const response = await fetch('/api/auth/ensure-profile', {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = (await response.json().catch(() => ({})));
            if (!response.ok) {
                return { ok: false, error: payload.error || 'Could not prepare your account.' };
            }
            profileBootstrapDone = true;
            return { ok: true };
        })()
            .catch((error) => {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'Could not prepare your account.';
            return { ok: false, error: message };
        })
            .finally(() => {
            profileBootstrapInFlight = null;
        });
    }
    return profileBootstrapInFlight;
}
async function ensureParentReady(supabase = (0, client_1.createClient)()) {
    const { data: { user }, error: userError, } = await supabase.auth.getUser();
    if (userError || !user) {
        return { ok: false, error: 'Please sign in again before continuing.' };
    }
    const bootstrap = await ensureProfileBootstrap();
    if (!bootstrap.ok) {
        return { ok: false, error: bootstrap.error || 'Could not prepare your account.' };
    }
    const { error: parentError } = await supabase
        .from('parents')
        .upsert({ id: user.id }, { onConflict: 'id' });
    if (parentError) {
        return { ok: false, error: parentError.message || 'Could not prepare parent profile.' };
    }
    return { ok: true, userId: user.id };
}
