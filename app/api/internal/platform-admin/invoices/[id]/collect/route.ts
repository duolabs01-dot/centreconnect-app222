import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializePaystackInvoicePayment } from '@/lib/payments/paystack'
import { writePlatformActivity } from '@/lib/admin/activity-log'

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(_request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: invoiceId } = await context.params
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invoice, error: readError } = await admin
    .from('invoices')
    .select('id,invoice_number,status,total,ecd_id,issued_at,ecd_centres(name,slug,email)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (readError || !invoice) {
    return NextResponse.json({ error: readError?.message || 'Invoice not found' }, { status: 404 })
  }

  if (invoice.status === 'paid' || invoice.status === 'canceled') {
    return NextResponse.json({ error: `Cannot collect payment for invoice with status "${invoice.status}"` }, { status: 409 })
  }

  const centre = normalizeOne(invoice.ecd_centres as { name?: string; slug?: string; email?: string } | null)
  const customerEmail = centre?.email?.trim()
  if (!customerEmail) {
    return NextResponse.json({ error: 'Centre email is missing; cannot initialize payment.' }, { status: 400 })
  }

  try {
    const payment = await initializePaystackInvoicePayment({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amountZar: Number(invoice.total ?? 0),
      customerEmail,
      metadata: {
        ecd_id: invoice.ecd_id,
        centre_slug: centre?.slug ?? null,
      },
    })

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
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'invoice',
      entityId: invoice.ecd_id,
      action: 'collect_invoice_payment',
      summary: `Initialized payment for invoice ${invoice.invoice_number}`,
      details: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        provider: payment.provider,
        reference: payment.reference,
        amount: Number(invoice.total ?? 0),
      },
    })

    return NextResponse.json({
      ok: true,
      provider: payment.provider,
      invoiceId: invoice.id,
      reference: payment.reference,
      authorizationUrl: payment.authorizationUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize payment'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
