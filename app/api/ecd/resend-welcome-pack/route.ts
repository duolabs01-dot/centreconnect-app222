import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import nodemailer from 'nodemailer'

import { createAdminClient } from '@/lib/supabase/admin'

const OLD_DOMAIN_PATTERN = /centerconnect-app222\.vercel\.app/gi

function sanitizeName(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}

function friendlyNameFromEmail(email: string, fallback: string) {
  const local = email.split('@')[0] ?? ''
  const normalized = local.replace(/[._-]+/g, ' ').trim()
  return normalized.length >= 2 ? normalized : fallback
}

function applyTemplateReplacements(html: string, replacements: Record<string, string>) {
  let content = html
  for (const [token, value] of Object.entries(replacements)) {
    content = content.split(token).join(value ?? '')
  }
  return content
}

type Payload = {
  ecdId?: string
  ownerEmail?: string
}

async function fetchWelcomePackHtml(appUrlRoot: string) {
  const htmlPath = path.join(process.cwd(), 'public', 'CentreConnect_Pilot_Welcome_FINAL.html')
  const html = await readFile(htmlPath, 'utf-8')
  return html.replace(OLD_DOMAIN_PATTERN, appUrlRoot)
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

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!rawAppUrl) {
    console.error('resend-welcome-pack: NEXT_PUBLIC_APP_URL missing')
    return NextResponse.json({ success: false, error: 'Application URL is not configured' }, { status: 500 })
  }
  const appUrlRoot = rawAppUrl.replace(/\/+$/, '')

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
    .from('auth.users')
    .select('id')
    .eq('email', ownerEmail)
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

  let html: string
  try {
    html = await fetchWelcomePackHtml(appUrlRoot)
  } catch (error) {
    console.error('resend-welcome-pack: failed to read welcome pack', error)
    return NextResponse.json({ success: false, error: 'Unable to load welcome pack content' }, { status: 502 })
  }

  const loginUrl = `${appUrlRoot}/login?next=/ecd/welcome`
  html = applyTemplateReplacements(html, {
    '{{ownerName}}': ownerName,
    '{{centreName}}': centreName,
    '{{location}}': location,
    '{{centreSlug}}': centreSlug,
    '{{loginUrl}}': loginUrl,
  })

  const centrePageUrl = `${appUrlRoot}/centre/${centreSlug || 'profile'}`
  const plainText = `Welcome ${ownerName} to ${centreName}! Create your account at ${loginUrl}, then return to ${centrePageUrl} for the starter guide. Need anything? WhatsApp +27 68 535 6430.`

  const subject = `Welcome to CentreConnect Pilot — ${centreName}`

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
        'List-Unsubscribe': `<mailto:hello@centerconnect.co.za?subject=unsubscribe>`,
        'Reply-To': 'hello@centerconnect.co.za',
        Precedence: 'bulk',
      },
    })
  } catch (error) {
    console.error('resend-welcome-pack: SMTP send failed', error)
    return NextResponse.json({ success: false, error: 'Unable to send welcome pack email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
