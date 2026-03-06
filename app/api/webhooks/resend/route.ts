import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'

type ResendWebhookData = {
  email_id?: string | null
  id?: string | null
  to?: string[] | string | null
  reason?: string | null
  error?: string | null
  [key: string]: unknown
}

type ResendWebhookPayload = {
  type?: string | null
  created_at?: string | null
  data?: ResendWebhookData | null
}

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeBase64(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').trim()
  const padLength = (4 - (normalized.length % 4)) % 4
  return normalized + '='.repeat(padLength)
}

function extractSvixV1Signatures(headerValue: string): string[] {
  const regexMatches = [...headerValue.matchAll(/v1[=,]([A-Za-z0-9+/=_-]+)/g)].map((match) =>
    match[1].trim()
  )
  if (regexMatches.length > 0) return regexMatches

  return headerValue
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('v1=')) return part.slice(3)
      if (part.startsWith('v1,')) return part.slice(3)
      return part
    })
    .filter(Boolean)
}

function timingSafeStringCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function verifySvixSignature(rawBody: string, request: Request, secret: string) {
  const svixId = asTrimmedString(request.headers.get('svix-id'))
  const svixTimestampRaw = asTrimmedString(request.headers.get('svix-timestamp'))
  const svixSignature = asTrimmedString(request.headers.get('svix-signature'))

  if (!svixId || !svixTimestampRaw || !svixSignature) return false

  let svixTimestamp = Number(svixTimestampRaw)
  if (!Number.isFinite(svixTimestamp)) return false
  if (svixTimestamp > 1_000_000_000_000) {
    svixTimestamp = Math.floor(svixTimestamp / 1000)
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - svixTimestamp) > WEBHOOK_TOLERANCE_SECONDS) return false

  const secretValue = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  if (!secretValue) return false

  let signingKey: Buffer
  try {
    signingKey = Buffer.from(normalizeBase64(secretValue), 'base64')
  } catch {
    return false
  }
  if (signingKey.length === 0) return false

  const signedContent = `${svixId}.${svixTimestampRaw}.${rawBody}`
  const expectedSignature = createHmac('sha256', signingKey).update(signedContent).digest('base64')
  const expectedCanonical = normalizeBase64(expectedSignature).replace(/=+$/g, '')

  const receivedSignatures = extractSvixV1Signatures(svixSignature)
  return receivedSignatures.some((signature) =>
    timingSafeStringCompare(expectedCanonical, normalizeBase64(signature).replace(/=+$/g, ''))
  )
}

function mapResendEventToStatus(eventType: string): NotificationStatus | null {
  const normalized = eventType.toLowerCase()
  if (normalized.includes('clicked')) return 'clicked'
  if (normalized.includes('opened')) return 'opened'
  if (normalized.includes('delayed') || normalized.includes('deferred') || normalized.includes('queued')) {
    return 'queued'
  }
  if (normalized.includes('delivered')) return 'delivered'
  if (normalized.includes('sent')) return 'sent'
  if (
    normalized.includes('bounced') ||
    normalized.includes('failed') ||
    normalized.includes('complained') ||
    normalized.includes('dropped')
  ) {
    return 'failed'
  }
  return null
}

function allowedPreviousStatuses(nextStatus: NotificationStatus): NotificationStatus[] {
  if (nextStatus === 'queued') return ['queued']
  if (nextStatus === 'sent') return ['queued', 'sent']
  if (nextStatus === 'delivered') return ['queued', 'sent', 'delivered']
  if (nextStatus === 'opened') return ['queued', 'sent', 'delivered', 'opened']
  if (nextStatus === 'clicked') return ['queued', 'sent', 'delivered', 'opened', 'clicked']
  return ['queued', 'sent', 'delivered', 'opened', 'clicked', 'failed']
}

function extractMessageId(payload: ResendWebhookPayload) {
  return (
    asTrimmedString(payload.data?.email_id) ??
    asTrimmedString(payload.data?.id) ??
    null
  )
}

function extractRecipient(payload: ResendWebhookPayload) {
  const rawTo = payload.data?.to
  if (typeof rawTo === 'string') {
    return rawTo.trim().toLowerCase() || null
  }
  if (Array.isArray(rawTo)) {
    const first = rawTo.find((value) => typeof value === 'string' && value.trim().length > 0)
    return typeof first === 'string' ? first.trim().toLowerCase() : null
  }
  return null
}

