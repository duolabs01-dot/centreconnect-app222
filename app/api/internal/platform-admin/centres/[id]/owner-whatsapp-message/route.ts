import { NextResponse } from 'next/server'

import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { resolveFirstName } from '@/lib/utils/name'
import { createNotificationEventKey } from '@/lib/admin/notification-logs'
import { createWhatsappClickToChatLink, normalizeWhatsappPhone } from '@/lib/communications/whatsapp'

type OwnerWhatsAppMessage = {
  message: string
  whatsappLink: string | null
  ownerPhone: string | null
  ownerEmail: string
  links: {
    login: string
    welcomePack: string
  }
  centreName: string
  ownerFirstName: string
}

function sanitizeName(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}

type TrackingUrlOptions = {
  eventKey: string
  channel: 'email' | 'whatsapp'
  cta?: 'get_started' | 'welcome_pack' | 'qr_poster'
  target?: string | null
}

function buildTrackingUrl(root: string, input: TrackingUrlOptions) {
  const url = new URL('/api/invites/open', root)
  url.searchParams.set('event_key', input.eventKey)
  url.searchParams.set('channel', input.channel)
  if (input.cta) url.searchParams.set('cta', input.cta)
  if (input.target) url.searchParams.set('target', input.target)
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
    .select('id,name,slug,email,phone,contact_phone,primary_contact_name,primary_contact_first_name,primary_contact_surname,suburb,city')
    .eq('id', centreId)
    .maybeSingle()

  if (centreError) return NextResponse.json({ error: centreError.message }, { status: 500 })
  if (!centre) return NextResponse.json({ error: 'Centre not found' }, { status: 404 })

  const ownerEmail = String(centre.email ?? '').trim().toLowerCase()
  if (!ownerEmail) {
    return NextResponse.json({ error: 'Centre owner email is missing.' }, { status: 400 })
  }

  const ownerPhoneRaw = centre.contact_phone ?? centre.phone
  const ownerPhone = normalizeWhatsappPhone(ownerPhoneRaw)

  const ownerFirstName = resolveFirstName({
    firstName: centre.primary_contact_first_name,
    fullName: centre.primary_contact_name,
    email: ownerEmail,
    fallback: 'Friend',
  })

  const eventKey = createNotificationEventKey('owner_invite_whatsapp', centre.id)
  const root = normalizeAppUrl()

  const loginLink = buildTrackingUrl(root, { eventKey, channel: 'email', cta: 'get_started' })
  const welcomePackLink = buildTrackingUrl(root, { eventKey, channel: 'email', cta: 'welcome_pack' })

  const messageParts = [
    `Hi ${ownerFirstName},`,
    `${sanitizeName(centre.name, 'your centre')} is now enrolled on CentreConnect so the families you care for receive attendance, documents, safe pickup notes, and daily reports in one shared space.`,
    `I just emailed ${ownerEmail} with the login link and password setup; that same email also includes the welcome pack so you can remind parents the password link was sent to their inbox.`,
    `Login + password setup: ${loginLink}`,
    `Welcome pack (what parents get and how it works): ${welcomePackLink}`,
    `Share this note with parents so they know their centre already uses CentreConnect and the email has both links they need.`,
    `Reply here if you need a helping hand.`,
  ]
  const message = messageParts.filter(Boolean).join('\n')
  const whatsappTextLink = ownerPhone ? createWhatsappClickToChatLink(ownerPhone, message) : null

  const payload: OwnerWhatsAppMessage = {
    message,
    whatsappLink: whatsappTextLink,
    ownerPhone,
    ownerEmail,
    centreName: sanitizeName(centre.name, 'your centre'),
    ownerFirstName,
    links: {
      login: loginLink,
      welcomePack: welcomePackLink,
    },
  }

  return NextResponse.json(payload)
}
