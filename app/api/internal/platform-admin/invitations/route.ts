import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeInviteLog } from '@/lib/admin/invite-logs'
import { queueEmail } from '@/lib/communications/emails'
import { APP_URL, SUPPORT_EMAIL } from '@/lib/config'
import { renderStaffInviteEmail } from '@/lib/email/templates/staff-invite'
import { sendEmail } from '@/lib/email/send'
import { sendSmtpMail } from '@/lib/email/smtp'

const inviteSchema = z.object({
  ecdId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ecd_admin', 'ecd_staff']).default('ecd_admin'),
  fullName: z.string().min(2).max(160).optional(),
  redirectTo: z.string().url().optional(),
})

function fallbackFullName(email: string): string {
  const base = email.split('@')[0] || 'ECD Admin'
  return base.replace(/[._-]+/g, ' ').trim() || 'ECD Admin'
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

function normalizeAppUrl() {
  return APP_URL.replace(/\/$/, '')
}

function toDefaultRedirectTo() {
  const baseUrl = normalizeAppUrl()
  return `${baseUrl}/auth/callback?next=${encodeURIComponent('/ecd/dashboard')}`
}

function toPlainTextEmail(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
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

async function generateEcdAccessLink(input: {
  adminClient: ReturnType<typeof createAdminClient>
  email: string
  redirectTo: string
  preferMagicLink?: boolean
}) {
  const { adminClient, email, redirectTo, preferMagicLink = false } = input

  if (!preferMagicLink) {
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
        warning: null as string | null,
      }
    }
    if (inviteResult.error && !isEmailAlreadyRegisteredError(inviteResult.error.message)) {
      return {
        link: '',
        authUserId: null,
        mode: 'invite' as const,
        warning: inviteResult.error.message ?? 'Failed to generate invite link.',
      }
    }
  }

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
      warning: preferMagicLink ? null : 'Existing account detected. Sent secure sign-in link.',
    }
  }

  return {
    link: '',
    authUserId: null,
    mode: 'magiclink' as const,
    warning: magicResult.error?.message ?? 'Failed to generate access link.',
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

  const adminClient = createAdminClient()
  const data = parsed.data
  const normalizedEmail = data.email.trim().toLowerCase()

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

  const nowIso = new Date().toISOString()
  const redirectTo = data.redirectTo ?? toDefaultRedirectTo()
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
      return NextResponse.json({ error: inviteResult.error.message }, { status: 400 })
    }

    invitedUserId = await resolveExistingAuthUserId(adminClient, normalizedEmail)
    if (!invitedUserId) {
      pendingLinkOnNextLogin = true
    } else {
      linkedExistingUser = true
    }
  }

  const accessLinkResult = await generateEcdAccessLink({
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
  const parentAccessRevoked = previousRole === 'parent_user'

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
      return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 500 })
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
      return NextResponse.json(
        { error: `Failed to link admin to centre: ${adminLinkError.message}` },
        { status: 500 }
      )
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
    return NextResponse.json(
      { error: `Failed to record invitation: ${invitationLogError.message}` },
      { status: 500 }
    )
  }

  const accessLink = accessLinkResult.link || `${normalizeAppUrl()}/login`
  const inviteEmail = renderStaffInviteEmail({
    centreName: (centre.name ?? 'your centre').trim(),
    recipientName: fullName,
    role: data.role,
    accessLink,
    loginLink: `${normalizeAppUrl()}/login`,
    supportEmail: SUPPORT_EMAIL,
  })

  let directEmailSent = false
  let directEmailProvider: 'resend' | 'smtp' | null = null
  const directEmailErrors: string[] = []

  if (process.env.RESEND_API_KEY?.trim()) {
    const resendResult = await sendEmail({
      to: normalizedEmail,
      subject: inviteEmail.subject,
      html: inviteEmail.html,
    })
    if (resendResult.success) {
      directEmailSent = true
      directEmailProvider = 'resend'
    } else if (resendResult.error) {
      directEmailErrors.push(`Resend: ${resendResult.error}`)
    }
  }

  if (!directEmailSent) {
    const smtpResult = await sendSmtpMail({
      to: [normalizedEmail],
      subject: inviteEmail.subject,
      text: toPlainTextEmail(inviteEmail.html),
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

  const emailDeliveryStatus: 'sent' | 'queued' | 'failed' = directEmailSent
    ? 'sent'
    : emailQueueResult.success
      ? 'queued'
      : 'failed'
  const emailDeliveryMessage =
    emailDeliveryStatus === 'sent'
      ? `Invite email sent via ${directEmailProvider ?? 'direct provider'}.`
      : emailDeliveryStatus === 'queued'
        ? `Invite was queued but not delivered immediately. Configure RESEND_API_KEY or SMTP_* and run your email worker to deliver queued emails.`
        : `Invite email failed. ${directEmailErrors.length > 0 ? directEmailErrors.join(' | ') : ''}${
            emailQueueResult.success ? '' : ` Queue error: ${emailQueueResult.error ?? 'unknown'}`
          }`

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
  })

  return NextResponse.json({
    invitedEmail: normalizedEmail,
    role: data.role,
    ecdId: data.ecdId,
    userId: invitedUserId,
    linkedExistingUser,
    pendingLinkOnNextLogin,
    previousRole,
    parentAccessRevoked,
    inviteLinkMode: accessLinkResult.mode,
    accessLinkWarning: accessLinkResult.warning,
    directEmailSent,
    directEmailProvider,
    directEmailError: directEmailErrors.length > 0 ? directEmailErrors.join(' | ') : null,
    emailDeliveryStatus,
    emailDeliveryMessage,
    emailQueued: emailQueueResult.success,
    emailQueueSkipped: 'skipped' in emailQueueResult ? emailQueueResult.skipped : false,
    emailQueueError: emailQueueResult.success ? null : emailQueueResult.error,
  })
}
