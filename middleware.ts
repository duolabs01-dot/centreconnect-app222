import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { ROOT_DOMAIN } from '@/lib/config'

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api'])

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
  const subdomain = resolveTenantSubdomain(getHostname(request))

  if (subdomain && pathname === '/') {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/c/${subdomain}`
    return NextResponse.rewrite(rewriteUrl)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2)$).*)',
  ],
}
