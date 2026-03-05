import { APP_URL, EMAIL_APP_URL, ROOT_DOMAIN } from '@/lib/config'

export type AccessLinkMode = 'magiclink' | 'invite'

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
    const parsed = new URL(redirectTo)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback
    if (!isAllowedAppHost(parsed.hostname)) return fallback
    return parsed.toString()
  } catch {
    return fallback
  }
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
      const redirectTo = parsed.searchParams.get('redirect_to')
      if (!redirectTo) return parsed.toString()
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

export async function generateMagicFirstAccessLink(input: {
  adminClient: AdminClientLike
  email: string
  redirectTo: string
  preferMagicLink?: boolean
}) {
  const { adminClient, email, redirectTo, preferMagicLink = false } = input
  const errors: string[] = []

  const magicResult = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  const magicLink = magicResult.data?.properties?.action_link?.trim() ?? ''
  if (!magicResult.error && magicLink) {
    return {
      link: magicLink,
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
    return {
      link: inviteLink,
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
