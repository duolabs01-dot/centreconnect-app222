'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

type ActivateAccountClientProps = {
  defaultRedirectTo: string
}

export function ActivateAccountClient({ defaultRedirectTo }: ActivateAccountClientProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleActivate() {
    if (submitting) return
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/activate-role-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        redirectTo?: string
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Could not activate your account right now.')
      }

      router.push(payload.redirectTo || defaultRedirectTo)
      router.refresh()
    } catch (activationError: any) {
      setError(activationError?.message || 'Could not activate your account right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="h-11 rounded-2xl bg-teal-600 px-6 text-sm font-black text-white hover:bg-teal-500"
        onClick={handleActivate}
        disabled={submitting}
      >
        {submitting ? 'Activating...' : 'Activate your account'}
      </Button>
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  )
}

