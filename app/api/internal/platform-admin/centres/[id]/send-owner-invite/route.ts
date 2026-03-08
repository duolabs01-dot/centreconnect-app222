import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  assertInviteDomainHealth,
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  buildLockedResetPasswordRedirect,
  normalizeAppUrl,
  sanitizeGeneratedAccessLinkWithDiagnostics,
  type SanitizedAccessLinkDiagnostics,
} from '@/lib/auth/onboarding-links'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'
import { createWhatsappClickToChatLink, normalizeWhatsappPhone } from '@/lib/communications/whatsapp'
import { renderOwnerInviteEmail } from '@/lib/email/templates/owner-invite'
import { createNotificationEventKey, upsertNotificationLog } from '@/lib/admin/notification-logs'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { combineName, resolveFirstName, splitFullName } from '@/lib/utils/name'
import { syncAuthUserMetadataRole } from '@/lib/auth/provision-role'
import { revokeUserSessionsByUserId } from '@/lib/auth/revoke-user-sessions'

type SendOwnerInviteResponse = {
  ok: boolean
  eventKey: string
  email: { sent: boolean; error?: string | null }
  whatsapp: { sent: boolean; link?: string | null; error?: string | null }
  warning?: string
}

type ExistingProfileRow = {
  role?: string | null
  first_password_set_at?: string | null
}

function sanitizeName(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}

function appendWarning(existing: string | undefined, next: string | null | undefined) {
  const value = next?.trim()
  if (!value) return existing
  return existing ? `${existing} | ${value}` : value
}

const emailAppUrlRoot = normalizeAppUrl()
const DEFAULT_ONBOARDING_PATH = '/ecd/welcome?onboarding=1'

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data, error } = await admin
    .schema('auth')
    .from('users')
    .select('id,email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data?.id ?? null
}

async function revokeParentAccess(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { error } = await admin.from('parents').delete().eq('id', userId)
  if (error) return error.message
  return null
}

async function generateOwnerAccessLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  onboardingPath: string
) {
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
      warning: null as string | null,
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
    } as SanitizedAccessLinkDiagnostics,
  }
}

async function generateOwnerPasswordSetupLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const resetPath = `/reset-password?locked_email=${encodeURIComponent(email)}`
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
      warning: null as string | null,
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
    } as SanitizedAccessLinkDiagnostics,
  }
}

async function resolveAuthUserId(
  admin: ReturnType<typeof createAdminClient>,
  existingId: string | null,
  email: string
) {
  if (existingId) return existingId
  return (await findUserIdByEmail(admin, email)) ?? null
}

