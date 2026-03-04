import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { EMAIL_APP_URL } from '@/lib/config'
import { queueEmail } from '@/lib/communications/emails'
import { createWhatsappClickToChatLink, normalizeWhatsappPhone } from '@/lib/communications/whatsapp'
import { renderOwnerInviteEmail } from '@/lib/email/templates/owner-invite'
import { renderPilotWelcomePackEmail } from '@/lib/email/templates/pilot-welcome-pack'
import { createNotificationEventKey, upsertNotificationLog } from '@/lib/admin/notification-logs'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { writeInviteLog } from '@/lib/admin/invite-logs'

type SendOwnerInviteResponse = {
  ok: boolean
  eventKey: string
  email: { sent: boolean; error?: string | null }
  whatsapp: { sent: boolean; link?: string | null; error?: string | null }
  warning?: string
}

function isEmailAlreadyRegisteredError(message?: string | null) {
  const value = (message ?? '').toLowerCase()
  return value.includes('already been registered') || value.includes('already exists')
}

function sanitizeName(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}

const emailAppUrlRoot = EMAIL_APP_URL.replace(/\/$/, '')

async function generateOwnerAccessLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const redirectTo = `${emailAppUrlRoot}/auth/callback?next=${encodeURIComponent('/ecd/dashboard')}`
  const inviteResult = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  const inviteLink = inviteResult.data?.properties?.action_link?.trim() ?? ''
  if (!inviteResult.error && inviteLink) {
    return {
      link: inviteLink,
      authUserId: inviteResult.data?.user?.id ?? null,
      warning: null as string | null,
    }
  }

  if (!isEmailAlreadyRegisteredError(inviteResult.error?.message)) {
    return {
      link: '',
      authUserId: null,
      warning: inviteResult.error?.message ?? 'Failed to generate owner invite link.',
    }
  }

  const recoveryResult = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })
  const recoveryLink = recoveryResult.data?.properties?.action_link?.trim() ?? ''
  if (!recoveryResult.error && recoveryLink) {
    return {
      link: recoveryLink,
      authUserId: recoveryResult.data?.user?.id ?? inviteResult.data?.user?.id ?? null,
      warning: null,
    }
  }

  const magicResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  const magicLink = magicResult.data?.properties?.action_link?.trim() ?? ''
  if (!magicResult.error && magicLink) {
    return {
      link: magicLink,
      authUserId: magicResult.data?.user?.id ?? null,
      warning: 'Owner already had an account. Sent a secure login link instead of a first-time invite.',
    }
  }

  return {
    link: '',
    authUserId: null,
    warning: magicResult.error?.message ?? 'Failed to generate owner login link.',
  }
}

