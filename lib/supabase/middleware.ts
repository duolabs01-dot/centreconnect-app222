import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { readSupabasePublicEnv } from './env'

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(null), timeoutMs)
    })
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

export async function updateSession(request: NextRequest) {
  const timingEnabled = process.env.ENABLE_MW_TIMING === '1'
  const startedAt = timingEnabled ? Date.now() : 0
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-cc-pathname', request.nextUrl.pathname)
  const finish = (response: NextResponse, label: string) => {
    if (!timingEnabled) return response
    const durationMs = Date.now() - startedAt
    response.headers.set('x-cc-mw-time-ms', String(durationMs))
    response.headers.set('x-cc-mw-path', label)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[mw] ${request.method} ${request.nextUrl.pathname} ${label} ${durationMs}ms`)
    }
    return response
  }

  const { supabaseUrl, supabaseAnonKey } = readSupabasePublicEnv()
  if (!supabaseUrl || !supabaseAnonKey) {
    return finish(NextResponse.next({ request: { headers: requestHeaders } }), 'missing-env')
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } })
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: requestHeaders } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: requestHeaders } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const pathname = request.nextUrl.pathname
  const protectedArea = getProtectedArea(pathname)
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/ecd/login'
  const isActivationPage = pathname === '/account/activate'
  const hasSupabaseSessionCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))

  if (!hasSupabaseSessionCookie) {
    clearRoleCache(response, request)
    if (protectedArea || isActivationPage) {
      return finish(
        NextResponse.redirect(buildLoginUrl(request, protectedArea ?? 'parent', `${pathname}${request.nextUrl.search}`)),
        'anon-protected-redirect'
      )
    }
    return finish(response, 'anon-pass')
  }

  const userResult = await withTimeout(supabase.auth.getUser(), 4000)
  if (!userResult) {
    clearRoleCache(response, request)
    if (protectedArea || isActivationPage) {
      return finish(
        NextResponse.redirect(buildLoginUrl(request, protectedArea ?? 'parent', `${pathname}${request.nextUrl.search}`)),
        'user-timeout-protected-redirect'
      )
    }
    return finish(response, 'user-timeout-public-pass')
  }

  const {
    data: { user },
  } = userResult

  if (!user) {
    clearRoleCache(response, request)
    if (protectedArea || isActivationPage) {
      return finish(
        NextResponse.redirect(buildLoginUrl(request, protectedArea ?? 'parent', `${pathname}${request.nextUrl.search}`)),
        'no-user-protected-redirect'
      )
    }
    return finish(response, 'no-user-pass')
  }

  const activationGuardEnabled = Boolean(protectedArea || isAuthRoute || isActivationPage)
  let authStateFromDb: { role: UserRole | null; activationRequired: boolean } | null = null

  if (activationGuardEnabled) {
    const authStateLookup = await withTimeout(
      getUserAuthState(supabase, user.id).then((value) => ({ value })),
      4000
    )
    if (!authStateLookup) {
      clearRoleCache(response, request)
      if (protectedArea || isActivationPage) {
        return finish(
          NextResponse.redirect(buildLoginUrl(request, protectedArea ?? 'parent', `${pathname}${request.nextUrl.search}`)),
          'activation-check-timeout-redirect'
        )
      }
      return finish(response, 'activation-check-timeout-pass')
    }

    authStateFromDb = authStateLookup.value

    if (authStateFromDb.activationRequired && !isActivationPage) {
      return finish(NextResponse.redirect(new URL('/account/activate', request.url)), 'activation-required-redirect')
    }

    if (!authStateFromDb.activationRequired && isActivationPage && authStateFromDb.role) {
      return finish(
        NextResponse.redirect(new URL(getDashboardPath(authStateFromDb.role), request.url)),
        'activation-complete-redirect'
      )
    }
  }

  if (!isAuthRoute && !protectedArea && !isActivationPage) {
    return finish(response, 'public-authenticated-pass')
  }

  // Role caching is safe on non-auth routes. We avoid cache usage on auth/activation routes
  // so redirects always reflect the latest DB role + activation state.
  const cachedRole = isAuthRoute || isActivationPage ? null : getCachedRole(request, user.id)
  let role: UserRole | null = authStateFromDb?.role ?? cachedRole

  if (cachedRole === 'parent_user' && protectedArea === 'parent') {
    const freshRoleLookup = await withTimeout(
      getUserAuthState(supabase, user.id).then((value) => ({ value })),
      4000
    )
    if (freshRoleLookup?.value?.role && freshRoleLookup.value.role !== cachedRole) {
      role = freshRoleLookup.value.role
      setRoleCache(response, request, user.id, role)
    }
  }

  if (!role) {
    const roleLookup = authStateFromDb
      ? { value: authStateFromDb.role }
      : await withTimeout(getUserAuthState(supabase, user.id).then((value) => ({ value: value.role })), 4000)
    if (!roleLookup) {
      clearRoleCache(response, request)
      if (protectedArea) {
        return finish(
          NextResponse.redirect(buildLoginUrl(request, protectedArea, `${pathname}${request.nextUrl.search}`)),
          'role-timeout-protected-redirect'
        )
      }
      return finish(response, 'role-timeout-pass')
    }
    role = roleLookup.value
  }

  if (role && !cachedRole) {
    setRoleCache(response, request, user.id, role)
  }

  const dashboardPath = role ? getDashboardPath(role) : '/'

  if (isAuthRoute && role) {
    if (pathname === '/ecd/login' && isEcdRole(role)) {
      const ecdAccessLookup = await withTimeout(
        (async () => {
          const result = await supabase
            .from('ecd_admins')
            .select('ecd_id, ecd_centres!inner(id)')
            .eq('user_id', user.id)
            .limit(1)
          return { result }
        })(),
        3000
      )

      if (!ecdAccessLookup) {
        clearRoleCache(response, request)
        return finish(response, 'auth-route-ecd-membership-timeout-pass')
      }

      const ecdAccessResult = ecdAccessLookup.result
      const hasValidEcdAccess = !ecdAccessResult.error && (ecdAccessResult.data?.length ?? 0) > 0

      if (!hasValidEcdAccess) {
        clearRoleCache(response, request)
        return finish(response, 'auth-route-ecd-missing-access-pass')
      }
    }

    return finish(
      NextResponse.redirect(new URL(dashboardPath, request.url)),
      cachedRole ? 'auth-route-redirect-cache' : 'auth-route-redirect-db'
    )
  }

  if (protectedArea && !role) {
    const loginUrl = buildLoginUrl(request, protectedArea, `${pathname}${request.nextUrl.search}`)
    loginUrl.searchParams.set('error', 'complete-profile')
    return finish(NextResponse.redirect(loginUrl), 'protected-no-role-redirect')
  }

  if (protectedArea && role && !isRoleAllowed(protectedArea, role)) {
    return finish(NextResponse.redirect(new URL(dashboardPath, request.url)), 'protected-wrong-role-redirect')
  }

  return finish(response, cachedRole ? 'protected-pass-cache' : 'protected-pass-db')
}

type UserRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user'
type ProtectedArea = 'admin' | 'ecd' | 'parent'

function isEcdRole(role: UserRole | null | undefined): role is 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' {
  return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor'
}

function getProtectedArea(pathname: string): ProtectedArea | null {
  if (pathname === '/ecd/login') return null
  if (pathname === '/ecd/register') return null
  if (pathname === '/ecd/welcome' || pathname.startsWith('/ecd/welcome/')) return null
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/ecd')) return 'ecd'
  if (pathname.startsWith('/parent')) return 'parent'
  return null
}

function isRoleAllowed(area: ProtectedArea, role: UserRole): boolean {
  if (area === 'admin') return role === 'platform_admin'
  if (area === 'ecd') return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor'
  return role === 'parent_user'
}

function getDashboardPath(role: UserRole | null): string {
  if (role === 'platform_admin') return '/admin/dashboard'
  if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') return '/ecd/dashboard'
  return '/parent/dashboard'
}

function getLoginPath(area: ProtectedArea): string {
  return area === 'ecd' ? '/ecd/login' : '/login'
}

function buildLoginUrl(request: NextRequest, area: ProtectedArea, nextPath: string) {
  const loginUrl = new URL(getLoginPath(area), request.url)
  loginUrl.searchParams.set('next', nextPath)
  if (area === 'admin') {
    loginUrl.searchParams.set('persona', 'admin')
  }
  return loginUrl
}

async function getUserAuthState(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ role: UserRole | null; activationRequired: boolean }> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role,account_activation_required')
    .eq('id', userId)
    .maybeSingle()

  return {
    role: (data?.role as UserRole | undefined) ?? null,
    activationRequired: Boolean(data?.account_activation_required),
  }
}

const ROLE_COOKIE = 'cc_role'
const ROLE_UID_COOKIE = 'cc_role_uid'
const ROLE_EXP_COOKIE = 'cc_role_exp'
const ROLE_CACHE_TTL_SECONDS = 10 * 60

function getCachedRole(request: NextRequest, userId: string): UserRole | null {
  const role = request.cookies.get(ROLE_COOKIE)?.value
  const uid = request.cookies.get(ROLE_UID_COOKIE)?.value
  const expRaw = request.cookies.get(ROLE_EXP_COOKIE)?.value

  if (!role || !uid || !expRaw) return null
  if (uid !== userId) return null

  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || Date.now() > exp) return null
  if (!isValidRole(role)) return null

  return role
}

function setRoleCache(response: NextResponse, request: NextRequest, userId: string, role: UserRole) {
  const expiresAt = Date.now() + ROLE_CACHE_TTL_SECONDS * 1000
  const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const options: CookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: ROLE_CACHE_TTL_SECONDS,
  }

  response.cookies.set({ name: ROLE_COOKIE, value: role, ...options })
  response.cookies.set({ name: ROLE_UID_COOKIE, value: userId, ...options })
  response.cookies.set({ name: ROLE_EXP_COOKIE, value: String(expiresAt), ...options })
}

function clearRoleCache(response: NextResponse, request: NextRequest) {
  const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const options: CookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 0,
  }

  response.cookies.set({ name: ROLE_COOKIE, value: '', ...options })
  response.cookies.set({ name: ROLE_UID_COOKIE, value: '', ...options })
  response.cookies.set({ name: ROLE_EXP_COOKIE, value: '', ...options })
}

function isValidRole(value: string): value is UserRole {
  return (
    value === 'platform_admin' ||
    value === 'ecd_admin' ||
    value === 'ecd_staff' ||
    value === 'ecd_supervisor' ||
    value === 'parent_user'
  )
}

