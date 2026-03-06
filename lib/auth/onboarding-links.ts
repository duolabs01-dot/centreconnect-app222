import { APP_URL, EMAIL_APP_URL, ROOT_DOMAIN } from '@/lib/config'

export type AccessLinkMode = 'magiclink' | 'invite'
export type SanitizedAccessLinkDiagnostics = {
  originalHost: string | null
  originalPath: string | null
  sanitizedHost: string | null
  sanitizedPath: string | null
  usedFallback: boolean
  changed: boolean
}

export type InviteDomainHealth = {
  ok: boolean
  code: 'ok' | 'invalid_url' | 'blocked_host' | 'non_canonical_host' | 'missing_env'
  message: string
  details: Array<{ key: string; value: string }>
}

type LinkGenerationInput = {
  type: AccessLinkMode
  email: string
  options?: {
    redirectTo?: string
  }
}

type LinkGenerationResult = {
  data?: {
    user?: {
      id?: string | null
    } | null
    properties?: {
      action_link?: string | null
      hashed_token?: string | null
      verification_type?: string | null
    } | null
  } | null
  error?: {
    message?: string | null
  } | null
}

type AdminClientLike = {
  auth: {
    admin: {
      generateLink: (input: LinkGenerationInput) => Promise<LinkGenerationResult>
    }
  }
}

type WelcomePathInput = {
  name?: string
  centre?: string
  location?: string
  onboarding?: boolean
}

function toOrigin(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    return new URL(withProtocol).origin
  } catch {
    return null
  }
}

function resolveCanonicalOrigin() {
  return toOrigin(ROOT_DOMAIN) ?? 'https://centerconnect.co.za'
}

