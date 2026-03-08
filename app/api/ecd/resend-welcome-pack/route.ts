import { NextResponse } from 'next/server'

import {
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  normalizeAppUrl,
  sanitizeGeneratedAccessLinkWithDiagnostics,
} from '@/lib/auth/onboarding-links'
import { createNotificationEventKey, upsertNotificationLog } from '@/lib/admin/notification-logs'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { renderPilotWelcomePackEmail } from '@/lib/email/templates/pilot-welcome-pack'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveFirstName, splitFullName } from '@/lib/utils/name'
import { getPublicPlanLabel, toPublicPlan } from '@/lib/billing/plans'

type Payload = {
  ecdId?: string
  ownerEmail?: string
}

function friendlyNameFromEmail(email: string, fallback: string) {
  const local = email.split('@')[0] ?? ''
  const normalized = local.replace(/[._-]+/g, ' ').trim()
  return normalized.length >= 2 ? normalized : fallback
}

function buildUrl(root: string, pathname: string, query?: Record<string, string>) {
  const url = new URL(pathname, `${root.replace(/\/+$/, '')}/`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value)
      }
    }
  }
  return url.toString()
}

export async function POST(request: Request) {
  let payload: Payload
  try {
    payload = await request.json()
  } catch (error) {
    console.error('resend-welcome-pack: unable to parse JSON', error)
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ecdId, ownerEmail } = payload ?? {}
  if (!ecdId) {
    return NextResponse.json({ success: false, error: 'ecdId is required' }, { status: 400 })
  }
  if (!ownerEmail) {
    return NextResponse.json({ success: false, error: 'ownerEmail is required' }, { status: 400 })
  }

  const appUrlRoot = normalizeAppUrl()
  const admin = createAdminClient()
  const eventKey = createNotificationEventKey('welcome_pack', ecdId)
  const toTrackedCtaLink = (cta: 'get_started' | 'welcome_pack' | 'qr_poster') =>
    buildUrl(appUrlRoot, '/api/invites/open', {
      event_key: eventKey,
      channel: 'email',
      cta,
    })

  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select(
      'name,slug,primary_contact_name,primary_contact_first_name,city,suburb,logo_url,cover_image_url,subscriptions(tier,status,monthly_price)'
    )
    .eq('id', ecdId)
    .single()

  if (centreError || !centre) {
    console.error('resend-welcome-pack: centre lookup failed', centreError)
    return NextResponse.json({ success: false, error: 'ECD centre not found' }, { status: 404 })
  }

  const centreName = centre.name?.trim() || 'CentreConnect'
  const centreSlug = centre.slug?.trim() ?? ''
  const centreSubscription = Array.isArray(centre.subscriptions)
    ? centre.subscriptions[0] ?? null
    : centre.subscriptions
  const packagePlan = toPublicPlan(centreSubscription?.tier ?? 'growth', 'growth')
  const packageLabel = getPublicPlanLabel(packagePlan)
  const locationParts = [centre.suburb, centre.city].map((part) => part?.trim()).filter(Boolean)
  const location = locationParts.length ? locationParts.join(', ') : 'your area'

  const ownerNameFallback = friendlyNameFromEmail(ownerEmail, 'Centre Owner')
  let ownerFirstName: string | null = null
  let ownerFullName: string | null = null

  const { data: ownerUser, error: ownerUserError } = await admin
    .schema('auth')
    .from('users')
    .select('id')
    .eq('email', ownerEmail.toLowerCase())
    .maybeSingle()

  if (!ownerUserError && ownerUser?.id) {
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('first_name,full_name')
      .eq('id', ownerUser.id)
      .maybeSingle()

    if (!profileError && profile) {
      ownerFirstName = profile.first_name ?? null
      ownerFullName = profile.full_name ?? null
    }
  }

  const centreFallbackNames = splitFullName(centre.primary_contact_name)
  const fallbackFirstName = centre.primary_contact_first_name?.trim() || centreFallbackNames.firstName
  const ownerFirstNameForComms = resolveFirstName({
    firstName: ownerFirstName ?? fallbackFirstName,
    fullName: ownerFullName ?? centre.primary_contact_name,
    email: ownerEmail,
    fallback: ownerNameFallback,
  })

  const [childrenCountResult, attendanceCountResult, pickupCountResult] = await Promise.all([
    admin.from('children').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId),
    admin.from('attendance').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId),
    admin.from('pickup_codes').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId),
  ])

  const hasChildren = (childrenCountResult.count ?? 0) > 0
  const hasAttendance = (attendanceCountResult.count ?? 0) > 0
  const hasPickup = (pickupCountResult.count ?? 0) > 0
  const hasLogo = Boolean(centre.logo_url?.trim())
  const hasHero = Boolean(centre.cover_image_url?.trim())

  const welcomeQuery = new URLSearchParams({
    name: ownerFirstNameForComms,
    centre: centreName,
    location,
    slug: centreSlug,
    package: packagePlan,
    onboarding: '1',
    email: ownerEmail.toLowerCase(),
  }).toString()
  const welcomeNextPath = `/ecd/welcome?${welcomeQuery}`
  const callbackRedirectUrl = buildAuthCallbackRedirect(welcomeNextPath)
  let getStartedUrl = callbackRedirectUrl

  const magicLinkResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail.toLowerCase(),
    options: {
      redirectTo: callbackRedirectUrl,
    },
  })
  const magicActionLink = magicLinkResult.data?.properties?.action_link?.trim() ?? ''
  if (!magicLinkResult.error && magicActionLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: magicLinkResult.data?.properties?.hashed_token ?? null,
      verificationType: magicLinkResult.data?.properties?.verification_type ?? 'magiclink',
      nextPath: welcomeNextPath,
    })

    const sanitizedTarget = sanitizeGeneratedAccessLinkWithDiagnostics({
      actionLink: magicActionLink,
      fallbackRedirectTo: callbackRedirectUrl,
    })
    const safeTargetLink = firstPartyConfirmLink ?? sanitizedTarget.link
    getStartedUrl = safeTargetLink
    if (sanitizedTarget.diagnostics.changed || sanitizedTarget.diagnostics.usedFallback) {
      console.warn('resend-welcome-pack: onboarding link sanitized', sanitizedTarget.diagnostics)
    }
  } else if (magicLinkResult.error) {
    console.error('resend-welcome-pack: magic link generation failed', magicLinkResult.error)
  }

  const welcomeGuideUrl = buildUrl(appUrlRoot, '/ecd/welcome', {
    name: ownerFirstNameForComms,
    centre: centreName,
    location,
    slug: centreSlug,
    email: ownerEmail.toLowerCase(),
  })
  const qrPosterRawLink = centreSlug
    ? buildUrl(appUrlRoot, `/centre/${centreSlug}/poster`)
    : buildUrl(appUrlRoot, '/ecd/website')
  const welcomeGuideTracked = toTrackedCtaLink('welcome_pack')
  const getStartedTracked = toTrackedCtaLink('get_started')
  const qrPosterLink = toTrackedCtaLink('qr_poster')

  const html = await renderPilotWelcomePackEmail({
    centreName,
    contactName: ownerFirstNameForComms,
    dashboardLink: getStartedTracked,
    websiteBuilderLink: buildUrl(appUrlRoot, '/ecd/website'),
    attendanceLink: buildUrl(appUrlRoot, '/ecd/attendance'),
    pickupLink: buildUrl(appUrlRoot, '/ecd/pickup'),
    qrPosterLink,
    supportWhatsApp: '+27685356430',
    supportEmail: process.env.SUPPORT_EMAIL?.trim() || 'admin@centerconnect.co.za',
    supportLink: buildUrl(appUrlRoot, '/ecd/support'),
    welcomeGuideLink: welcomeGuideTracked,
    packageLabel: `${packageLabel} Welcome Pack`,
    centreLogoUrl: centre.logo_url ?? null,
    quickSteps: [
      {
        label: 'Upload your centre logo',
        href: buildUrl(appUrlRoot, '/ecd/website'),
        done: hasLogo,
        whereItShows: 'Welcome pack + centre cards',
      },
      {
        label: 'Add your hero cover photo',
        href: buildUrl(appUrlRoot, '/ecd/website'),
        done: hasHero,
        whereItShows: 'Welcome pack header',
      },
      {
        label: 'Add your first five children',
        href: buildUrl(appUrlRoot, '/ecd/children/new'),
        done: hasChildren,
        whereItShows: 'Attendance + reports',
      },
      {
        label: 'Take attendance once',
        href: buildUrl(appUrlRoot, '/ecd/attendance'),
        done: hasAttendance,
        whereItShows: 'Parent daily updates',
      },
      {
        label: 'Turn on safe pickup',
        href: buildUrl(appUrlRoot, '/ecd/pickup'),
        done: hasPickup,
        whereItShows: 'Gate-time verification',
      },
      {
        label: 'Print parent QR poster for your gate',
        href: qrPosterLink,
        done: false,
        whereItShows: 'Parent onboarding and gate pickup',
      },
    ],
  })

  const subject = `Welcome to CentreConnect - ${centreName}`
  const notificationPayload = {
    subject,
    tracked_links: {
      get_started: getStartedTracked,
      welcome_pack: welcomeGuideTracked,
      qr_poster: qrPosterLink,
    },
    tracked_targets: {
      get_started: getStartedUrl,
      welcome_pack: welcomeGuideUrl,
      qr_poster: qrPosterRawLink,
    },
  }

  const deliveryResult = await deliverTransactionalEmail({
    to: ownerEmail,
    subject,
    html,
  })

  await upsertNotificationLog(admin, {
    centreId: ecdId,
    eventKey,
    eventType: 'welcome_pack',
    channel: 'email',
    recipient: ownerEmail.toLowerCase(),
    status: deliveryResult.status,
    provider: deliveryResult.directSent
      ? 'resend'
      : deliveryResult.queueSuccess
        ? 'email_queue'
        : 'resend',
    providerMessageId: deliveryResult.directSent
      ? deliveryResult.directMessageId
      : deliveryResult.queueMessageId,
    payload: notificationPayload,
    errorMessage: deliveryResult.status === 'sent' ? null : deliveryResult.deliveryMessage,
  })

  if (deliveryResult.status === 'sent') {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json(
    {
      success: false,
      queued: deliveryResult.status === 'queued',
      error: deliveryResult.deliveryMessage,
    },
    { status: 502 }
  )
}




