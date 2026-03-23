'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { beginPaymentMethodUpdateAction, type PaymentMethodUpdateResult } from './actions'

export function PaymentMethodUpdateButton() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async () => {
    setIsPending(true)
    setError(null)
    try {
      const res = await beginPaymentMethodUpdateAction()
      if (res.success) {
        window.location.href = res.authorizationUrl
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment method.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleUpdate}
        disabled={isPending}
        className="w-full sm:w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-colors shadow-sm"
      >
        {isPending ? 'Redirecting to Paystack...' : 'Update Payment Method'}
      </Button>
      {error && (
        <p className="text-sm text-rose-600 font-medium">{error}</p>
      )}
    </div>
  )
}