function shouldForceCanonicalOrigin() {
  if (process.env.CC_FORCE_CANONICAL_URL === '1') return true
  return process.env.VERCEL_ENV === 'production'
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isBlockedHostname(hostname: string) {
  return hostname.endsWith('.supabase.co') || hostname.endsWith('.vercel.app')
}

function allowedInviteHosts(canonicalHost: string) {
  return new Set([canonicalHost, `www.${canonicalHost}`, 'localhost', '127.0.0.1'])
}

function readInviteUrlEnvValues() {
  return [
    { key: 'NEXT_PUBLIC_APP_URL', value: process.env.NEXT_PUBLIC_APP_URL ?? '' },
    { key: 'NEXT_PUBLIC_EMAIL_APP_URL', value: process.env.NEXT_PUBLIC_EMAIL_APP_URL ?? '' },
    { key: 'SUPABASE_SITE_URL', value: process.env.SUPABASE_SITE_URL ?? '' },
    { key: 'GOTRUE_SITE_URL', value: process.env.GOTRUE_SITE_URL ?? '' },
    { key: 'SITE_URL', value: process.env.SITE_URL ?? '' },
    { key: 'AUTH_SITE_URL', value: process.env.AUTH_SITE_URL ?? '' },
  ]
}

export function assertInviteDomainHealth(): InviteDomainHealth {
  const canonicalOrigin = resolveCanonicalOrigin()
  const canonicalHost = new URL(canonicalOrigin).hostname
  const resolvedAppHost = new URL(normalizeAppUrl()).hostname
  const isProduction = shouldForceCanonicalOrigin()

  if (isProduction) {
    const requiredEnv = [
      { key: 'NEXT_PUBLIC_APP_URL', value: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '' },
      { key: 'NEXT_PUBLIC_EMAIL_APP_URL', value: process.env.NEXT_PUBLIC_EMAIL_APP_URL?.trim() ?? '' },
      { key: 'NEXT_PUBLIC_ROOT_DOMAIN', value: process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? '' },
    ]
    const missing = requiredEnv.filter((entry) => entry.value.length === 0).map((entry) => entry.key)
    const hasSupabaseSiteUrl =
      (process.env.SUPABASE_SITE_URL?.trim() ?? '').length > 0 ||
      (process.env.GOTRUE_SITE_URL?.trim() ?? '').length > 0 ||
      (process.env.SITE_URL?.trim() ?? '').length > 0 ||
      (process.env.AUTH_SITE_URL?.trim() ?? '').length > 0

    if (!hasSupabaseSiteUrl) {
      missing.push('SUPABASE_SITE_URL|GOTRUE_SITE_URL|SITE_URL|AUTH_SITE_URL')
    }

    if (missing.length > 0) {
      return {
        ok: false,
        code: 'missing_env',
        message: 'Invite links are blocked: required production URL env vars are missing.',
        details: missing.map((key) => ({ key, value: 'missing' })),
      }
    }
  }

  if (!isLocalHostname(resolvedAppHost) && resolvedAppHost !== canonicalHost && resolvedAppHost !== `www.${canonicalHost}`) {
    return {
      ok: false,
      code: 'non_canonical_host',
      message: `Invite links are blocked: app host must be ${canonicalHost}, got ${resolvedAppHost}.`,
      details: [{ key: 'resolvedAppHost', value: resolvedAppHost }],
    }
  }

  const allowedHosts = allowedInviteHosts(canonicalHost)
  const details: Array<{ key: string; value: string }> = []

  for (const entry of readInviteUrlEnvValues()) {
    const raw = entry.value.trim()
    if (!raw) continue

    const parsed = toOrigin(raw)
    if (!parsed) {
      return {
        ok: false,
        code: 'invalid_url',
        message: `Invite links are blocked: ${entry.key} is not a valid URL/domain.`,
        details: [{ key: entry.key, value: raw }],
      }
    }

    const host = new URL(parsed).hostname
    details.push({ key: entry.key, value: host })

    if (isBlockedHostname(host)) {
      return {
        ok: false,
        code: 'blocked_host',
        message: `Invite links are blocked: ${entry.key} cannot point to ${host}. Use ${canonicalHost}.`,
        details,
      }
    }

    if (!allowedHosts.has(host)) {
      return {
        ok: false,
        code: 'non_canonical_host',
        message: `Invite links are blocked: ${entry.key} host must be ${canonicalHost} (or localhost in dev).`,
        details,
      }
    }
  }

  return {
    ok: true,
    code: 'ok',
    message: 'Invite domain health check passed.',
    details,
  }
}

export function resolvePublicAppUrl(preferred?: string) {
  const canonicalOrigin = resolveCanonicalOrigin()
  if (shouldForceCanonicalOrigin()) return canonicalOrigin

  const preferredOrigin = toOrigin(preferred)
  if (preferredOrigin) return preferredOrigin

  const emailOrigin = toOrigin(EMAIL_APP_URL)
  if (emailOrigin) return emailOrigin

  const appOrigin = toOrigin(APP_URL)
  if (appOrigin) return appOrigin

  return canonicalOrigin
}

export function normalizeAppUrl(value?: string) {
  return resolvePublicAppUrl(value).replace(/\/$/, '')
}

function sanitizeNextPath(nextPath: string) {
  if (!nextPath.startsWith('/')) return '/ecd/welcome?onboarding=1'
  if (nextPath.startsWith('//')) return '/ecd/welcome?onboarding=1'
  return nextPath
}

type SupportedOtpType = 'signup' | 'magiclink' | 'invite' | 'recovery' | 'email_change'

function sanitizeConfirmType(value: string | null | undefined): SupportedOtpType {
  const normalized = (value ?? '').trim().toLowerCase()
  if (
    normalized === 'signup' ||
    normalized === 'magiclink' ||
    normalized === 'invite' ||
    normalized === 'recovery' ||
    normalized === 'email_change'
  ) {
    return normalized
  }
  return 'magiclink'
}

function sanitizeConfirmNextPath(value: string) {
  if (!value.startsWith('/')) return '/ecd/welcome?onboarding=1'
  if (value.startsWith('//')) return '/ecd/welcome?onboarding=1'
  return value
}

function resolveConfirmNextPathFromRedirect(redirectTo: string) {
  try {
    const parsed = new URL(redirectTo, normalizeAppUrl())
    const nextParam = parsed.searchParams.get('next')
    if (!nextParam) return '/ecd/welcome?onboarding=1'
    return sanitizeConfirmNextPath(nextParam)
  } catch {
    return '/ecd/welcome?onboarding=1'
  }
}

export function buildEcdWelcomePath(input: WelcomePathInput = {}) {
  const params = new URLSearchParams()

  const name = input.name?.trim()
  const centre = input.centre?.trim()
  const location = input.location?.trim()

  if (name) params.set('name', name)
  if (centre) params.set('centre', centre)
  if (location) params.set('location', location)
  if (input.onboarding ?? true) params.set('onboarding', '1')

  const query = params.toString()
  return query.length > 0 ? `/ecd/welcome?${query}` : '/ecd/welcome'
}

export function buildAuthCallbackRedirect(nextPath: string) {
  const safeNext = sanitizeNextPath(nextPath)
  return `${normalizeAppUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`
}

export function buildFirstPartyConfirmLink(input: {
  hashedToken: string | null | undefined
  verificationType?: string | null | undefined
  nextPath: string
}) {
  const token = (input.hashedToken ?? '').trim()
  if (!token) return null

  const url = new URL('/auth/confirm', normalizeAppUrl())
  url.searchParams.set('token_hash', token)
  url.searchParams.set('type', sanitizeConfirmType(input.verificationType))
  url.searchParams.set('next', sanitizeConfirmNextPath(input.nextPath))
  return url.toString()
}

export function buildDefaultEcdOnboardingRedirect() {
  return buildAuthCallbackRedirect(buildEcdWelcomePath({ onboarding: true }))
}

export function buildLockedResetPasswordRedirect(email: string) {
  return `${normalizeAppUrl()}/reset-password?locked_email=${encodeURIComponent(email)}`
}

function isAllowedAppHost(hostname: string) {
  const appHost = new URL(normalizeAppUrl()).hostname
  const canonicalHost = new URL(resolveCanonicalOrigin()).hostname
  return hostname === appHost || hostname === canonicalHost
}

function sanitizeRedirectUrl(redirectTo: string, fallback: string) {
  try {
    const parsed = new URL(redirectTo, normalizeAppUrl())
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback
    if (!isAllowedAppHost(parsed.hostname)) return fallback
    return parsed.toString()
  } catch {
    return fallback
  }
}

function isExpectedSupabaseAuthPath(pathname: string) {
  const normalized = pathname.trim().toLowerCase()
  return normalized.startsWith('/auth/v1/')
}

function looksLikeDomainPath(pathname: string) {
  const normalized = pathname.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)
}

