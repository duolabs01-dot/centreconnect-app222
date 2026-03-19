import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { enforceEcdAdminDeviceLimit } from '@/lib/middleware-ecd-device-limit'
import { ROOT_DOMAIN } from '@/lib/config'

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api'])
const ECD_DEVICE_LIMIT_ENABLED = process.env.ENFORCE_ECD_DEVICE_LIMIT === '1'

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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isRscRequest = request.nextUrl.searchParams.has('_rsc') || request.headers.get('rsc') === '1'
  const subdomain = resolveTenantSubdomain(getHostname(request))

  if (subdomain && pathname === '/') {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/c/${subdomain}`
    return NextResponse.rewrite(rewriteUrl)
  }

  // Run main session middleware first
  const mainResponse = await updateSession(request)
  // If main middleware issued a redirect, respect it
  if (mainResponse.status >= 300 && mainResponse.status < 400) {
    return mainResponse
  }

  // Enforce ECD Admin device limit only for ECD routes
  if (ECD_DEVICE_LIMIT_ENABLED && pathname.startsWith('/ecd') && pathname !== '/ecd/login' && !isRscRequest) {
    const limitResponse = await enforceEcdAdminDeviceLimit(request)
    // If device-limit guard issues a redirect (e.g., session revoked), respect it
    if (limitResponse.status >= 300 && limitResponse.status < 400) {
      return limitResponse
    }
  }

  return mainResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2)$).*)',
  ],
}
