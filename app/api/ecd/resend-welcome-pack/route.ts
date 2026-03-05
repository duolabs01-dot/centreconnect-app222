import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { renderPilotWelcomePackEmail } from '@/lib/email/templates/pilot-welcome-pack'
import { createAdminClient } from '@/lib/supabase/admin'

type Payload = {
  ecdId?: string
  ownerEmail?: string
}

function sanitizeName(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
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

  const smtpHost = process.env.SMTP_HOST
  const smtpPortRaw = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM

  if (!smtpHost || !smtpPortRaw || !smtpUser || !smtpPass || !smtpFrom) {
    console.error('resend-welcome-pack: SMTP configuration missing', {
      smtpHost: Boolean(smtpHost),
      smtpPort: Boolean(smtpPortRaw),
      smtpUser: Boolean(smtpUser),
      smtpPass: Boolean(smtpPass),
      smtpFrom: Boolean(smtpFrom),
    })
    return NextResponse.json({ success: false, error: 'Email provider is not configured' }, { status: 500 })
  }

  const smtpPort = Number(smtpPortRaw)
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    console.error('resend-welcome-pack: invalid SMTP_PORT', smtpPortRaw)
    return NextResponse.json({ success: false, error: 'Invalid SMTP port configured' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select('name,slug,primary_contact_name,city,suburb')
    .eq('id', ecdId)
    .single()

  if (centreError || !centre) {
    console.error('resend-welcome-pack: centre lookup failed', centreError)
    return NextResponse.json({ success: false, error: 'ECD centre not found' }, { status: 404 })
  }

  const centreName = centre.name?.trim() || 'CentreConnect'
  const centreSlug = centre.slug?.trim() ?? ''
  const locationParts = [centre.suburb, centre.city].map((part) => part?.trim()).filter(Boolean)
  const location = locationParts.length ? locationParts.join(', ') : 'your area'

  const ownerNameFallback = friendlyNameFromEmail(ownerEmail, 'Centre Owner')
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
      .select('full_name')
      .eq('id', ownerUser.id)
      .maybeSingle()
    if (!profileError && profile?.full_name) {
      ownerFullName = profile.full_name
    }
  }

  const ownerName = sanitizeName(ownerFullName ?? centre.primary_contact_name, ownerNameFallback)

  const welcomeQuery = new URLSearchParams({
    name: ownerName,
    centre: centreName,
    location,
    onboarding: '1',
  }).toString()
  const welcomeNextPath = `/ecd/welcome?${welcomeQuery}`
  const callbackRedirectUrl = buildUrl(appUrlRoot, '/auth/callback', { next: welcomeNextPath })
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
    getStartedUrl = buildUrl(appUrlRoot, '/api/invites/open', {
      channel: 'email',
      target: magicActionLink,
    })
  } else if (magicLinkResult.error) {
    console.error('resend-welcome-pack: magic link generation failed', magicLinkResult.error)
  }
  const welcomeGuideUrl = buildUrl(appUrlRoot, '/ecd/welcome', {
    name: ownerName,
    centre: centreName,
    location,
  })

  const html = await renderPilotWelcomePackEmail({
    centreName,
    contactName: ownerName,
    dashboardLink: getStartedUrl,
    websiteBuilderLink: buildUrl(appUrlRoot, '/ecd/website'),
    attendanceLink: buildUrl(appUrlRoot, '/ecd/attendance'),
    pickupLink: buildUrl(appUrlRoot, '/ecd/pickup'),
    qrPosterLink: buildUrl(appUrlRoot, '/ecd/pickup'),
    supportWhatsApp: '+27685356430',
    supportEmail: 'admin@centerconnect.co.za',
    supportLink: buildUrl(appUrlRoot, '/ecd/support'),
    welcomeGuideLink: welcomeGuideUrl,
    packageLabel: 'Welcome Pack',
  })

  const publicCentreLink = buildUrl(appUrlRoot, `/centre/${centreSlug || 'profile'}`)
  const plainText = [
    `Hi ${ownerName},`,
    '',
    `Welcome to CentreConnect for ${centreName}.`,
    'Parents are already asking for the app.',
    '',
    `See your welcome pack: ${welcomeGuideUrl}`,
    `Get started: ${getStartedUrl}`,
    `Public centre page: ${publicCentreLink}`,
    '',
    'Need help? WhatsApp +27 68 535 6430.',
  ].join('\n')

  const subject = `Welcome to CentreConnect Pilot - ${centreName}`

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    await transporter.sendMail({
      from: smtpFrom,
      to: ownerEmail,
      subject,
      html,
      text: plainText,
      headers: {
        'Reply-To': 'admin@centerconnect.co.za',
      },
    })
  } catch (error) {
    console.error('resend-welcome-pack: SMTP send failed', error)
    return NextResponse.json({ success: false, error: 'Unable to send welcome pack email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
