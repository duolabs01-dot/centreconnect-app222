import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import { ROOT_DOMAIN } from '@/lib/config'

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
  
  // Also clear the activity cookie
  response.cookies.set({ name: 'cc_last_activity', value: '', ...options })
}

const ACTIVITY_COOKIE = 'cc_last_activity'
const INACTIVITY_LIMIT = 10 * 60 * 1000 // 10 minutes

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const subdomain = resolveTenantSubdomain(getHostname(request))
  
  if (subdomain && pathname === '/') {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/c/${subdomain}`
    return NextResponse.rewrite(rewriteUrl)
  }

  // Handle inactivity timeout for protected paths
  if (isProtectedPath(pathname) && hasSupabaseSessionCookie(request)) {
    const lastActivity = request.cookies.get(ACTIVITY_COOKIE)?.value
    const now = Date.now()

    if (lastActivity) {
      const lastTime = parseInt(lastActivity)
      if (now - lastTime > INACTIVITY_LIMIT) {
        const redirectUrl = new URL('/?reason=session_expired', request.url)
        const response = NextResponse.redirect(redirectUrl)
        clearSessionCookies(response, request)
        response.cookies.delete(ACTIVITY_COOKIE)
        return response
      }
    }

    // Session is valid or fresh, update session and activity timestamp
    const response = await updateSession(request)
    
    // Don't set activity cookie if we're being redirected (e.g. by updateSession)
    if (!response.headers.get('location')) {
      response.cookies.set(ACTIVITY_COOKIE, now.toString(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
      })
    }
    return response
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2)$).*)',
  ],
}