function buildTrackingUrl(eventKey: string, channel: 'email' | 'whatsapp', target: string) {
  const url = new URL('/api/invites/open', emailAppUrlRoot)
  url.searchParams.set('event_key', eventKey)
  url.searchParams.set('channel', channel)
  url.searchParams.set('target', target)
  return url.toString()
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: centreId } = await context.params
  if (!centreId) return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select('id,name,slug,email,phone,contact_phone,primary_contact_name')
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

  const accessLink = await generateOwnerAccessLink(admin, ownerEmail)
  if (!accessLink.link) {
    return NextResponse.json({ error: accessLink.warning ?? 'Could not generate owner access link.' }, { status: 500 })
  }

  const nowIso = new Date().toISOString()
  const eventKey = createNotificationEventKey('owner_invite', centre.id)
  const ownerName = sanitizeName(centre.primary_contact_name, 'ECD Admin')
  const emailTrackingUrl = buildTrackingUrl(eventKey, 'email', accessLink.link)
  const supportWhatsapp = process.env.SUPPORT_WHATSAPP?.trim() || '+27685356430'
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || 'admin@centerconnect.co.za'
  const supportWhatsappMessage = [
    `Hi CentreConnect team, this is ${ownerName} from ${sanitizeName(centre.name, 'my centre')}.`,
    'Please help me complete setup so we can start receiving applications.',
  ].join('\n')
  const supportWhatsappLink = createWhatsappClickToChatLink(supportWhatsapp, supportWhatsappMessage)
  const trackedSupportWhatsappLink = supportWhatsappLink
    ? buildTrackingUrl(eventKey, 'whatsapp', supportWhatsappLink)
    : null

  const inviteHtml = renderOwnerInviteEmail({
    centreName: sanitizeName(centre.name, 'your centre'),
    ownerName,
    claimUrl: emailTrackingUrl,
    dashboardUrl: `${emailAppUrlRoot}/ecd/dashboard`,
    whatsappChatLink: trackedSupportWhatsappLink,
    supportWhatsApp: supportWhatsapp,
    supportEmail,
  })

  const emailResult = await queueEmail(ownerEmail, inviteHtml.subject, inviteHtml.html)
  await upsertNotificationLog(admin, {
    centreId: centre.id,
    eventKey,
    eventType: 'owner_invite',
    channel: 'email',
    recipient: ownerEmail,
    status: emailResult.success ? 'sent' : 'failed',
    provider: 'email_queue',
    providerMessageId:
      emailResult.success && Array.isArray(emailResult.data)
        ? String(emailResult.data[0]?.id ?? '')
        : null,
    errorMessage: emailResult.success ? null : emailResult.error,
    payload: {
      subject: inviteHtml.subject,
      tracked_open_url: emailTrackingUrl,
      centre_slug: centre.slug,
    },
    createdAt: nowIso,
  })

  const pilotWelcomeGuideUrl = `${emailAppUrlRoot}/pilot/welcome-pack`
  const welcomePackHtml = await renderPilotWelcomePackEmail({
    centreName: sanitizeName(centre.name, 'your centre'),
    contactName: ownerName,
    dashboardLink: `${emailAppUrlRoot}/ecd/dashboard`,
    websiteBuilderLink: `${emailAppUrlRoot}/ecd/website`,
    attendanceLink: `${emailAppUrlRoot}/ecd/attendance`,
    pickupLink: `${emailAppUrlRoot}/ecd/pickup`,
    qrPosterLink: `${emailAppUrlRoot}/ecd/pickup`,
    supportWhatsApp: supportWhatsapp,
    supportEmail,
    supportLink: `${emailAppUrlRoot}/ecd/support`,
    welcomeGuideLink: pilotWelcomeGuideUrl,
    packageLabel: 'Pilot package',
  })
  const welcomePackResult = await queueEmail(
    ownerEmail,
    `Pilot Welcome Pack | ${sanitizeName(centre.name, 'CentreConnect')}`,
    welcomePackHtml
  )
  let combinedWarning: string | undefined = accessLink.warning ?? undefined
  if (!welcomePackResult.success) {
    combinedWarning = combinedWarning ?? welcomePackResult.error ?? 'Failed to queue pilot welcome pack email.'
  } else {
    await writeInviteLog(admin, {
      centreId: centre.id,
      ownerEmail,
      ownerPhone: ownerPhoneRaw ?? null,
      inviteType: 'welcome_pack',
      status: 'sent',
      notes: 'Pilot welcome pack queued with owner invite.',
    })
  }

  const whatsappMessage = [
    `Hi ${ownerName},`,
    `${sanitizeName(centre.name, 'Your centre')} is live on CentreConnect.`,
    `Start now and claim your workspace: ${emailTrackingUrl}`,
    'Parents can already discover your profile, so keep details updated to receive applications quickly.',
  ].join('\n')
  const whatsappLink = createWhatsappClickToChatLink(ownerPhone, whatsappMessage)
  const trackedOwnerWhatsappLink = whatsappLink
    ? buildTrackingUrl(eventKey, 'whatsapp', whatsappLink)
    : null

  let whatsappSent = false
  let whatsappError: string | null = null
  if (trackedOwnerWhatsappLink || trackedSupportWhatsappLink) {
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
        tracked_open_url: trackedSupportWhatsappLink,
        click_to_chat_url: trackedSupportWhatsappLink,
        owner_click_to_chat_url: trackedOwnerWhatsappLink,
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

  await admin.from('ecd_admin_invitations').upsert(
    {
      ecd_id: centre.id,
      email: ownerEmail,
      role: 'ecd_admin',
      invited_by: identity.userId,
      invited_at: nowIso,
      auth_user_id: accessLink.authUserId,
    },
    { onConflict: 'ecd_id,email' }
  )

  if (accessLink.authUserId) {
    await admin.from('user_profiles').upsert(
      {
        id: accessLink.authUserId,
        role: 'ecd_admin',
        full_name: ownerName,
        email: ownerEmail,
        phone: ownerPhoneRaw ?? null,
      },
      { onConflict: 'id' }
    )
    await admin.from('ecd_admins').upsert(
      {
        ecd_id: centre.id,
        user_id: accessLink.authUserId,
        role: 'ecd_admin',
        invited_by: identity.userId,
        invited_at: nowIso,
      },
      { onConflict: 'ecd_id,user_id' }
    )
    await admin
      .from('ecd_centres')
      .update({ owner_id: accessLink.authUserId })
      .eq('id', centre.id)
      .is('owner_id', null)
  }

  await writePlatformActivity(admin, {
    actorUserId: identity.userId,
    actorEmail: identity.email,
    entityType: 'tenant',
    entityId: centre.id,
    action: 'send_owner_invite',
    summary: `Sent owner invite for ${centre.name ?? centre.id}`,
    details: {
      ownerEmail,
      ownerPhone,
      emailSent: emailResult.success,
      whatsappSent,
      whatsappLink: trackedOwnerWhatsappLink,
      warning: combinedWarning,
    },
  })

  const response: SendOwnerInviteResponse = {
    ok: true,
    eventKey,
    email: { sent: emailResult.success, error: emailResult.success ? null : emailResult.error },
    whatsapp: { sent: whatsappSent, link: trackedOwnerWhatsappLink, error: whatsappError },
    warning: combinedWarning ?? undefined,
  }

  return NextResponse.json(response, { status: 200 })
}
