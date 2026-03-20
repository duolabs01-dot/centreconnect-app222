'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { beginPaymentMethodUpdateAction } from '@/app/ecd/(portal)/billing/actions'
import { toast } from 'sonner'

export function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handlePay() {
    setLoading(true)
    try {
      const result = await beginPaymentMethodUpdateAction({ invoiceId })
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl
      } else {
        toast.error(result?.error || 'Could not start payment. Please try again.')
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePay}
      disabled={loading}
      className="h-9 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
    >
      {loading ? 'Redirecting...' : 'Update Payment Method'}
    </Button>
  )
}
