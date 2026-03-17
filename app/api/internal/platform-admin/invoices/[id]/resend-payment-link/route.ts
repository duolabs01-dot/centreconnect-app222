import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializePaystackInvoicePayment } from '@/lib/payments/paystack'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendEmail } from '@/lib/email/send'
import { createNotificationEventKey, upsertNotificationLog } from '@/lib/admin/notification-logs'
import { logBillingEvent } from '@/lib/payments/structured-logs'

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: invoiceId } = await context.params
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invoice, error: readError } = await admin
    .from('invoices')
    .select('id,invoice_number,status,total,ecd_id,issued_at,payment_url,payment_reference,ecd_centres(name,slug,email)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (readError || !invoice) return NextResponse.json({ error: readError?.message || 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid' || invoice.status === 'canceled') {
    return NextResponse.json({ error: `Cannot resend payment link for invoice with status "${invoice.status}"` }, { status: 409 })
  }

  const centre = normalizeOne(invoice.ecd_centres as { name?: string; slug?: string; email?: string } | null)
  const customerEmail = centre?.email?.trim()
  if (!customerEmail) return NextResponse.json({ error: 'Centre email is missing; cannot resend payment link.' }, { status: 400 })

  let paymentUrl = invoice.payment_url ?? null
  let reference = invoice.payment_reference ?? null

  if (!paymentUrl || !reference) {
    try {
      const payment = await initializePaystackInvoicePayment({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amountZar: Number(invoice.total ?? 0),
        customerEmail,
        metadata: {
          ecd_id: invoice.ecd_id,
          centre_slug: centre?.slug ?? null,
          source: 'resend_payment_link',
        },
      })

      paymentUrl = payment.authorizationUrl
      reference = payment.reference

      const patch: Record<string, unknown> = {
        payment_provider: payment.provider,
        payment_reference: payment.reference,
        payment_currency: payment.currency,
        payment_url: payment.authorizationUrl,
      }
      if (invoice.status === 'draft') {
        patch.status = 'sent'
        patch.issued_at = invoice.issued_at ?? new Date().toISOString()
      }

      const { error: updateError } = await admin.from('invoices').update(patch).eq('id', invoice.id)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize payment link'
      logBillingEvent('resend_payment_link_initialize_failed', { invoiceId, message }, 'error')
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  const subject = `Payment link for invoice ${invoice.invoice_number}`
  const amount = formatAmount(Number(invoice.total ?? 0))
  const html = `
    <div style="font-family: Arial, sans-serif; color: rgb(15,23,42); line-height: 1.5;">
      <h2 style="margin: 0 0 10px 0;">Invoice payment link</h2>
      <p>Hi ${centre?.name?.trim() || 'there'},</p>
      <p>Your payment link has been re-issued for invoice <strong>${invoice.invoice_number}</strong>.</p>
      <p><strong>Amount:</strong> ${amount}</p>
      <p><strong>Reference:</strong> ${reference ?? '-'}</p>
      <p><a href="${paymentUrl}" style="display:inline-block;padding:10px 16px;background:rgb(13,148,136);color:rgb(255,255,255);border-radius:8px;text-decoration:none;">Pay now</a></p>
      <p>If the button does not open, copy this URL:</p>
      <p>${paymentUrl}</p>
    </div>
  `

  const emailResult = await sendEmail({
    to: customerEmail,
    subject,
    html,
  })

  const eventKey = createNotificationEventKey('billing_payment_link_resend', invoice.ecd_id)
  await upsertNotificationLog(admin, {
    centreId: invoice.ecd_id,
    eventKey,
    eventType: 'billing_payment_link_resend',
    channel: 'email',
    recipient: customerEmail,
    status: emailResult.success ? 'sent' : 'failed',
    provider: emailResult.provider ?? 'smtp',
    providerMessageId: emailResult.messageId ?? null,
    errorMessage: emailResult.error ?? null,
    payload: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      reference,
      paymentUrl,
      actorUserId: platformAdmin.userId,
    },
  })

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'invoice',
    entityId: invoice.ecd_id,
    action: 'resend_payment_link',
    summary: `Resent payment link for invoice ${invoice.invoice_number}`,
    details: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      reference,
      paymentUrl,
      recipient: customerEmail,
      emailSent: emailResult.success,
      emailError: emailResult.error ?? null,
    },
  })

  logBillingEvent('resend_payment_link_completed', {
    invoiceId: invoice.id,
    reference,
    recipient: customerEmail,
    sent: emailResult.success,
  })

  if (!emailResult.success) {
    return NextResponse.json(
      {
        ok: false,
        error: emailResult.error ?? 'Failed to send payment link email',
        paymentUrl,
        reference,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    invoiceId: invoice.id,
    paymentUrl,
    reference,
    recipient: customerEmail,
  })
}

