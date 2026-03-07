import { createAdminClient } from '@/lib/supabase/admin'
import { deliverInvoiceReceipt } from '@/lib/payments/receipts'
import { logBillingEvent } from '@/lib/payments/structured-logs'

type PaystackWebhookPayload = {
  data?: {
    reference?: string
    currency?: string
    metadata?: Record<string, unknown>
    authorization?: Record<string, unknown>
    customer?: Record<string, unknown>
    amount?: number
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

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value === 1
  return false
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export async function reconcilePaystackWebhookEvent(input: ReconcilePaystackWebhookEventInput) {
  const metadata = (input.payload.data?.metadata ?? {}) as Record<string, unknown>
  const metadataInvoiceId = asString(metadata.invoice_id)
  const metadataEcdId = asString(metadata.ecd_id)
  const isPaymentMethodUpdate = asBoolean(metadata.payment_method_update)
  const authorization = asRecord(input.payload.data?.authorization)
  const customer = asRecord(input.payload.data?.customer)

  let invoiceId: string | null = metadataInvoiceId
  if (!invoiceId && input.reference) {
    const lookup = await input.admin.from('invoices').select('id').eq('payment_reference', input.reference).maybeSingle()
    invoiceId = lookup.data?.id ?? null
  }

  if (input.eventType === 'charge.success') {
    if (isPaymentMethodUpdate && metadataEcdId) {
      const authorizationCode = asString(authorization?.authorization_code)
      if (!authorizationCode) {
        if (input.reference) {
          await input.admin
            .from('billing_payment_method_updates')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: 'Authorization code missing in webhook payload',
            })
            .eq('paystack_reference', input.reference)
        }
        throw new Error('Authorization code missing in payment method update webhook payload')
      }

      const { error: methodUpsertError } = await input.admin.from('ecd_billing_payment_methods').upsert(
        {
          ecd_id: metadataEcdId,
          provider: 'paystack',
          authorization_code: authorizationCode,
          authorization_signature: asString(authorization?.signature),
          card_type: asString(authorization?.card_type),
          last4: asString(authorization?.last4),
          exp_month: asString(authorization?.exp_month),
          exp_year: asString(authorization?.exp_year),
          bank: asString(authorization?.bank),
          account_name: asString(authorization?.account_name),
          customer_code: asString(customer?.customer_code),
          customer_email: asString(customer?.email),
          reusable: true,
        },
        { onConflict: 'ecd_id' }
      )
      if (methodUpsertError) {
        throw new Error(methodUpsertError.message)
      }

      if (input.reference) {
        await input.admin
          .from('billing_payment_method_updates')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            failed_at: null,
            error_message: null,
          })
          .eq('paystack_reference', input.reference)
      }

      logBillingEvent('payment_method_update_processed', {
        ecdId: metadataEcdId,
        reference: input.reference,
      })
    }

    if (invoiceId) {
      const { data: invoice, error: invoiceReadError } = await input.admin
        .from('invoices')
        .select('id,ecd_id,status,dunning_state')
        .eq('id', invoiceId)
        .maybeSingle()

      if (invoiceReadError || !invoice) {
        throw new Error(invoiceReadError?.message || 'Invoice not found for webhook event')
      }

      if (invoice.status !== 'paid') {
        const patch: Record<string, unknown> = {
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_last_event: input.eventType,
          payment_currency: asString(input.payload.data?.currency) ?? 'ZAR',
          paystack_reference: input.reference,
          paystack_event_processed_at: new Date().toISOString(),
        }
        if (invoice.dunning_state === 'grace' || invoice.dunning_state === 'suspended') {
          patch.dunning_state = 'reactivated'
        }

        const { error: invoiceUpdateError } = await input.admin.from('invoices').update(patch).eq('id', invoice.id)
        if (invoiceUpdateError) throw new Error(invoiceUpdateError.message)
      }

      const { error: subscriptionUpdateError } = await input.admin
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('ecd_id', invoice.ecd_id)
        .in('status', ['trial', 'past_due', 'suspended'])
      if (subscriptionUpdateError) throw new Error(subscriptionUpdateError.message)

      await deliverInvoiceReceipt({
        admin: input.admin,
        invoiceId: invoice.id,
      })

      logBillingEvent('invoice_payment_reconciled', {
        invoiceId: invoice.id,
        ecdId: invoice.ecd_id,
        reference: input.reference,
      })
    }

    const { error: eventUpdateError } = await input.admin
      .from('payment_webhook_events')
      .update({
        invoice_id: invoiceId,
        status: 'processed',
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', input.eventRowId)
    if (eventUpdateError) throw new Error(eventUpdateError.message)

    return { processed: true as const, status: 'processed' as const, invoiceId }
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

  logBillingEvent('paystack_webhook_ignored', {
    eventType: input.eventType,
    reference: input.reference,
    invoiceId,
  })

  return { processed: false as const, status: 'ignored' as const, invoiceId }
}
