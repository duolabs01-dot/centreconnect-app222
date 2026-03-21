'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializePaystackPaymentMethodUpdate } from '@/lib/payments/paystack'

const cancellationSchema = z.object({
  reason: z.string().max(1500).optional(),
})

const financialSnapshotSchema = z.object({
  period_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  revenue_total: z.coerce.number().finite().min(0).max(999999999),
  expenses_total: z.coerce.number().finite().min(0).max(999999999),
  assets_total: z.coerce.number().finite().min(0).max(999999999),
  liabilities_total: z.coerce.number().finite().min(0).max(999999999),
  notes: z.string().max(2000).optional(),
})

export async function requestCancellationAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  const parsed = cancellationSchema.safeParse({
    reason: String(formData.get('reason') ?? '').trim(),
  })

  if (!parsed.success) return

  const ticketNumber = `BILL-${Date.now().toString().slice(-8)}`
  await session.supabase.from('support_tickets').insert({
    ticket_number: ticketNumber,
    ecd_id: session.ecdId,
    created_by: session.user.id,
    subject: 'Subscription cancellation request',
    description:
      parsed.data.reason?.trim() || 'Please assist with subscription cancellation and final invoice process.',
    category: 'billing',
    priority: 3,
    status: 'open',
  })

  revalidatePath('/ecd/billing')
}

export async function saveFinancialSnapshotAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role === 'ecd_staff') return

  const parsed = financialSnapshotSchema.safeParse({
    period_month: String(formData.get('period_month') ?? '').trim(),
    revenue_total: formData.get('revenue_total'),
    expenses_total: formData.get('expenses_total'),
    assets_total: formData.get('assets_total'),
    liabilities_total: formData.get('liabilities_total'),
    notes: String(formData.get('notes') ?? '').trim(),
  })

  if (!parsed.success) return

  await session.supabase.from('ecd_financial_snapshots').upsert(
    {
      ecd_id: session.ecdId,
      period_month: parsed.data.period_month,
      revenue_total: parsed.data.revenue_total,
      expenses_total: parsed.data.expenses_total,
      assets_total: parsed.data.assets_total,
      liabilities_total: parsed.data.liabilities_total,
      notes: parsed.data.notes || null,
    },
    { onConflict: 'ecd_id,period_month' }
  )

  revalidatePath('/ecd/billing')
}

export async function beginPaymentMethodUpdateAction() {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin') return

  const { data: centre } = await session.supabase.from('ecd_centres').select('id,email').eq('id', session.ecdId).maybeSingle()
  const customerEmail = centre?.email?.trim() || session.user.email?.trim() || null
  if (!customerEmail) return

  const updateAmount = (() => {
    const parsed = Number(process.env.PAYSTACK_PAYMENT_METHOD_UPDATE_AMOUNT_ZAR)
    if (!Number.isFinite(parsed) || parsed <= 0) return 5
    return parsed
  })()

  const payment = await initializePaystackPaymentMethodUpdate({
    ecdId: session.ecdId,
    customerEmail,
    initiatedByUserId: session.user.id,
    amountZar: updateAmount,
    metadata: {
      source: 'ecd_billing_self_serve',
    },
  })

  const admin = createAdminClient()
  await admin.from('billing_payment_method_updates').insert({
    ecd_id: session.ecdId,
    initiated_by: session.user.id,
    paystack_reference: payment.reference,
    payment_url: payment.authorizationUrl,
    amount: updateAmount,
    currency: payment.currency,
    status: 'pending',
  })

  revalidatePath('/ecd/billing')
  redirect(payment.authorizationUrl)
}

