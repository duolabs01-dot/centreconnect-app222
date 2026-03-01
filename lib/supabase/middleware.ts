import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const finish = (response: NextResponse, label: string) => {
    if (!timingEnabled) return response
    const durationMs = Date.now() - startedAt
    response.headers.set('x-cc-mw-time-ms', String(durationMs))
    response.headers.set('x-cc-mw-path', label)
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[mw] ${request.method} ${request.nextUrl.pathname} ${label} ${durationMs}ms`)
    }
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return finish(NextResponse.next({ request: { headers: request.headers } }), 'missing-env')
  }

  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
  const pathname = request.nextUrl.pathname
  const protectedArea = getProtectedArea(pathname)
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/ecd/login'
  const hasSupabaseSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'))

  // Fast paths for anonymous users: avoid remote auth checks when we can infer state from cookies.
  if (!hasSupabaseSessionCookie) {
    clearRoleCache(response, request)
    if (protectedArea) {
      const loginUrl = new URL(getLoginPath(protectedArea), request.url)
      const nextPath = `${pathname}${request.nextUrl.search}`
      loginUrl.searchParams.set('next', nextPath)
      return finish(NextResponse.redirect(loginUrl), 'anon-protected-redirect')
    }

    return finish(response, 'anon-pass')
  }

  const userResult = await withTimeout(supabase.auth.getUser(), 4000)
  if (!userResult) {
    clearRoleCache(response, request)
    if (protectedArea) {
      // Timeout: don't kick user out — just let them through and let the page handle auth
      return finish(response, 'user-timeout-public-pass')
    }
    return finish(response, 'user-timeout-public-pass')
  }

  const {
    data: { user },
  } = userResult

  if (!user && protectedArea) {
    clearRoleCache(response, request)
    const loginUrl = new URL(getLoginPath(protectedArea), request.url)
    const nextPath = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set('next', nextPath)
    return finish(NextResponse.redirect(loginUrl), 'no-user-protected-redirect')
  }

  if (!user) {
    clearRoleCache(response, request)
    return finish(response, 'no-user-pass')
  }

  // Public routes don't need role checks; skip DB lookup for responsiveness.
  if (!isAuthRoute && !protectedArea) {
    return finish(response, 'public-authenticated-pass')
  }

  const cachedRole = isAuthRoute ? null : getCachedRole(request, user.id)
  let role: UserRole | null = cachedRole

  if (!cachedRole) {
    const roleLookup = await withTimeout(
      getUserRole(supabase, user.id).then((value) => ({ value })),
      4000
    )
    if (!roleLookup) {
      clearRoleCache(response, request)
      // Timeout on role check — don't kick authenticated users, let page handle it
      return finish(response, 'role-timeout-pass')
    }
    role = roleLookup.value
    if (role) {
      setRoleCache(response, request, user.id, role)
    }
  }

  const dashboardPath = role ? getDashboardPath(role) : '/'

  if (isAuthRoute && role) {
    return finish(NextResponse.redirect(new URL(dashboardPath, request.url)), cachedRole ? 'auth-route-redirect-cache' : 'auth-route-redirect-db')
  }

  if (protectedArea && !role) {
    const loginUrl = new URL(getLoginPath(protectedArea), request.url)
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

function getProtectedArea(pathname: string): ProtectedArea | null {
  if (pathname === '/ecd/login') return null
  if (pathname === '/ecd/register') return null
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
     if (role === 'platform_admin') return '/admin/command';  if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') return '/ecd/dashboard'
  return '/parent/dashboard'
}

function getLoginPath(area: ProtectedArea): string {
  return area === 'ecd' ? '/ecd/login' : '/login'
}

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return (data?.role as UserRole | undefined) ?? null
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
  return value === 'platform_admin' || value === 'ecd_admin' || value === 'ecd_staff' || value === 'ecd_supervisor' || value === 'parent_user'
}
