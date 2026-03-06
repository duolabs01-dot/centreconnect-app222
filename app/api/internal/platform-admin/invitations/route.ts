import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeInviteLog } from '@/lib/admin/invite-logs'
import { queueEmail } from '@/lib/communications/emails'
import { SUPPORT_EMAIL } from '@/lib/config'
import { renderStaffInviteEmail } from '@/lib/email/templates/staff-invite'
import { sendEmail, shouldAttemptResendForRecipient } from '@/lib/email/send'
import { sendSmtpMail } from '@/lib/email/smtp'
import { createNotificationEventKey } from '@/lib/admin/notification-logs'
import {
  assertInviteDomainHealth,
  buildFirstPartyConfirmLink,
  buildDefaultEcdOnboardingRedirect,
  buildLockedResetPasswordRedirect,
  generateMagicFirstAccessLink,
  normalizeAppUrl,
  sanitizeGeneratedAccessLink,
} from '@/lib/auth/onboarding-links'
import { syncAuthUserMetadataRole } from '@/lib/auth/provision-role'
import { revokeUserSessionsByUserId } from '@/lib/auth/revoke-user-sessions'

const inviteSchema = z.object({
  ecdId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ecd_admin', 'ecd_supervisor', 'ecd_staff']).default('ecd_admin'),
  fullName: z.string().min(2).max(160).optional(),
  redirectTo: z.string().url().optional(),
})

function fallbackFullName(email: string): string {
  const base = email.split('@')[0] || 'ECD Admin'
  return base.replace(/[._-]+/g, ' ').trim() || 'ECD Admin'
}

function collectErrorPayload(value: unknown) {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, unknown> = {}
  for (const key of Object.getOwnPropertyNames(value)) {
    try {
      result[key] = (value as Record<string, unknown>)[key]
    } catch (error) {
      result[key] = error instanceof Error ? error.message : String(error)
    }
  }
  return result
}

function formatErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }
  if (value && typeof value === 'object') {
    const message = (value as Record<string, unknown>).message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim()
    }
    const serialized = JSON.stringify(collectErrorPayload(value))
    if (serialized && serialized !== '{}' && serialized !== '""') {
      return serialized
    }
  }
  return fallback
}

function isEmailAlreadyRegisteredError(message?: string | null) {
  const value = (message ?? '').toLowerCase()
  return value.includes('already been registered') || value.includes('already registered') || value.includes('already exists')
}

async function findAuthUserIdByEmail(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const { data, error } = await adminClient
    .schema('auth')
    .from('users')
    .select('id,email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data?.id ?? null
}

async function resolveExistingAuthUserId(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const directMatch = await findAuthUserIdByEmail(adminClient, email)
  if (directMatch) return directMatch

  const magicLinkResult = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const fromMagicLink = magicLinkResult.data?.user?.id ?? null
  if (!magicLinkResult.error && fromMagicLink) return fromMagicLink

  const usersResult = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (!usersResult.error) {
    const match = usersResult.data.users.find(
      (user) => String(user.email ?? '').trim().toLowerCase() === email
    )
    if (match?.id) return match.id
  }

  return null
}

async function revokeParentAccess(adminClient: ReturnType<typeof createAdminClient>, userId: string) {
  const { error } = await adminClient.from('parents').delete().eq('id', userId)
  if (error) return error.message
  return null
}

function toPlainTextEmail(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a[^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function generatePasswordSetupLink(input: {
  adminClient: ReturnType<typeof createAdminClient>
  email: string
}) {
  const { adminClient, email } = input
  const resetPath = `/reset-password?locked_email=${encodeURIComponent(email)}`
  const fallbackRedirect = buildLockedResetPasswordRedirect(email)
  const recoveryResult = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: fallbackRedirect },
  })
  const recoveryLink = recoveryResult.data?.properties?.action_link?.trim() ?? ''
  if (!recoveryResult.error && recoveryLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: recoveryResult.data?.properties?.hashed_token ?? null,
      verificationType: recoveryResult.data?.properties?.verification_type ?? 'recovery',
      nextPath: resetPath,
    })
    return {
      link:
        firstPartyConfirmLink ??
        sanitizeGeneratedAccessLink({
          actionLink: recoveryLink,
          fallbackRedirectTo: fallbackRedirect,
        }),
      warning: null as string | null,
    }
  }
  return {
    link: '',
    warning: recoveryResult.error?.message ?? 'Failed to generate password setup link.',
  }
}