function buildTrackingUrl(input: {
  eventKey: string
  channel: 'email' | 'whatsapp'
  cta?: 'get_started' | 'welcome_pack' | 'qr_poster'
  target?: string | null
}) {
  const url = new URL('/api/invites/open', emailAppUrlRoot)
  url.searchParams.set('event_key', input.eventKey)
  url.searchParams.set('channel', input.channel)
  if (input.cta) url.searchParams.set('cta', input.cta)
  if (input.target) url.searchParams.set('target', input.target)
  return url.toString()
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  const { id: centreId } = await context.params
  if (!centreId) return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select(
      'id,name,slug,email,phone,contact_phone,primary_contact_name,primary_contact_first_name,primary_contact_surname,logo_url,suburb,city'
    )
    .eq('id', centreId)
    .maybeSingle()

  if (centreError) return NextResponse.json({ error: centreError.message }, { status: 400 })
  if (!centre) return NextResponse.json({ error: 'Centre not found' }, { status: 404 })

  const ownerEmail = String(centre.email ?? '').trim().toLowerCase()
  const ownerPhoneRaw = centre.contact_phone ?? centre.phone
  const ownerPhone = normalizeWhatsappPhone(ownerPhoneRaw)
  if (!ownerEmail) {
    return NextResponse.json({ error: 'Centre owner email is missing.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const eventKey = createNotificationEventKey('owner_invite', centre.id)
  const centreSlug = (centre.slug ?? '').trim()
  const splitPrimaryName = splitFullName(centre.primary_contact_name)
  const ownerFirstName = resolveFirstName({
    firstName: centre.primary_contact_first_name ?? splitPrimaryName.firstName,
    fullName: centre.primary_contact_name,
    email: ownerEmail,
    fallback: 'Friend',
  })
  const ownerSurname = (centre.primary_contact_surname ?? splitPrimaryName.surname ?? '').trim()
  const ownerDisplayName = combineName(ownerFirstName, ownerSurname) || ownerFirstName
  const locationLabel = [centre.suburb, centre.city]
    .map((value) => (value ?? '').trim())
    .filter(Boolean)
    .join(', ')

  const onboardingQuery = new URLSearchParams({
    onboarding: '1',
    name: ownerFirstName,
    centre: sanitizeName(centre.name, 'your centre'),
    location: locationLabel || 'your area',
  })
  if (centreSlug) {
    onboardingQuery.set('slug', centreSlug)
  }

  const onboardingPath = onboardingQuery.toString().length > 0
    ? `/ecd/welcome?${onboardingQuery.toString()}`
    : DEFAULT_ONBOARDING_PATH

  let resolvedAuthUserId = await findUserIdByEmail(admin, ownerEmail)
  const { data: existingProfile } = resolvedAuthUserId
    ? await admin
        .from('user_profiles')
        .select('role,first_password_set_at')
        .eq('id', resolvedAuthUserId)
        .maybeSingle()
    : { data: null as ExistingProfileRow | null }

  const previousRole = typeof existingProfile?.role === 'string' ? existingProfile.role : null
  const needsPasswordSetup = !existingProfile?.first_password_set_at

  let accessLink = needsPasswordSetup
    ? await generateOwnerPasswordSetupLink(admin, ownerEmail)
    : await generateOwnerAccessLink(admin, ownerEmail, onboardingPath)
  let primaryActionLabel = needsPasswordSetup ? 'Set password and open workspace' : 'Open my workspace'
  resolvedAuthUserId = await resolveAuthUserId(admin, accessLink.authUserId ?? resolvedAuthUserId, ownerEmail)

  if (!accessLink.link && needsPasswordSetup) {
    const fallbackAccessLink = await generateOwnerAccessLink(admin, ownerEmail, onboardingPath)
    if (fallbackAccessLink.link) {
      accessLink = fallbackAccessLink
      primaryActionLabel = 'Open my workspace'
      resolvedAuthUserId = await resolveAuthUserId(admin, fallbackAccessLink.authUserId ?? resolvedAuthUserId, ownerEmail)
    } else {
      accessLink.warning = appendWarning(accessLink.warning ?? undefined, fallbackAccessLink.warning) ?? null
    }
  }

  if (!accessLink.link) {
    return NextResponse.json({ error: accessLink.warning ?? 'Could not generate owner access link.' }, { status: 500 })
  }
  if (accessLink.diagnostics.changed || accessLink.diagnostics.usedFallback) {
    console.warn('send-owner-invite: onboarding link sanitized', accessLink.diagnostics)
  }

  const emailTrackingUrl = buildTrackingUrl({
    eventKey,
    channel: 'email',
    cta: 'get_started',
  })
  const supportWhatsapp = process.env.SUPPORT_WHATSAPP?.trim() || '+27685356430'
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || 'admin@centerconnect.co.za'
  const supportWhatsappMessage = [
    `Hi CentreConnect team, this is ${ownerFirstName} from ${sanitizeName(centre.name, 'my centre')}.`,
    'Please help me finish setup so we can start using CentreConnect properly.',
  ].join('\n')
  const supportWhatsappLink = createWhatsappClickToChatLink(supportWhatsapp, supportWhatsappMessage)
  const trackedSupportWhatsappLink = supportWhatsappLink
    ? buildTrackingUrl({
        eventKey,
        channel: 'whatsapp',
        target: supportWhatsappLink,
      })
    : null

  const inviteHtml = renderOwnerInviteEmail({
    centreName: sanitizeName(centre.name, 'your centre'),
    ownerName: ownerFirstName,
    claimUrl: emailTrackingUrl,
    dashboardUrl: `${emailAppUrlRoot}/ecd/login`,
    primaryActionLabel,
    whatsappChatLink: trackedSupportWhatsappLink,
    supportWhatsApp: supportWhatsapp,
    supportEmail,
    centreLogoUrl: centre.logo_url ?? null,
  })

  const emailResult = await deliverTransactionalEmail({
    to: ownerEmail,
    subject: inviteHtml.subject,
    html: inviteHtml.html,
  })
  await upsertNotificationLog(admin, {
    centreId: centre.id,
    eventKey,
    eventType: 'owner_invite',
    channel: 'email',
    recipient: ownerEmail,
    status: emailResult.status,
    provider: emailResult.directSent
      ? 'resend'
      : emailResult.queueSuccess
        ? 'email_queue'
        : 'resend',
    providerMessageId: emailResult.directSent
      ? emailResult.directMessageId
      : emailResult.queueMessageId,
    errorMessage: emailResult.status === 'sent' ? null : emailResult.deliveryMessage,
    payload: {
      subject: inviteHtml.subject,
      tracked_open_url: emailTrackingUrl,
      tracked_targets: {
        get_started: accessLink.link,
      },
      centre_slug: centre.slug,
      link_sanitization: accessLink.diagnostics,
      primary_action_label: primaryActionLabel,
    },
    createdAt: nowIso,
  })

  let combinedWarning: string | undefined = accessLink.warning ?? undefined
  if (resolvedAuthUserId) {
    const revokeSessionsResult = await revokeUserSessionsByUserId(admin, resolvedAuthUserId)
    if (!revokeSessionsResult.ok && revokeSessionsResult.warning) {
      combinedWarning = appendWarning(combinedWarning, revokeSessionsResult.warning)
    }
  }

  if (resolvedAuthUserId && previousRole === 'parent_user') {
    const parentAccessRevocationError = await revokeParentAccess(admin, resolvedAuthUserId)
    if (parentAccessRevocationError) {
      combinedWarning = appendWarning(
        combinedWarning,
        `Failed to revoke parent access: ${parentAccessRevocationError}`
      )
    }
  }

  const whatsappMessage = [
    `Hi ${ownerFirstName},`,
    `Your CentreConnect access is ready for ${sanitizeName(centre.name, 'your centre')}.`,
    `Start here: ${emailTrackingUrl}`,
    'If you have not set a password yet, this link will help you do that first.',
  ].join('\n')
  const whatsappLink = createWhatsappClickToChatLink(ownerPhone, whatsappMessage)
  const trackedOwnerWhatsappLink = whatsappLink
    ? buildTrackingUrl({
        eventKey,
        channel: 'whatsapp',
        target: whatsappLink,
      })
    : null

  let whatsappSent = false
  let whatsappError: string | null = null
  if (trackedOwnerWhatsappLink) {
    whatsappSent = true
    await upsertNotificationLog(admin, {
      centreId: centre.id,
      eventKey,
      eventType: 'owner_invite',
      channel: 'whatsapp',
      recipient: ownerPhone ?? supportWhatsapp,
      status: 'sent',
      provider: 'wa_me_link',
      payload: {
        tracked_open_url: trackedOwnerWhatsappLink,
        click_to_chat_url: trackedOwnerWhatsappLink,
        preview: whatsappMessage,
      },
      createdAt: nowIso,
    })
  } else {
    whatsappError = 'Owner phone is missing. WhatsApp click-to-chat link was not generated.'
    await upsertNotificationLog(admin, {
      centreId: centre.id,
      eventKey,
      eventType: 'owner_invite',
      channel: 'whatsapp',
      recipient: ownerPhone,
      status: 'failed',
      provider: 'wa_me_link',
      errorMessage: whatsappError,
      payload: {
        tracked_open_url: null,
      },
      createdAt: nowIso,
    })
  }

  const { error: invitationUpsertError } = await admin.from('ecd_admin_invitations').upsert(
    {
      ecd_id: centre.id,
      email: ownerEmail,
      role: 'ecd_admin',
      invited_by: identity.userId,
      invited_at: nowIso,
      auth_user_id: resolvedAuthUserId,
    },
    { onConflict: 'ecd_id,email' }
  )
  if (invitationUpsertError) {
    return NextResponse.json(
      { error: `Failed to record owner invitation: ${invitationUpsertError.message}` },
      { status: 500 }
    )
  }

  if (resolvedAuthUserId) {
    const { error: profileUpsertError } = await admin.from('user_profiles').upsert(
      {
        id: resolvedAuthUserId,
        role: 'ecd_admin',
        first_name: ownerFirstName,
        surname: ownerSurname || null,
        full_name: ownerDisplayName,
        phone: ownerPhoneRaw ?? null,
      },
      { onConflict: 'id' }
    )
    if (profileUpsertError) {
      return NextResponse.json(
        { error: `Failed to upsert owner profile: ${profileUpsertError.message}` },
        { status: 500 }
      )
    }

    const metadataSync = await syncAuthUserMetadataRole({
      adminClient: admin,
      userId: resolvedAuthUserId,
      role: 'ecd_admin',
    })
    if (!metadataSync.ok) {
      combinedWarning = appendWarning(
        combinedWarning,
        `Failed to sync auth metadata role: ${metadataSync.error}`
      )
    }

    const { error: membershipUpsertError } = await admin.from('ecd_admins').upsert(
      {
        ecd_id: centre.id,
        user_id: resolvedAuthUserId,
        role: 'ecd_admin',
        invited_by: identity.userId,
        invited_at: nowIso,
      },
      { onConflict: 'ecd_id,user_id' }
    )
    if (membershipUpsertError) {
      return NextResponse.json(
        { error: `Failed to link owner membership: ${membershipUpsertError.message}` },
        { status: 500 }
      )
    }

    const { error: ownerAssignError } = await admin
      .from('ecd_centres')
      .update({ owner_id: resolvedAuthUserId })
      .eq('id', centre.id)
      .is('owner_id', null)
    if (ownerAssignError) {
      return NextResponse.json(
        { error: `Failed to assign centre owner: ${ownerAssignError.message}` },
        { status: 500 }
      )
    }
  }

  await writePlatformActivity(admin, {
    actorUserId: identity.userId,
    actorEmail: identity.email,
    entityType: 'tenant',
    entityId: centre.id,
    action: 'send_owner_invite',
    summary: `Sent owner access email for ${centre.name ?? centre.id}`,
    details: {
      ownerEmail,
      ownerPhone,
      emailSent: emailResult.status === 'sent',
      whatsappSent,
      whatsappLink: trackedOwnerWhatsappLink,
      warning: combinedWarning,
      linkSanitization: accessLink.diagnostics,
      primaryActionLabel,
      needsPasswordSetup,
    },
  })

  void sendPlatformAdminActionNotification({
    subject: emailResult.status === 'sent' ? 'ECD owner invite resent' : 'ECD owner invite resend failed',
    heading: emailResult.status === 'sent'
      ? `Owner access email resent for ${centre.name ?? centre.id}.`
      : `Owner access email did not deliver for ${centre.name ?? centre.id}.`,
    lines: [
      `Centre: ${centre.name ?? centre.id}`,
      `Owner email: ${ownerEmail}`,
      `Password setup needed: ${needsPasswordSetup ? 'Yes' : 'No'}`,
    ],
    details: {
      centreId: centre.id,
      eventKey,
      whatsappReady: whatsappSent,
      primaryActionLabel,
      emailStatus: emailResult.status,
      emailError: emailResult.status === 'sent' ? '-' : emailResult.deliveryMessage,
      warning: combinedWarning ?? '-',
    },
  }).catch((error) => {
    console.error('[send-owner-invite] founder notification failed:', error)
  })

  const response: SendOwnerInviteResponse = {
    ok: emailResult.status === 'sent',
    eventKey,
    email: {
      sent: emailResult.status === 'sent',
      error: emailResult.status === 'sent' ? null : emailResult.deliveryMessage,
    },
    whatsapp: { sent: whatsappSent, link: trackedOwnerWhatsappLink, error: whatsappError },
    warning: combinedWarning ?? undefined,
  }

  return NextResponse.json(response, { status: emailResult.status === 'sent' ? 200 : 502 })
}


