import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPaystackSignature } from '@/lib/payments/paystack'
import { reconcilePaystackWebhookEvent } from '@/lib/payments/webhook-reconcile'

type PaystackWebhookPayload = {
  id?: number | string
  event?: string
  data?: {
    reference?: string
    amount?: number
    currency?: string
    metadata?: Record<string, unknown>
  }
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  let signatureValid = false
  try {
    signatureValid = verifyPaystackSignature(rawBody, signature)
  } catch {
    signatureValid = false
  }

  if (!signatureValid) {
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
  const parsedPayload = payload as { data?: { reference?: string; currency?: string; metadata?: Record<string, unknown> } }

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: eventRow, error: insertError } = await admin
    .from('payment_webhook_events')
    .insert({
      provider,
      event_id: eventId,
      event_type: eventType,
      reference,
      payload,
      status: 'received',
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }
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

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