function extractFailureReason(payload: ResendWebhookPayload) {
  return (
    asTrimmedString(payload.data?.reason) ??
    asTrimmedString(payload.data?.error) ??
    null
  )
}

async function updateNotificationLogByMessageId(input: {
  messageId: string
  status: NotificationStatus
  failureReason: string | null
}) {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const mutableStatuses = allowedPreviousStatuses(input.status)
  const patch = {
    status: input.status,
    updated_at: now,
    error_message: input.status === 'failed' ? input.failureReason : null,
  }

  const result = await admin
    .from('notification_logs')
    .update(patch)
    .eq('provider', 'resend')
    .eq('provider_message_id', input.messageId)
    .in('status', mutableStatuses)
    .select('id')

  if (result.error) {
    return { ok: false as const, error: result.error.message, updated: 0 }
  }

  return { ok: true as const, updated: result.data?.length ?? 0 }
}

async function updateNotificationLogByRecipientFallback(input: {
  recipient: string
  messageId: string | null
  status: NotificationStatus
  failureReason: string | null
}) {
  const admin = createAdminClient()
  const mutableStatuses = allowedPreviousStatuses(input.status)
  const now = new Date().toISOString()

  const { data: candidate, error: candidateError } = await admin
    .from('notification_logs')
    .select('id')
    .eq('provider', 'resend')
    .eq('channel', 'email')
    .eq('recipient', input.recipient)
    .in('status', mutableStatuses)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (candidateError) {
    return { ok: false as const, error: candidateError.message, updated: 0 }
  }

  if (!candidate?.id) {
    return { ok: true as const, updated: 0 }
  }

  const updatePayload: {
    status: NotificationStatus
    provider_message_id?: string
    error_message: string | null
    updated_at: string
  } = {
    status: input.status,
    error_message: input.status === 'failed' ? input.failureReason : null,
    updated_at: now,
  }
  if (input.messageId) {
    updatePayload.provider_message_id = input.messageId
  }

  const { error: updateError } = await admin
    .from('notification_logs')
    .update(updatePayload)
    .eq('id', candidate.id)

  if (updateError) {
    return { ok: false as const, error: updateError.message, updated: 0 }
  }

  return { ok: true as const, updated: 1 }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const secret = asTrimmedString(process.env.RESEND_WEBHOOK_SECRET)
  if (!secret) {
    return NextResponse.json(
      { error: 'RESEND_WEBHOOK_SECRET is not configured.' },
      { status: 503 }
    )
  }

  if (!verifySvixSignature(rawBody, request, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  let payload: ResendWebhookPayload
  try {
    payload = JSON.parse(rawBody) as ResendWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const eventType = asTrimmedString(payload.type)?.toLowerCase() ?? ''
  if (!eventType) {
    return NextResponse.json({ error: 'Missing event type.' }, { status: 400 })
  }

  const status = mapResendEventToStatus(eventType)
  if (!status) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'unsupported_event_type' }, { status: 200 })
  }

  const messageId = extractMessageId(payload)
  const recipient = extractRecipient(payload)
  const failureReason = extractFailureReason(payload)

  if (!messageId && !recipient) {
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'missing_message_id_and_recipient', eventType },
      { status: 200 }
    )
  }

  let updated = 0

  if (messageId) {
    const byMessageId = await updateNotificationLogByMessageId({
      messageId,
      status,
      failureReason,
    })
    if (!byMessageId.ok) {
      return NextResponse.json({ error: byMessageId.error }, { status: 500 })
    }
    updated = byMessageId.updated
  }

  if (updated === 0 && recipient) {
    const fallback = await updateNotificationLogByRecipientFallback({
      recipient,
      messageId: messageId ?? null,
      status,
      failureReason,
    })
    if (!fallback.ok) {
      return NextResponse.json({ error: fallback.error }, { status: 500 })
    }
    updated = fallback.updated
  }

  return NextResponse.json({
    ok: true,
    eventType,
    status,
    updated,
    messageId: messageId ?? null,
    recipient: recipient ?? null,
  })
}