export function sanitizeGeneratedAccessLink(input: {
  actionLink: string | null | undefined
  fallbackRedirectTo: string
}) {
  const fallback = input.fallbackRedirectTo
  const candidate = (input.actionLink ?? '').trim()
  if (!candidate) return fallback

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback

    if (parsed.hostname.endsWith('.supabase.co')) {
      if (!isExpectedSupabaseAuthPath(parsed.pathname)) {
        if (looksLikeDomainPath(parsed.pathname) && parsed.hash.includes('access_token')) {
          try {
            const fallbackUrl = new URL(fallback)
            fallbackUrl.hash = parsed.hash
            return fallbackUrl.toString()
          } catch {
            return fallback
          }
        }
        return fallback
      }

      const redirectTo = parsed.searchParams.get('redirect_to')
      if (!redirectTo) {
        parsed.searchParams.set('redirect_to', fallback)
        return parsed.toString()
      }
      const safeRedirect = sanitizeRedirectUrl(redirectTo, fallback)
      if (safeRedirect !== redirectTo) {
        parsed.searchParams.set('redirect_to', safeRedirect)
      }
      return parsed.toString()
    }

    if (!isAllowedAppHost(parsed.hostname)) return fallback
    return parsed.toString()
  } catch {
    return fallback
  }
}

