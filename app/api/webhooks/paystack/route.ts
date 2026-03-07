import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPaystackSignature } from '@/lib/payments/paystack'
import { reconcilePaystackWebhookEvent } from '@/lib/payments/webhook-reconcile'
import { getClientAgent, getClientIp } from '@/lib/security/request-context'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'
import { logBillingEvent } from '@/lib/payments/structured-logs'

type PaystackWebhookPayload = {
  id?: number | string
  event?: string
  data?: {
    reference?: string
    amount?: number
    currency?: string
    metadata?: Record<string, unknown>
    authorization?: Record<string, unknown>
    customer?: Record<string, unknown>
  }
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')
  const sourceIp = getClientIp(request)
  const sourceUserAgent = getClientAgent(request)

  let signatureValid = false
  try {
    signatureValid = verifyPaystackSignature(rawBody, signature)
  } catch {
    signatureValid = false
  }

  if (!signatureValid) {
    logBillingEvent('paystack_webhook_invalid_signature', { sourceIp, sourceUserAgent }, 'warn')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: PaystackWebhookPayload
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = 'paystack'
  const eventId = String(payload.id ?? '')
  const eventType = String(payload.event ?? 'unknown')
  const reference = asString(payload.data?.reference)
  const parsedPayload = payload as {
    data?: {
      reference?: string
      currency?: string
      metadata?: Record<string, unknown>
      authorization?: Record<string, unknown>
      customer?: Record<string, unknown>
      amount?: number
    }
  }

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  }

  logBillingEvent('paystack_webhook_received', {
    eventId,
    eventType,
    reference,
    sourceIp,
  })

  const admin = createAdminClient()

  // TASK 1 & 2: Idempotency check against invoices
  const ref = reference
  if (ref) {
    const { data: existing } = await admin
      .from("invoices")
      .select("id, status")
      .eq("paystack_reference", ref)
      .maybeSingle()

    if (existing?.status === "paid") {
      logBillingEvent('paystack_webhook_duplicate_paid_invoice', { reference: ref }, 'warn')
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
    }
  }

  const { data: eventRow, error: insertError } = await admin
    .from('payment_webhook_events')
    .insert({
      provider,
      event_id: eventId,
      event_type: eventType,
      reference,
      source_ip: sourceIp,
      source_user_agent: sourceUserAgent,
      payload,
      status: 'received',
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      logBillingEvent('paystack_webhook_duplicate_event_id', { eventId, provider, reference }, 'warn')
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }
    logBillingEvent('paystack_webhook_insert_failed', { eventId, message: insertError.message }, 'error')
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    const result = await reconcilePaystackWebhookEvent({
      admin,
      eventRowId: eventRow.id,
      eventType,
      reference,
      payload: parsedPayload,
    })
    logBillingEvent('paystack_webhook_processed', {
      eventId,
      eventType,
      status: result.status,
      processed: result.processed,
      reference,
      invoiceId: result.invoiceId,
    })
    return NextResponse.json({ ok: true, processed: result.processed, status: result.status }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await admin
      .from('payment_webhook_events')
      .update({
        status: 'failed',
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventRow.id)

    logBillingEvent('paystack_webhook_processing_failed', { eventId, eventType, reference, message }, 'error')
    void sendPlatformAdminActionNotification({
      subject: 'Webhook Processing Failed',
      heading: 'A Paystack webhook failed during reconciliation.',
      lines: [
        `Event ID: ${eventId}`,
        `Type: ${eventType}`,
        `Reference: ${reference ?? '-'}`,
        `IP: ${sourceIp ?? '-'}`,
      ],
      details: {
        webhookEventRowId: eventRow.id,
        message,
        sourceUserAgent,
      },
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
