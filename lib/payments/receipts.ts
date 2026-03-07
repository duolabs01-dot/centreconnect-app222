import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { upsertNotificationLog } from '@/lib/admin/notification-logs'

type DeliverInvoiceReceiptInput = {
  admin: ReturnType<typeof createAdminClient>
  invoiceId: string
}

type ReceiptOutcome = {
  sent: boolean
  skipped: boolean
  reason?: string
}

type InvoiceRow = {
  id: string
  ecd_id: string
  invoice_number: string
  total: number | null
  status: string
  paid_at: string | null
  receipt_number: string | null
  receipt_sent_at: string | null
  payment_reference: string | null
  paystack_reference: string | null
  ecd_centres: { name?: string | null; email?: string | null } | { name?: string | null; email?: string | null }[] | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function receiptNumberFor(invoiceNumber: string) {
  const now = new Date()
  const tag = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  const compact = invoiceNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()
  return `RCPT-${tag}-${compact}`
}

function currency(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amount
  )
}

function buildReceiptHtml(input: {
  centreName: string
  invoiceNumber: string
  receiptNumber: string
  amount: number
  paidAt: string | null
  paymentReference: string | null
}) {
  const paidDate = input.paidAt ? new Date(input.paidAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Payment receipt</h2>
      <p>Hi ${input.centreName},</p>
      <p>We received your payment. Here is your receipt summary:</p>
      <ul>
        <li><strong>Receipt number:</strong> ${input.receiptNumber}</li>
        <li><strong>Invoice:</strong> ${input.invoiceNumber}</li>
        <li><strong>Amount paid:</strong> ${currency(input.amount)}</li>
        <li><strong>Paid at:</strong> ${paidDate}</li>
        <li><strong>Payment reference:</strong> ${input.paymentReference ?? '-'}</li>
      </ul>
      <p>Thank you for using CentreConnect.</p>
    </div>
  `
}

export async function deliverInvoiceReceipt(input: DeliverInvoiceReceiptInput): Promise<ReceiptOutcome> {
  const { data: invoice, error: readError } = await input.admin
    .from('invoices')
    .select(
      'id,ecd_id,invoice_number,total,status,paid_at,receipt_number,receipt_sent_at,payment_reference,paystack_reference,ecd_centres(name,email)'
    )
    .eq('id', input.invoiceId)
    .maybeSingle()

  if (readError || !invoice) {
    return { sent: false, skipped: true, reason: readError?.message ?? 'Invoice not found for receipt delivery' }
  }

  const row = invoice as InvoiceRow
  if (row.status !== 'paid' || !row.paid_at) {
    return { sent: false, skipped: true, reason: 'Invoice is not paid yet' }
  }

  if (row.receipt_sent_at) {
    return { sent: false, skipped: true, reason: 'Receipt already sent' }
  }

  const centre = normalizeOne(row.ecd_centres)
  const recipient = centre?.email?.trim()
  if (!recipient) {
    await input.admin.from('invoices').update({ receipt_last_error: 'Centre email missing for receipt delivery' }).eq('id', row.id)
    return { sent: false, skipped: true, reason: 'Centre email missing' }
  }

  const receiptNumber = row.receipt_number ?? receiptNumberFor(row.invoice_number)
  const paidAmount = Number(row.total ?? 0)
  const paymentReference = row.paystack_reference ?? row.payment_reference

  const result = await sendEmail({
    to: recipient,
    subject: `Receipt ${receiptNumber} for ${row.invoice_number}`,
    html: buildReceiptHtml({
      centreName: centre?.name?.trim() || 'there',
      invoiceNumber: row.invoice_number,
      receiptNumber,
      amount: paidAmount,
      paidAt: row.paid_at,
      paymentReference,
    }),
  })

  if (!result.success) {
    await input.admin
      .from('invoices')
      .update({
        receipt_number: receiptNumber,
        receipt_last_error: result.error ?? 'Receipt delivery failed',
      })
      .eq('id', row.id)

    await upsertNotificationLog(input.admin, {
      centreId: row.ecd_id,
      eventKey: `billing_receipt:${row.id}`,
      eventType: 'billing_receipt',
      channel: 'email',
      recipient,
      status: 'failed',
      provider: 'resend',
      errorMessage: result.error ?? 'Receipt delivery failed',
      payload: {
        invoiceId: row.id,
        invoiceNumber: row.invoice_number,
        receiptNumber,
      },
    })

    return { sent: false, skipped: false, reason: result.error ?? 'Receipt delivery failed' }
  }

  const sentAt = new Date().toISOString()
  await input.admin
    .from('invoices')
    .update({
      receipt_number: receiptNumber,
      receipt_sent_at: sentAt,
      receipt_last_error: null,
    })
    .eq('id', row.id)

  await upsertNotificationLog(input.admin, {
    centreId: row.ecd_id,
    eventKey: `billing_receipt:${row.id}`,
    eventType: 'billing_receipt',
    channel: 'email',
    recipient,
    status: 'sent',
    provider: 'resend',
    providerMessageId: result.messageId ?? null,
    payload: {
      invoiceId: row.id,
      invoiceNumber: row.invoice_number,
      receiptNumber,
      paidAt: row.paid_at,
      paymentReference,
    },
    createdAt: sentAt,
  })

  return { sent: true, skipped: false }
}
