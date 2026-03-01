'use server'

import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { initializePaystackInvoicePayment } from '@/lib/payments/paystack'

export async function payInvoiceAction(invoiceId: string) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id,invoice_number,total,status')
    .eq('id', invoiceId)
    .eq('ecd_id', ecdId)
    .maybeSingle()

  if (!invoice) return { error: 'Invoice not found' }
  if (invoice.status === 'paid') return { error: 'Invoice already paid' }

  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('email,name')
    .eq('id', ecdId)
    .maybeSingle()

  const email = centre?.email ?? user.email ?? ''
  if (!email) return { error: 'No email on file to process payment' }

  try {
    const result = await initializePaystackInvoicePayment({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amountZar: invoice.total,
      customerEmail: email,
      metadata: { ecd_id: ecdId },
    })

    redirect(result.authorizationUrl)
  } catch (err) {
    // Re-throw redirect (Next.js uses throw for redirects)
    if (err && typeof err === 'object' && 'digest' in err) throw err
    return { error: 'Failed to initialize payment. Please try again.' }
  }
}
