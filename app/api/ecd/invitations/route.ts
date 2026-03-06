import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeInviteLog } from '@/lib/admin/invite-logs'
import { queueEmail } from '@/lib/communications/emails'
import { SUPPORT_EMAIL } from '@/lib/config'
import { renderStaffInviteEmail } from '@/lib/email/templates/staff-invite'
import { sendEmail, shouldAttemptResendForRecipient } from '@/lib/email/send'
import { sendSmtpMail } from '@/lib/email/smtp'
import { createNotificationEventKey } from '@/lib/admin/notification-logs'
import {
  buildFirstPartyConfirmLink,
  buildDefaultEcdOnboardingRedirect,
  buildLockedResetPasswordRedirect,
  generateMagicFirstAccessLink,
  normalizeAppUrl,
  sanitizeGeneratedAccessLink,
} from '@/lib/auth/onboarding-links'
import { syncAuthUserMetadataRole } from '@/lib/auth/provision-role'

const inviteSchema = z.object({
  ecdId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ecd_admin', 'ecd_supervisor', 'ecd_staff']).default('ecd_staff'),
  fullName: z.string().min(2).max(160).optional(),
  redirectTo: z.string().url().optional(),
})

function fallbackFullName(email: string): string {
  const base = email.split('@')[0] || 'ECD Team Member'
  return base.replace(/[._-]+/g, ' ').trim() || 'ECD Team Member'
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
    const serialized = JSON.stringify(value)
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
  const payload = await request.json().catch(() => null)
  const parsed = inviteSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const normalizedEmail = data.email.trim().toLowerCase()
  const nowIso = new Date().toISOString()
  const notificationEventKey = createNotificationEventKey('admin_access_invite', data.ecdId)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const { data: membership, error: membershipError } = await adminClient
    .from('ecd_admins')
    .select('role')
    .eq('ecd_id', data.ecdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 })
  }
  if (!membership || membership.role !== 'ecd_admin') {
    return NextResponse.json({ error: 'Only ECD admins can invite team members.' }, { status: 403 })
  }

  const { data: centre, error: centreError } = await adminClient
    .from('ecd_centres')
    .select('id,name')
    .eq('id', data.ecdId)
    .maybeSingle()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }
  if (!centre) {
    return NextResponse.json({ error: 'ECD centre not found' }, { status: 404 })
  }

  const redirectTo = data.redirectTo ?? buildDefaultEcdOnboardingRedirect()
  const inviteResult = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: redirectTo || undefined,
    data: {
      role: data.role,
      ecd_id: data.ecdId,
    },
  })

  let invitedUserId = inviteResult.data.user?.id ?? null
  let linkedExistingUser = false
  let pendingLinkOnNextLogin = false

  if (inviteResult.error) {
    if (!isEmailAlreadyRegisteredError(inviteResult.error.message)) {
      const message = formatErrorMessage(inviteResult.error, 'Failed to send team invite.')
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
      const message = formatErrorMessage(profileError, 'Failed to update profile.')
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const metadataSync = await syncAuthUserMetadataRole({
      adminClient,
      userId: invitedUserId,
      role: data.role,
    })
    if (!metadataSync.ok) {
      console.warn('[ecd/invitations] Failed to sync auth metadata role:', metadataSync.error)
    }

    const { error: adminLinkError } = await adminClient.from('ecd_admins').upsert(
      {
        ecd_id: data.ecdId,
        user_id: invitedUserId,
        role: data.role,
        invited_by: user.id,
        invited_at: nowIso,
        ...(linkedExistingUser ? { accepted_at: nowIso } : {}),
      },
      { onConflict: 'ecd_id,user_id' }
    )
    if (adminLinkError) {
      const message = formatErrorMessage(adminLinkError, 'Failed to link member to centre.')
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (previousRole === 'parent_user') {
      parentAccessRevocationError = await revokeParentAccess(adminClient, invitedUserId)
      parentAccessRevoked = !parentAccessRevocationError
    }
  }

  const { error: invitationLogError } = await adminClient.from('ecd_admin_invitations').upsert(
    {
      ecd_id: data.ecdId,
      email: normalizedEmail,
      role: data.role,
      invited_by: user.id,
      auth_user_id: invitedUserId,
      invited_at: nowIso,
      ...(linkedExistingUser ? { accepted_at: nowIso } : {}),
    },
    { onConflict: 'ecd_id,email' }
  )

  if (invitationLogError) {
    const message = formatErrorMessage(invitationLogError, 'Failed to record invitation.')
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (!accessLinkResult.link) {
    return NextResponse.json(
      {
        error: `Could not generate secure access link for ${normalizedEmail}. ${accessLinkResult.warning ?? ''}`.trim(),
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
    notificationErrorMessage:
      emailDeliveryStatus === 'failed'
        ? [...directEmailNotes, ...directEmailErrors].join(' | ') || 'Email delivery failed.'
        : null,
  })

  if (!directEmailSent) {
    const emailDiagnostics = [...directEmailNotes, ...directEmailErrors].join(' | ')
    const queueMessage = emailQueueResult.success
      ? 'Invite queued for delivery, but direct SMTP/Resend delivery failed.'
      : `Invite delivery failed. ${emailDiagnostics}`
    return NextResponse.json(
      {
        error: queueMessage,
        directEmailErrors,
        directEmailNotes,
        emailQueueError: emailQueueResult.success ? null : emailQueueResult.error,
      },
      { status: emailQueueResult.success ? 502 : 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    ecdId: data.ecdId,
    role: data.role,
    invitedEmail: normalizedEmail,
    userId: invitedUserId,
    linkedExistingUser,
    pendingLinkOnNextLogin,
    previousRole,
    parentAccessRevoked,
    parentAccessRevocationError,
    inviteLinkMode: accessLinkResult.mode,
    accessLinkWarning: accessLinkResult.warning,
    passwordSetupLinkGenerated: Boolean(passwordSetupResult.link),
    passwordSetupWarning: passwordSetupResult.warning,
    directEmailProvider,
    emailQueued: emailQueueResult.success,
  })
}
