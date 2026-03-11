"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.robustSignOut = robustSignOut;
const ROLE_CACHE_COOKIES = ['cc_role', 'cc_role_uid', 'cc_role_exp', 'cc_last_activity'];
function clearClientAuthArtifacts() {
    if (typeof window === 'undefined') {
        return;
    }
    const storages = [window.localStorage, window.sessionStorage];
    for (const storage of storages) {
        if (!storage)
            continue;
        const keysToRemove = [];
        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (!key)
                continue;
            if (key === 'supabase.auth.token' || key.startsWith('sb-') || key.includes('supabase')) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            storage.removeItem(key);
        }
    }
    const cookieNames = document.cookie
        .split(';')
        .map((cookie) => cookie.trim().split('=')[0])
        .filter(Boolean);
    for (const cookieName of cookieNames) {
        if (cookieName.startsWith('sb-') || ROLE_CACHE_COOKIES.includes(cookieName)) {
            document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`;
        }
    }
}
async function robustSignOut(authClient) {
    var _a;
    let clientError = null;
    let serverError = null;
    try {
        const { error } = await authClient.auth.signOut({ scope: 'global' });
        if (error) {
            clientError = (_a = error.message) !== null && _a !== void 0 ? _a : 'Client sign out failed';
        }
    }
    catch (error) {
        clientError = error instanceof Error ? error.message : 'Client sign out failed';
    }
    try {
        const response = await fetch('/api/auth/sign-out', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            let message = `Server sign out failed (${response.status})`;
            try {
                const payload = (await response.json());
                if (payload === null || payload === void 0 ? void 0 : payload.error) {
                    message = payload.error;
                }
            }
            catch (_b) {
                // no-op: keep status-based message
            }
            serverError = message;
        }
    }
    catch (error) {
        serverError = error instanceof Error ? error.message : 'Server sign out failed';
    }
    clearClientAuthArtifacts();
    return { clientError, serverError };
}
