import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { reconcilePaystackWebhookEvent } from '@/lib/payments/webhook-reconcile'

type StoredPaystackPayload = {
  data?: {
    reference?: string
    currency?: string
    metadata?: Record<string, unknown>
  }
}

function isStoredPaystackPayload(value: unknown): value is StoredPaystackPayload {
  return Boolean(value) && typeof value === 'object'
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: webhookEventId } = await context.params
  if (!webhookEventId) return NextResponse.json({ error: 'Missing webhook event id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: eventRow, error: readError } = await admin
    .from('payment_webhook_events')
    .select('id,provider,event_id,event_type,reference,status,payload')
    .eq('id', webhookEventId)
    .maybeSingle()

  if (readError || !eventRow) {
    return NextResponse.json({ error: readError?.message || 'Webhook event not found' }, { status: 404 })
  }

  if (eventRow.provider !== 'paystack') {
    return NextResponse.json({ error: 'Only paystack events can be replayed from this endpoint' }, { status: 400 })
  }

  if (!isStoredPaystackPayload(eventRow.payload)) {
    return NextResponse.json({ error: 'Webhook payload is not replayable' }, { status: 400 })
  }

  try {
    const result = await reconcilePaystackWebhookEvent({
      admin,
      eventRowId: eventRow.id,
      eventType: eventRow.event_type,
      reference: eventRow.reference,
      payload: eventRow.payload,
    })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'invoice',
      entityId: result.invoiceId,
      action: 'replay_payment_webhook',
      summary: `Replayed webhook event ${eventRow.event_id} (${eventRow.event_type})`,
      details: {
        webhookEventId: eventRow.id,
        provider: eventRow.provider,
        previousStatus: eventRow.status,
        replayStatus: result.status,
        processed: result.processed,
      },
    })

    return NextResponse.json({
      ok: true,
      id: eventRow.id,
      processed: result.processed,
      status: result.status,
      previousStatus: eventRow.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook replay failed'
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
