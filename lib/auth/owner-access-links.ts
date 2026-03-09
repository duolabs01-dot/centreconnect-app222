import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  buildLockedResetPasswordRedirect,
  sanitizeGeneratedAccessLinkWithDiagnostics,
  type SanitizedAccessLinkDiagnostics,
} from '@/lib/auth/onboarding-links'

export type OwnerAccessLinkResult = {
  link: string
  authUserId: string | null
  warning: string | null
  diagnostics: SanitizedAccessLinkDiagnostics
}

export async function generateOwnerAccessLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  onboardingPath: string
): Promise<OwnerAccessLinkResult> {
  const redirectTo = buildAuthCallbackRedirect(onboardingPath)
  const magicLinkResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  const magicLink = magicLinkResult.data?.properties?.action_link?.trim() ?? ''
  if (!magicLinkResult.error && magicLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: magicLinkResult.data?.properties?.hashed_token ?? null,
      verificationType: magicLinkResult.data?.properties?.verification_type ?? 'magiclink',
      nextPath: onboardingPath,
    })
    const sanitized = sanitizeGeneratedAccessLinkWithDiagnostics({
      actionLink: magicLink,
      fallbackRedirectTo: redirectTo,
    })

    return {
      link: firstPartyConfirmLink ?? sanitized.link,
      authUserId: magicLinkResult.data?.user?.id ?? null,
      warning: null,
      diagnostics: sanitized.diagnostics,
    }
  }

  return {
    link: '',
    authUserId: null,
    warning: magicLinkResult.error?.message ?? 'Failed to generate owner access link.',
    diagnostics: {
      originalHost: null,
      originalPath: null,
      sanitizedHost: null,
      sanitizedPath: null,
      usedFallback: false,
      changed: false,
    },
  }
}

export async function generateOwnerPasswordSetupLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<OwnerAccessLinkResult> {
  const resetPath = '/reset-password?locked_email='
  const fallbackRedirectTo = buildLockedResetPasswordRedirect(email)
  const recoveryResult = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: fallbackRedirectTo },
  })

  const actionLink = recoveryResult.data?.properties?.action_link?.trim() ?? ''
  if (!recoveryResult.error && actionLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: recoveryResult.data?.properties?.hashed_token ?? null,
      verificationType: recoveryResult.data?.properties?.verification_type ?? 'recovery',
      nextPath: resetPath,
    })
    const sanitized = sanitizeGeneratedAccessLinkWithDiagnostics({
      actionLink,
      fallbackRedirectTo,
    })

    return {
      link: firstPartyConfirmLink ?? sanitized.link,
      authUserId: recoveryResult.data?.user?.id ?? null,
      warning: null,
      diagnostics: sanitized.diagnostics,
    }
  }

  return {
    link: '',
    authUserId: null,
    warning: recoveryResult.error?.message ?? 'Failed to generate password setup link.',
    diagnostics: {
      originalHost: null,
      originalPath: null,
      sanitizedHost: null,
      sanitizedPath: null,
      usedFallback: false,
      changed: false,
    },
  }
}
