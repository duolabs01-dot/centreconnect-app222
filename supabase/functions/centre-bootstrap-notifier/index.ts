import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderCentreBootstrapWelcomePack } from './welcome-pack-template.ts'

type BootstrapCentrePayload = {
  event: 'centre_bootstrap_created'
  event_key: string
  centre: {
    id: string
    name: string | null
    owner_email: string | null
    owner_phone: string | null
    primary_contact_name: string | null
    slug: string | null
  }
  inserted_at: string
}

type DeliveryStatus = 'sent' | 'failed'

type LogInsert = {
  centre_id: string | null
  event_key: string
  event_type: string
  channel: 'email' | 'whatsapp'
  recipient: string | null
  status: DeliveryStatus
  provider: string
  provider_message_id?: string | null
  payload?: Record<string, unknown>
  error_message?: string | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('CENTRE_BOOTSTRAP_WEBHOOK_SECRET') ?? ''

const APP_URL = (Deno.env.get('APP_URL') ?? 'https://centerconnect.co.za').replace(/\/$/, '')
const SUPPORT_WHATSAPP = Deno.env.get('SUPPORT_WHATSAPP') ?? '+27685356430'
const SUPPORT_EMAIL = Deno.env.get('SUPPORT_EMAIL') ?? 'admin@centerconnect.co.za'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('WELCOME_PACK_FROM') ?? 'CentreConnect <admin@centerconnect.co.za>'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') ?? ''
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `+27${digits.slice(1)}`
  if (digits.startsWith('27')) return `+${digits}`
  if (digits.startsWith('+')) return digits
  return `+${digits}`
}

function ensureWebhookAuthorized(request: Request) {
  if (!WEBHOOK_SECRET) return true
  const incoming = request.headers.get('x-centre-bootstrap-secret') ?? ''
  return incoming === WEBHOOK_SECRET
}

