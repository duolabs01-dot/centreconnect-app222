'use client'

import { useTransition } from 'react'
import { payInvoiceAction } from '@/lib/actions/ecd/pay-invoice'
import { toast } from 'sonner'

export function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      try {
        await payInvoiceAction(invoiceId)
      } catch (error: any) {
        toast.error(error.message || 'Payment could not be started')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Opening...' : 'Pay Now'}
    </button>
  )
}