function extractHostAndPath(raw: string | null | undefined) {
  const value = (raw ?? '').trim()
  if (!value) return { host: null, path: null }
  try {
    const parsed = new URL(value)
    return { host: parsed.hostname, path: parsed.pathname || '/' }
  } catch {
    return { host: null, path: null }
  }
}

export function sanitizeGeneratedAccessLinkWithDiagnostics(input: {
  actionLink: string | null | undefined
  fallbackRedirectTo: string
}) {
  const sanitizedLink = sanitizeGeneratedAccessLink(input)
  const fallback = input.fallbackRedirectTo
  const original = (input.actionLink ?? '').trim()

  const originalInfo = extractHostAndPath(original)
  const sanitizedInfo = extractHostAndPath(sanitizedLink)
  const fallbackInfo = extractHostAndPath(fallback)

  const diagnostics: SanitizedAccessLinkDiagnostics = {
    originalHost: originalInfo.host,
    originalPath: originalInfo.path,
    sanitizedHost: sanitizedInfo.host,
    sanitizedPath: sanitizedInfo.path,
    usedFallback:
      sanitizedInfo.host === fallbackInfo.host &&
      sanitizedInfo.path === fallbackInfo.path &&
      sanitizedLink.startsWith(fallback),
    changed: original.length > 0 && sanitizedLink !== original,
  }

  return {
    link: sanitizedLink,
    diagnostics,
  }
}

export async function generateMagicFirstAccessLink(input: {
  adminClient: AdminClientLike
  email: string
  redirectTo: string
  preferMagicLink?: boolean
}) {
  const { adminClient, email, redirectTo, preferMagicLink = false } = input
  const errors: string[] = []
  const confirmNextPath = resolveConfirmNextPathFromRedirect(redirectTo)

  const magicResult = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  const magicLink = magicResult.data?.properties?.action_link?.trim() ?? ''
  if (!magicResult.error && magicLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: magicResult.data?.properties?.hashed_token ?? null,
      verificationType: magicResult.data?.properties?.verification_type ?? 'magiclink',
      nextPath: confirmNextPath,
    })
    const safeMagicLink = sanitizeGeneratedAccessLink({
      actionLink: magicLink,
      fallbackRedirectTo: redirectTo,
    })
    return {
      link: firstPartyConfirmLink ?? safeMagicLink,
      authUserId: magicResult.data?.user?.id ?? null,
      mode: 'magiclink' as const,
      warning: preferMagicLink ? null : null,
    }
  }
  if (magicResult.error?.message) {
    errors.push(`magiclink: ${magicResult.error.message}`)
  }

  const inviteResult = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })
  const inviteLink = inviteResult.data?.properties?.action_link?.trim() ?? ''
  if (!inviteResult.error && inviteLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: inviteResult.data?.properties?.hashed_token ?? null,
      verificationType: inviteResult.data?.properties?.verification_type ?? 'invite',
      nextPath: confirmNextPath,
    })
    const safeInviteLink = sanitizeGeneratedAccessLink({
      actionLink: inviteLink,
      fallbackRedirectTo: redirectTo,
    })
    return {
      link: firstPartyConfirmLink ?? safeInviteLink,
      authUserId: inviteResult.data?.user?.id ?? null,
      mode: 'invite' as const,
      warning: preferMagicLink ? 'Sent invite link as fallback.' : null,
    }
  }
  if (inviteResult.error?.message) {
    errors.push(`invite: ${inviteResult.error.message}`)
  }

  return {
    link: '',
    authUserId: null,
    mode: preferMagicLink ? ('magiclink' as const) : ('invite' as const),
    warning: errors.length > 0 ? errors.join(' | ') : 'Failed to generate access link.',
  }
}