async function upsertNotificationLog(record: LogInsert) {
  const { error } = await supabaseAdmin.from('notification_logs').upsert(
    {
      centre_id: record.centre_id,
      event_key: record.event_key,
      event_type: record.event_type,
      channel: record.channel,
      recipient: record.recipient,
      status: record.status,
      provider: record.provider,
      provider_message_id: record.provider_message_id ?? null,
      payload: record.payload ?? {},
      error_message: record.error_message ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_key,channel' }
  )

  if (error) {
    console.error('Failed to write notification_logs row:', error.message)
  }
}

async function sendEmailViaResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    return { ok: false as const, error: 'RESEND_API_KEY is not configured.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string }
  if (!response.ok) {
    return {
      ok: false as const,
      error: payload.message ?? `Resend responded with ${response.status}`,
    }
  }

  return { ok: true as const, id: payload.id ?? null }
}

function toTwilioWhatsappAddress(value: string) {
  return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`
}

async function sendWhatsappViaTwilio(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { ok: false as const, error: 'Twilio credentials are not configured.' }
  }

  const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const params = new URLSearchParams({
    To: toTwilioWhatsappAddress(to),
    Body: body,
  })

  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID)
  } else if (TWILIO_WHATSAPP_FROM) {
    params.set('From', toTwilioWhatsappAddress(TWILIO_WHATSAPP_FROM))
  } else {
    return {
      ok: false as const,
      error: 'Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_WHATSAPP_FROM.',
    }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string }
  if (!response.ok) {
    return {
      ok: false as const,
      error: payload.message ?? `Twilio responded with ${response.status}`,
    }
  }

  return { ok: true as const, id: payload.sid ?? null }
}

function buildWhatsappMessage(centreName: string) {
  return `Welcome to CentreConnect, ${centreName}! Your centre workspace is live. Open Dashboard: ${APP_URL}/ecd/dashboard`
}

serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!ensureWebhookAuthorized(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase runtime credentials.' }, 500)
  }

  const payload = (await request.json().catch(() => null)) as BootstrapCentrePayload | null
  if (!payload || payload.event !== 'centre_bootstrap_created' || !payload.centre?.id) {
    return jsonResponse({ error: 'Invalid payload.' }, 400)
  }

  const centreName = payload.centre.name?.trim() || 'your centre'
  const ownerName = payload.centre.primary_contact_name?.trim() || 'ECD Admin'
  const ownerEmail = normalizeEmail(payload.centre.owner_email)
  const ownerPhone = normalizePhone(payload.centre.owner_phone)

  const emailTemplate = renderCentreBootstrapWelcomePack({
    centreName,
    ownerName,
    dashboardLink: `${APP_URL}/ecd/dashboard`,
    attendanceLink: `${APP_URL}/ecd/attendance`,
    pickupLink: `${APP_URL}/ecd/pickup`,
    websiteBuilderLink: `${APP_URL}/ecd/website`,
    supportWhatsApp: SUPPORT_WHATSAPP,
    supportEmail: SUPPORT_EMAIL,
  })

  const summary = {
    centreId: payload.centre.id,
    eventKey: payload.event_key,
    email: { attempted: false, sent: false, error: null as string | null },
    whatsapp: { attempted: false, sent: false, error: null as string | null },
  }

  if (ownerEmail) {
    summary.email.attempted = true
    const emailResult = await sendEmailViaResend(ownerEmail, emailTemplate.subject, emailTemplate.html)
    if (emailResult.ok) {
      summary.email.sent = true
      await upsertNotificationLog({
        centre_id: payload.centre.id,
        event_key: payload.event_key,
        event_type: payload.event,
        channel: 'email',
        recipient: ownerEmail,
        status: 'sent',
        provider: 'resend',
        provider_message_id: emailResult.id,
        payload: { subject: emailTemplate.subject },
      })
    } else {
      summary.email.error = emailResult.error
      await upsertNotificationLog({
        centre_id: payload.centre.id,
        event_key: payload.event_key,
        event_type: payload.event,
        channel: 'email',
        recipient: ownerEmail,
        status: 'failed',
        provider: 'resend',
        error_message: emailResult.error,
        payload: { subject: emailTemplate.subject },
      })
    }
  }
  if (!ownerEmail) {
    summary.email.error = 'Centre owner email is missing.'
    await upsertNotificationLog({
      centre_id: payload.centre.id,
      event_key: payload.event_key,
      event_type: payload.event,
      channel: 'email',
      recipient: null,
      status: 'failed',
      provider: 'resend',
      error_message: summary.email.error,
      payload: { subject: emailTemplate.subject },
    })
  }

  if (ownerPhone) {
    summary.whatsapp.attempted = true
    const whatsappResult = await sendWhatsappViaTwilio(ownerPhone, buildWhatsappMessage(centreName))
    if (whatsappResult.ok) {
      summary.whatsapp.sent = true
      await upsertNotificationLog({
        centre_id: payload.centre.id,
        event_key: payload.event_key,
        event_type: payload.event,
        channel: 'whatsapp',
        recipient: ownerPhone,
        status: 'sent',
        provider: 'twilio_whatsapp',
        provider_message_id: whatsappResult.id,
        payload: { preview: buildWhatsappMessage(centreName) },
      })
    } else {
      summary.whatsapp.error = whatsappResult.error
      await upsertNotificationLog({
        centre_id: payload.centre.id,
        event_key: payload.event_key,
        event_type: payload.event,
        channel: 'whatsapp',
        recipient: ownerPhone,
        status: 'failed',
        provider: 'twilio_whatsapp',
        error_message: whatsappResult.error,
        payload: { preview: buildWhatsappMessage(centreName) },
      })
    }
  }
  if (!ownerPhone) {
    summary.whatsapp.error = 'Centre owner phone is missing.'
    await upsertNotificationLog({
      centre_id: payload.centre.id,
      event_key: payload.event_key,
      event_type: payload.event,
      channel: 'whatsapp',
      recipient: null,
      status: 'failed',
      provider: 'twilio_whatsapp',
      error_message: summary.whatsapp.error,
      payload: { preview: buildWhatsappMessage(centreName) },
    })
  }

  return jsonResponse({ ok: true, summary }, 200)
})
