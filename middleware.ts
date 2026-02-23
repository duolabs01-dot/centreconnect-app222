import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import { ROOT_DOMAIN } from '@/lib/config'
import { validateSession } from '@/lib/session-guard'

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api'])
const ROLE_CACHE_COOKIES = ['cc_role', 'cc_role_uid', 'cc_role_exp']

function getHostname(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-host')
  const host = forwarded ?? request.headers.get('host') ?? ''
  return host.split(':')[0]?.toLowerCase() ?? ''
}

function resolveTenantSubdomain(hostname: string) {
  const rootDomain = (process.env.TENANT_ROOT_DOMAIN ?? ROOT_DOMAIN).toLowerCase()
  if (!hostname || hostname === rootDomain || hostname.endsWith(`.${rootDomain}`) === false) return null
  const suffix = `.${rootDomain}`
  const subdomain = hostname.slice(0, -suffix.length)
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null
  if (subdomain.includes('.')) return null
  return subdomain
}

function isProtectedPath(pathname: string) {
  if (pathname === '/ecd/login' || pathname === '/ecd/register') return false
  return pathname.startsWith('/admin') || pathname.startsWith('/ecd') || pathname.startsWith('/parent')
}

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))
}

function clearSessionCookies(response: NextResponse, request: NextRequest) {
  const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const options: CookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 0,
  }

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set({ name: cookie.name, value: '', ...options })
    }
  }

  for (const cookieName of ROLE_CACHE_COOKIES) {
    response.cookies.set({ name: cookieName, value: '', ...options })
  }
}

async function getAuthFromRequest(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return { user: null, session: null }

  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ])

  return {
    session: sessionData.session,
    user: userData.user,
  }
}

export async function middleware(request: NextRequest) {
  const subdomain = resolveTenantSubdomain(getHostname(request))
  if (subdomain && request.nextUrl.pathname === '/') {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/c/${subdomain}`
    return NextResponse.rewrite(rewriteUrl)
  }

  if (isProtectedPath(request.nextUrl.pathname) && hasSupabaseSessionCookie(request)) {
    const { user, session } = await getAuthFromRequest(request)
    if (user) {
      const isValid = await validateSession(
        user.id,
        session?.access_token ?? ''
      )

      if (!isValid) {
        const redirectUrl = new URL('/login?reason=session_expired', request.url)
        const response = NextResponse.redirect(redirectUrl)
        clearSessionCookies(response, request)
        return response
      }
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2)$).*)',
  ],
}
