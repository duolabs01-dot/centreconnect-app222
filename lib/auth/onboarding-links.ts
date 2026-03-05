import { APP_URL } from '@/lib/config'

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

export function normalizeAppUrl(value: string = APP_URL) {
  return value.replace(/\/$/, '')
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
