"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSession = updateSession;
const ssr_1 = require("@supabase/ssr");
const server_1 = require("next/server");
const env_1 = require("./env");
async function withTimeout(promise, timeoutMs) {
    let timeoutHandle;
    try {
        const timeoutPromise = new Promise((resolve) => {
            timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
        });
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}
async function updateSession(request) {
    var _a, _b, _c, _d;
    const timingEnabled = process.env.ENABLE_MW_TIMING === '1';
    const startedAt = timingEnabled ? Date.now() : 0;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-cc-pathname', request.nextUrl.pathname);
    const finish = (response, label) => {
        if (!timingEnabled)
            return response;
        const durationMs = Date.now() - startedAt;
        response.headers.set('x-cc-mw-time-ms', String(durationMs));
        response.headers.set('x-cc-mw-path', label);
        if (process.env.NODE_ENV === 'development') {
            console.log(`[mw] ${request.method} ${request.nextUrl.pathname} ${label} ${durationMs}ms`);
        }
        return response;
    };
    const { supabaseUrl, supabaseAnonKey } = (0, env_1.readSupabasePublicEnv)();
    if (!supabaseUrl || !supabaseAnonKey) {
        return finish(server_1.NextResponse.next({ request: { headers: requestHeaders } }), 'missing-env');
    }
    let response = server_1.NextResponse.next({ request: { headers: requestHeaders } });
    const supabase = (0, ssr_1.createServerClient)(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name) {
                var _a;
                return (_a = request.cookies.get(name)) === null || _a === void 0 ? void 0 : _a.value;
            },
            set(name, value, options) {
                request.cookies.set(Object.assign({ name, value }, options));
                response = server_1.NextResponse.next({ request: { headers: requestHeaders } });
                response.cookies.set(Object.assign({ name, value }, options));
            },
            remove(name, options) {
                request.cookies.set(Object.assign({ name, value: '' }, options));
                response = server_1.NextResponse.next({ request: { headers: requestHeaders } });
                response.cookies.set(Object.assign({ name, value: '' }, options));
            },
        },
    });
    const pathname = request.nextUrl.pathname;
    const protectedArea = getProtectedArea(pathname);
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/ecd/login';
    const isActivationPage = pathname === '/account/activate';
    const hasSupabaseSessionCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'));
    if (!hasSupabaseSessionCookie) {
        clearRoleCache(response, request);
        if (protectedArea || isActivationPage) {
            const loginUrl = new URL(getLoginPath(protectedArea !== null && protectedArea !== void 0 ? protectedArea : 'parent'), request.url);
            const nextPath = `${pathname}${request.nextUrl.search}`;
            loginUrl.searchParams.set('next', nextPath);
            return finish(server_1.NextResponse.redirect(loginUrl), 'anon-protected-redirect');
        }
        return finish(response, 'anon-pass');
    }
    const userResult = await withTimeout(supabase.auth.getUser(), 4000);
    if (!userResult) {
        clearRoleCache(response, request);
        if (protectedArea || isActivationPage) {
            const loginUrl = new URL(getLoginPath(protectedArea !== null && protectedArea !== void 0 ? protectedArea : 'parent'), request.url);
            loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
            return finish(server_1.NextResponse.redirect(loginUrl), 'user-timeout-protected-redirect');
        }
        return finish(response, 'user-timeout-public-pass');
    }
    const { data: { user }, } = userResult;
    if (!user) {
        clearRoleCache(response, request);
        if (protectedArea || isActivationPage) {
            const loginUrl = new URL(getLoginPath(protectedArea !== null && protectedArea !== void 0 ? protectedArea : 'parent'), request.url);
            const nextPath = `${pathname}${request.nextUrl.search}`;
            loginUrl.searchParams.set('next', nextPath);
            return finish(server_1.NextResponse.redirect(loginUrl), 'no-user-protected-redirect');
        }
        return finish(response, 'no-user-pass');
    }
    const activationGuardEnabled = Boolean(protectedArea || isAuthRoute || isActivationPage);
    let authStateFromDb = null;
    if (activationGuardEnabled) {
        const authStateLookup = await withTimeout(getUserAuthState(supabase, user.id).then((value) => ({ value })), 4000);
        if (!authStateLookup) {
            clearRoleCache(response, request);
            if (protectedArea || isActivationPage) {
                const loginUrl = new URL(getLoginPath(protectedArea !== null && protectedArea !== void 0 ? protectedArea : 'parent'), request.url);
                loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
                return finish(server_1.NextResponse.redirect(loginUrl), 'activation-check-timeout-redirect');
            }
            return finish(response, 'activation-check-timeout-pass');
        }
        authStateFromDb = authStateLookup.value;
        if (authStateFromDb.activationRequired && !isActivationPage) {
            return finish(server_1.NextResponse.redirect(new URL('/account/activate', request.url)), 'activation-required-redirect');
        }
        if (!authStateFromDb.activationRequired && isActivationPage && authStateFromDb.role) {
            return finish(server_1.NextResponse.redirect(new URL(getDashboardPath(authStateFromDb.role), request.url)), 'activation-complete-redirect');
        }
    }
    if (!isAuthRoute && !protectedArea && !isActivationPage) {
        return finish(response, 'public-authenticated-pass');
    }
    const cachedRole = isAuthRoute || isActivationPage || activationGuardEnabled ? null : getCachedRole(request, user.id);
    let role = (_a = authStateFromDb === null || authStateFromDb === void 0 ? void 0 : authStateFromDb.role) !== null && _a !== void 0 ? _a : cachedRole;
    if (cachedRole === 'parent_user' && protectedArea === 'parent') {
        const freshRoleLookup = await withTimeout(getUserAuthState(supabase, user.id).then((value) => ({ value })), 4000);
        if (((_b = freshRoleLookup === null || freshRoleLookup === void 0 ? void 0 : freshRoleLookup.value) === null || _b === void 0 ? void 0 : _b.role) && freshRoleLookup.value.role !== cachedRole) {
            role = freshRoleLookup.value.role;
            setRoleCache(response, request, user.id, role);
        }
    }
    if (!role) {
        const roleLookup = authStateFromDb
            ? { value: authStateFromDb.role }
            : await withTimeout(getUserAuthState(supabase, user.id).then((value) => ({ value: value.role })), 4000);
        if (!roleLookup) {
            clearRoleCache(response, request);
            if (protectedArea) {
                const loginUrl = new URL(getLoginPath(protectedArea), request.url);
                loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
                return finish(server_1.NextResponse.redirect(loginUrl), 'role-timeout-protected-redirect');
            }
            return finish(response, 'role-timeout-pass');
        }
        role = roleLookup.value;
    }
    if (role && !cachedRole) {
        setRoleCache(response, request, user.id, role);
    }
    const dashboardPath = role ? getDashboardPath(role) : '/';
    if (isAuthRoute && role) {
        if (pathname === '/ecd/login' && isEcdRole(role)) {
            const ecdAccessLookup = await withTimeout((async () => {
                const result = await supabase
                    .from('ecd_admins')
                    .select('ecd_id, ecd_centres!inner(id)')
                    .eq('user_id', user.id)
                    .limit(1);
                return { result };
            })(), 3000);
            if (!ecdAccessLookup) {
                clearRoleCache(response, request);
                return finish(response, 'auth-route-ecd-membership-timeout-pass');
            }
            const ecdAccessResult = ecdAccessLookup.result;
            const hasValidEcdAccess = !ecdAccessResult.error && ((_d = (_c = ecdAccessResult.data) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) > 0;
            if (!hasValidEcdAccess) {
                clearRoleCache(response, request);
                return finish(response, 'auth-route-ecd-missing-access-pass');
            }
        }
        return finish(server_1.NextResponse.redirect(new URL(dashboardPath, request.url)), cachedRole ? 'auth-route-redirect-cache' : 'auth-route-redirect-db');
    }
    if (protectedArea && !role) {
        const loginUrl = new URL(getLoginPath(protectedArea), request.url);
        loginUrl.searchParams.set('error', 'complete-profile');
        return finish(server_1.NextResponse.redirect(loginUrl), 'protected-no-role-redirect');
    }
    if (protectedArea && role && !isRoleAllowed(protectedArea, role)) {
        return finish(server_1.NextResponse.redirect(new URL(dashboardPath, request.url)), 'protected-wrong-role-redirect');
    }
    return finish(response, cachedRole ? 'protected-pass-cache' : 'protected-pass-db');
}
function isEcdRole(role) {
    return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor';
}
function getProtectedArea(pathname) {
    if (pathname === '/ecd/login')
        return null;
    if (pathname === '/ecd/register')
        return null;
    if (pathname === '/ecd/welcome' || pathname.startsWith('/ecd/welcome/'))
        return null;
    if (pathname.startsWith('/admin'))
        return 'admin';
    if (pathname.startsWith('/ecd'))
        return 'ecd';
    if (pathname.startsWith('/parent'))
        return 'parent';
    return null;
}
function isRoleAllowed(area, role) {
    if (area === 'admin')
        return role === 'platform_admin';
    if (area === 'ecd')
        return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor';
    return role === 'parent_user';
}
function getDashboardPath(role) {
    if (role === 'platform_admin')
        return '/admin/command';
    if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor')
        return '/ecd/dashboard';
    return '/parent/dashboard';
}
function getLoginPath(area) {
    return area === 'ecd' ? '/ecd/login' : '/login';
}
async function getUserAuthState(supabase, userId) {
    var _a;
    const { data } = await supabase
        .from('user_profiles')
        .select('role,account_activation_required')
        .eq('id', userId)
        .maybeSingle();
    return {
        role: (_a = data === null || data === void 0 ? void 0 : data.role) !== null && _a !== void 0 ? _a : null,
        activationRequired: Boolean(data === null || data === void 0 ? void 0 : data.account_activation_required),
    };
}
const ROLE_COOKIE = 'cc_role';
const ROLE_UID_COOKIE = 'cc_role_uid';
const ROLE_EXP_COOKIE = 'cc_role_exp';
const ROLE_CACHE_TTL_SECONDS = 10 * 60;
function getCachedRole(request, userId) {
    var _a, _b, _c;
    const role = (_a = request.cookies.get(ROLE_COOKIE)) === null || _a === void 0 ? void 0 : _a.value;
    const uid = (_b = request.cookies.get(ROLE_UID_COOKIE)) === null || _b === void 0 ? void 0 : _b.value;
    const expRaw = (_c = request.cookies.get(ROLE_EXP_COOKIE)) === null || _c === void 0 ? void 0 : _c.value;
    if (!role || !uid || !expRaw)
        return null;
    if (uid !== userId)
        return null;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || Date.now() > exp)
        return null;
    if (!isValidRole(role))
        return null;
    return role;
}
function setRoleCache(response, request, userId, role) {
    const expiresAt = Date.now() + ROLE_CACHE_TTL_SECONDS * 1000;
    const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
    const options = {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: ROLE_CACHE_TTL_SECONDS,
    };
    response.cookies.set(Object.assign({ name: ROLE_COOKIE, value: role }, options));
    response.cookies.set(Object.assign({ name: ROLE_UID_COOKIE, value: userId }, options));
    response.cookies.set(Object.assign({ name: ROLE_EXP_COOKIE, value: String(expiresAt) }, options));
}
function clearRoleCache(response, request) {
    const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
    const options = {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 0,
    };
    response.cookies.set(Object.assign({ name: ROLE_COOKIE, value: '' }, options));
    response.cookies.set(Object.assign({ name: ROLE_UID_COOKIE, value: '' }, options));
    response.cookies.set(Object.assign({ name: ROLE_EXP_COOKIE, value: '' }, options));
}
function isValidRole(value) {
    return (value === 'platform_admin' ||
        value === 'ecd_admin' ||
        value === 'ecd_staff' ||
        value === 'ecd_supervisor' ||
        value === 'parent_user');
}
