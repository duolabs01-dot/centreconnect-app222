import { createAdminClient } from '@/lib/supabase/admin'

type PaystackWebhookPayload = {
  data?: {
    reference?: string
    currency?: string
    metadata?: Record<string, unknown>
  }
}

type ReconcilePaystackWebhookEventInput = {
  admin: ReturnType<typeof createAdminClient>
  eventRowId: string
  eventType: string
  reference: string | null
  payload: PaystackWebhookPayload
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

export async function reconcilePaystackWebhookEvent(input: ReconcilePaystackWebhookEventInput) {
  const metadata = (input.payload.data?.metadata ?? {}) as Record<string, unknown>
  const metadataInvoiceId = asString(metadata.invoice_id)

  let invoiceId: string | null = metadataInvoiceId
  if (!invoiceId && input.reference) {
    const lookup = await input.admin.from('invoices').select('id').eq('payment_reference', input.reference).maybeSingle()
    invoiceId = lookup.data?.id ?? null
  }

  if (input.eventType === 'charge.success' && invoiceId) {
    const { data: invoice, error: invoiceReadError } = await input.admin
      .from('invoices')
      .select('id,ecd_id,status')
      .eq('id', invoiceId)
      .maybeSingle()

    if (invoiceReadError || !invoice) {
      throw new Error(invoiceReadError?.message || 'Invoice not found for webhook event')
    }

    if (invoice.status !== 'paid') {
      const { error: invoiceUpdateError } = await input.admin
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_last_event: input.eventType,
          payment_currency: asString(input.payload.data?.currency) ?? 'ZAR',
        })
        .eq('id', invoice.id)
      if (invoiceUpdateError) throw new Error(invoiceUpdateError.message)
    }

    const { error: subscriptionUpdateError } = await input.admin
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('ecd_id', invoice.ecd_id)
      .in('status', ['trial', 'past_due', 'suspended'])
    if (subscriptionUpdateError) throw new Error(subscriptionUpdateError.message)

    const { error: eventUpdateError } = await input.admin
      .from('payment_webhook_events')
      .update({
        invoice_id: invoice.id,
        status: 'processed',
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', input.eventRowId)
    if (eventUpdateError) throw new Error(eventUpdateError.message)

    return { processed: true as const, status: 'processed' as const, invoiceId: invoice.id }
  }

  const { error: ignoredUpdateError } = await input.admin
    .from('payment_webhook_events')
    .update({
      invoice_id: invoiceId,
      status: 'ignored',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', input.eventRowId)
  if (ignoredUpdateError) throw new Error(ignoredUpdateError.message)

  return { processed: false as const, status: 'ignored' as const, invoiceId }
}
