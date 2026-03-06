'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/cc-admin/Button'

type Props = {
  counterAgeMinutes: number | null
  thresholdMinutes: number
}

export function StaleWarningAckButton({ counterAgeMinutes, thresholdMinutes }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function acknowledge() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/internal/platform-admin/revenue/stale-warning-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterAgeMinutes,
          thresholdMinutes,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to acknowledge stale warning')

      toast.success('Stale warning acknowledged and logged.')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to acknowledge stale warning')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-2 border-rose-600/60 bg-rose-950/20 text-rose-100 hover:bg-rose-900/30"
      disabled={submitting}
      onClick={() => void acknowledge()}
    >
      Acknowledge warning
    </Button>
  )
}

