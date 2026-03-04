import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type EventType =
  | 'application_status_change'
  | 'offer_acceptance'
  | 'document_request_from_coparent'
  | 'daily_report_ready'
  | 'pickup_verified'

type RequestPayload = {
  event_key?: string | null
  event_type?: string | null
  centre_id?: string | null
  parent_id?: string | null
  application_id?: string | null
  recipient_phone?: string | null
  recipient_name?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
}

type LogInsert = {
  centre_id: string | null
  event_key: string
  event_type: string
  channel: 'whatsapp'
  recipient: string | null
  status: 'sent' | 'failed'
  provider: string
  payload: Record<string, unknown>
  error_message?: string | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WHATSAPP_NOTIFIER_SECRET') ?? ''

const ALLOWED_EVENT_TYPES = new Set<EventType>([
  'application_status_change',
  'offer_acceptance',
  'document_request_from_coparent',
  'daily_report_ready',
  'pickup_verified',
])

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizeText(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePhone(raw: string | null | undefined) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `27${digits.slice(1)}`
  if (digits.startsWith('27')) return digits
  return digits
}

function createClickToChatUrl(rawPhone: string | null | undefined, message: string) {
  const normalized = normalizePhone(rawPhone)
  if (!normalized || !message.trim()) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

function isAuthorized(request: Request) {
  if (!WEBHOOK_SECRET) return true
  const incomingSecret = request.headers.get('x-whatsapp-notifier-secret') ?? ''
  return incomingSecret === WEBHOOK_SECRET
}

async function upsertNotificationLog(row: LogInsert) {
  const { error } = await supabaseAdmin.from('notification_logs').upsert(
    {
      centre_id: row.centre_id,
      event_key: row.event_key,
      event_type: row.event_type,
      channel: row.channel,
      recipient: row.recipient,
      status: row.status,
      provider: row.provider,
      payload: row.payload,
      error_message: row.error_message ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_key,channel' }
  )

  if (error) {
    console.error('Failed to write notification_logs record:', error.message)
  }
}

serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!isAuthorized(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Supabase runtime env is missing.' }, 500)
  }

  const payload = (await request.json().catch(() => null)) as RequestPayload | null
  if (!payload) {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400)
  }

  const eventTypeRaw = normalizeText(payload.event_type)
  if (!eventTypeRaw || !ALLOWED_EVENT_TYPES.has(eventTypeRaw as EventType)) {
    return jsonResponse({ error: 'Invalid event_type.' }, 400)
  }

  const message = normalizeText(payload.message)
  if (!message) {
    return jsonResponse({ error: 'Message is required.' }, 400)
  }

  const eventKey =
    normalizeText(payload.event_key) ??
    `whatsapp:${eventTypeRaw}:${normalizeText(payload.centre_id) ?? 'global'}:${Date.now()}:${crypto.randomUUID()}`

  const clickToChatUrl = createClickToChatUrl(payload.recipient_phone, message)
  const recipient = normalizePhone(payload.recipient_phone)
  const failedReason = clickToChatUrl ? null : 'Recipient phone is missing or invalid.'

  await upsertNotificationLog({
    centre_id: normalizeText(payload.centre_id),
    event_key: eventKey,
    event_type: eventTypeRaw,
    channel: 'whatsapp',
    recipient: recipient ? `+${recipient}` : null,
    status: clickToChatUrl ? 'sent' : 'failed',
    provider: 'wa_me_link',
    payload: {
      click_to_chat_url: clickToChatUrl,
      parent_id: normalizeText(payload.parent_id),
      application_id: normalizeText(payload.application_id),
      recipient_name: normalizeText(payload.recipient_name),
      message_preview: message.slice(0, 250),
      metadata: payload.metadata ?? {},
    },
    error_message: failedReason,
  })

  return jsonResponse(
    {
      ok: Boolean(clickToChatUrl),
      event_key: eventKey,
      event_type: eventTypeRaw,
      delivery: {
        channel: 'whatsapp',
        provider: 'wa_me_link',
        click_to_chat_url: clickToChatUrl,
      },
      error: failedReason,
    },
    200
  )
})