export async function POST(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = inviteSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const inviteDomainHealth = assertInviteDomainHealth()
  if (!inviteDomainHealth.ok) {
    return NextResponse.json(
      {
        error: inviteDomainHealth.message,
        code: 'invite_domain_misconfigured',
        details: inviteDomainHealth.details,
      },
      { status: 412 }
    )
  }

  const adminClient = createAdminClient()
  const data = parsed.data
  const normalizedEmail = data.email.trim().toLowerCase()

  const { data: centre, error: centreError } = await adminClient
    .from('ecd_centres')
    .select('id,name')
    .eq('id', data.ecdId)
    .maybeSingle()

  if (centreError) {
    const message = formatErrorMessage(centreError, 'Failed to load centre record.')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json({ error: 'ECD centre not found' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const notificationEventKey = createNotificationEventKey('admin_access_invite', data.ecdId)
  const redirectTo = data.redirectTo ?? buildDefaultEcdOnboardingRedirect()
  const inviteResult = await adminClient.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: redirectTo || undefined,
      data: {
        role: data.role,
        ecd_id: data.ecdId,
      },
    }
  )

  let invitedUserId = inviteResult.data.user?.id ?? null
  let linkedExistingUser = false
  let pendingLinkOnNextLogin = false

  if (inviteResult.error) {
    if (!isEmailAlreadyRegisteredError(inviteResult.error.message)) {
      const message = formatErrorMessage(inviteResult.error, 'Failed to send admin invite.')
      return NextResponse.json({ error: message }, { status: 400 })
    }

    invitedUserId = await resolveExistingAuthUserId(adminClient, normalizedEmail)
    if (!invitedUserId) {
      pendingLinkOnNextLogin = true
    } else {
      linkedExistingUser = true
    }
  }

  const accessLinkResult = await generateMagicFirstAccessLink({
    adminClient,
    email: normalizedEmail,
    redirectTo,
    preferMagicLink: linkedExistingUser || pendingLinkOnNextLogin,
  })

  if (!invitedUserId && accessLinkResult.authUserId) {
    invitedUserId = accessLinkResult.authUserId
    if (pendingLinkOnNextLogin) {
      linkedExistingUser = true
      pendingLinkOnNextLogin = false
    }
  }

  const { data: existingProfile } = invitedUserId
    ? await adminClient
        .from('user_profiles')
        .select('id,role,full_name,phone')
        .eq('id', invitedUserId)
        .maybeSingle()
    : { data: null as { id: string; role: string | null; full_name?: string | null; phone?: string | null } | null }

  if (existingProfile?.role === 'platform_admin') {
    return NextResponse.json(
      { error: 'Platform admin accounts cannot be reassigned via staff invite flow.' },
      { status: 409 }
    )
  }

  const fullName =
    data.fullName?.trim() ||
    (typeof existingProfile?.full_name === 'string' ? existingProfile.full_name.trim() : '') ||
    fallbackFullName(normalizedEmail)
  const previousRole = typeof existingProfile?.role === 'string' ? existingProfile.role : null
  let parentAccessRevoked = false
  let parentAccessRevocationError: string | null = null
  let sessionRevocationWarning: string | null = null

  if (invitedUserId) {
    const { error: profileError } = await adminClient.from('user_profiles').upsert(
      {
        id: invitedUserId,
        role: data.role,
        full_name: fullName,
        phone: existingProfile?.phone ?? null,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      const message = formatErrorMessage(profileError, 'Failed to create profile.')
      return NextResponse.json({ error: `Failed to create profile: ${message}` }, { status: 500 })
    }

    const metadataSync = await syncAuthUserMetadataRole({
      adminClient,
      userId: invitedUserId,
      role: data.role,
    })
    if (!metadataSync.ok) {
      console.warn('[platform-admin/invitations] Failed to sync auth metadata role:', metadataSync.error)
    }

    const { error: adminLinkError } = await adminClient.from('ecd_admins').upsert(
      {
        ecd_id: data.ecdId,
        user_id: invitedUserId,
        role: data.role,
        invited_by: platformAdmin.userId,
        invited_at: nowIso,
        ...(linkedExistingUser ? { accepted_at: nowIso } : {}),
      },
      { onConflict: 'ecd_id,user_id' }
    )

    if (adminLinkError) {
      const message = formatErrorMessage(adminLinkError, 'Failed to link admin to centre.')
      return NextResponse.json(
        { error: `Failed to link admin to centre: ${message}` },
        { status: 500 }
      )
    }

    if (previousRole === 'parent_user') {
      parentAccessRevocationError = await revokeParentAccess(adminClient, invitedUserId)
      parentAccessRevoked = !parentAccessRevocationError
    }

    if (linkedExistingUser) {
      const revokeSessionsResult = await revokeUserSessionsByUserId(adminClient, invitedUserId)
      if (!revokeSessionsResult.ok) {
        sessionRevocationWarning = revokeSessionsResult.warning ?? 'Could not revoke existing sessions.'
      }
    }
  }

  const { error: invitationLogError } = await adminClient.from('ecd_admin_invitations').upsert(
    {
      ecd_id: data.ecdId,
      email: normalizedEmail,
      role: data.role,
      invited_by: platformAdmin.userId,
      auth_user_id: invitedUserId,
      invited_at: nowIso,
      ...(linkedExistingUser ? { accepted_at: nowIso } : {}),
    },
    { onConflict: 'ecd_id,email' }
  )
  if (invitationLogError) {
    const message = formatErrorMessage(invitationLogError, 'Failed to record invitation.')
    return NextResponse.json(
      { error: `Failed to record invitation: ${message}` },
      { status: 500 }
    )
  }

  if (!accessLinkResult.link) {
    return NextResponse.json(
      {
        error: `Could not generate secure access link for ${normalizedEmail}. ${accessLinkResult.warning ?? ''}`.trim(),
        inviteLinkMode: accessLinkResult.mode,
        accessLinkWarning: accessLinkResult.warning,
      },
      { status: 500 }
    )
  }

  const baseAppUrl = normalizeAppUrl()
  const accessLink = accessLinkResult.link
  const passwordSetupResult = await generatePasswordSetupLink({
    adminClient,
    email: normalizedEmail,
  })
  const inviteEmail = renderStaffInviteEmail({
    centreName: (centre.name ?? 'your centre').trim(),
    recipientName: fullName,
    role: data.role,
    accessLink,
    loginLink: `${baseAppUrl}/login`,
    supportEmail: SUPPORT_EMAIL,
    passwordSetupLink: passwordSetupResult.link || null,
    accessMode: accessLinkResult.mode,
    logoUrl: `${baseAppUrl}/centreconnect-logo.svg`,
    appBaseUrl: baseAppUrl,
  })

  let directEmailSent = false
  let directEmailProvider: 'resend' | 'smtp' | null = null
  let directEmailMessageId: string | null = null
  const directEmailErrors: string[] = []
  const directEmailNotes: string[] = []

  const resendEligibility = shouldAttemptResendForRecipient(normalizedEmail)
  if (resendEligibility.allowed) {
    const resendResult = await sendEmail({
      to: normalizedEmail,
      subject: inviteEmail.subject,
      html: inviteEmail.html,
    })
    if (resendResult.success) {
      directEmailSent = true
      directEmailProvider = 'resend'
      directEmailMessageId = resendResult.messageId ?? null
    } else if (resendResult.error) {
      directEmailErrors.push(`Resend: ${resendResult.error}`)
    }
  } else if (resendEligibility.reason) {
    directEmailNotes.push(`Resend skipped: ${resendEligibility.reason}`)
  }

  if (!directEmailSent) {
    const smtpResult = await sendSmtpMail({
      to: [normalizedEmail],
      subject: inviteEmail.subject,
      text: toPlainTextEmail(inviteEmail.html),
      html: inviteEmail.html,
    })
    if (smtpResult.ok) {
      directEmailSent = true
      directEmailProvider = 'smtp'
    } else if (smtpResult.error) {
      directEmailErrors.push(`SMTP: ${smtpResult.error}`)
    }
  }

  const emailQueueResult = directEmailSent
    ? { success: true as const, skipped: true as const }
    : await queueEmail(normalizedEmail, inviteEmail.subject, inviteEmail.html)

  const emailDeliveryStatus: 'queued' | 'sent' | 'failed' = directEmailSent
    ? 'sent'
    : emailQueueResult.success
      ? 'queued'
      : 'failed'
  const emailDiagnostics = [...directEmailNotes, ...directEmailErrors].join(' | ')
  const emailDeliveryMessage =
    emailDeliveryStatus === 'sent'
      ? `Invite email sent via ${directEmailProvider ?? 'direct provider'}.`
      : emailDeliveryStatus === 'queued'
        ? `Invite email queued for delivery. ${
            emailDiagnostics.length > 0 ? emailDiagnostics : 'Direct email provider not available.'
          }`
        : `Invite email was NOT delivered. ${
          emailDiagnostics.length > 0 ? emailDiagnostics : 'No direct email provider succeeded.'
        }${
          emailQueueResult.success
            ? ' A queue fallback was created, but that does not confirm delivery.'
            : ` Queue error: ${emailQueueResult.error ?? 'unknown'}`
        }`

  const queuedMessageId =
    !directEmailSent &&
    emailQueueResult.success &&
    'data' in emailQueueResult &&
    Array.isArray(emailQueueResult.data)
      ? String((emailQueueResult.data[0] as { id?: string } | undefined)?.id ?? '').trim() || null
      : null

  await writeInviteLog(adminClient, {
    centreId: data.ecdId,
    ownerEmail: normalizedEmail,
    inviteType: 'email',
    status: linkedExistingUser ? 'claimed' : 'sent',
    notes: linkedExistingUser
      ? `Linked existing account to ECD access (${data.role})`
      : pendingLinkOnNextLogin
        ? `Existing email invite recorded (${data.role}); link will finalize on next login`
        : directEmailSent
          ? `ECD access invite (${data.role}) delivered via ${directEmailProvider}`
          : `ECD access invite (${data.role})${emailQueueResult.success ? ' queued for delivery' : ' (delivery queue failed)'}`,
    notificationEventKey,
    notificationStatus: emailDeliveryStatus,
    notificationProvider: directEmailSent
      ? directEmailProvider === 'resend'
        ? 'resend'
        : 'smtp'
      : 'email_queue',
    notificationProviderMessageId: directEmailSent ? directEmailMessageId : queuedMessageId,
    notificationPayload: {
      invite_role: data.role,
      direct_provider: directEmailProvider,
      direct_email_sent: directEmailSent,
      queued_fallback: !directEmailSent && emailQueueResult.success,
    },
    notificationErrorMessage: emailDeliveryStatus === 'failed' ? emailDeliveryMessage : null,
  })

  const responsePayload = {
    invitedEmail: normalizedEmail,
    role: data.role,
    ecdId: data.ecdId,
    userId: invitedUserId,
    linkedExistingUser,
    pendingLinkOnNextLogin,
    previousRole,
    parentAccessRevoked,
    parentAccessRevocationError,
    sessionRevocationWarning,
    inviteLinkMode: accessLinkResult.mode,
    accessLinkWarning: accessLinkResult.warning,
    manualAccessLink: accessLink,
    passwordSetupLinkGenerated: Boolean(passwordSetupResult.link),
    manualPasswordSetupLink: passwordSetupResult.link || null,
    passwordSetupWarning: passwordSetupResult.warning,
    directEmailSent,
    directEmailProvider,
    directEmailError: directEmailErrors.length > 0 ? directEmailErrors.join(' | ') : null,
    directEmailNotes: directEmailNotes.length > 0 ? directEmailNotes.join(' | ') : null,
    emailDeliveryStatus,
    emailDeliveryMessage,
    emailQueued: emailQueueResult.success,
    emailQueueSkipped: 'skipped' in emailQueueResult ? emailQueueResult.skipped : false,
    emailQueueError: emailQueueResult.success ? null : emailQueueResult.error,
  }

  if (!directEmailSent) {
    return NextResponse.json(
      {
        ...responsePayload,
        error: emailDeliveryMessage,
      },
      { status: emailQueueResult.success ? 502 : 500 }
    )
  }

  return NextResponse.json(responsePayload)
}
