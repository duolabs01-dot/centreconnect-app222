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

  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'paid') throw new Error('Invoice already paid')

  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('email,name')
    .eq('id', ecdId)
    .maybeSingle()

  const email = centre?.email ?? user.email ?? ''
  if (!email) throw new Error('No email on file to process payment')

  const result = await initializePaystackInvoicePayment({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amountZar: invoice.total,
    customerEmail: email,
    metadata: { ecd_id: ecdId },
  })

  redirect(result.authorizationUrl)
}
