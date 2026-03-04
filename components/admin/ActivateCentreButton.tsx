'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

interface ActivateCentreButtonProps {
  tenantId: string
  onboardingFeePaid: boolean
  hasPendingTask: boolean
}

export function ActivateCentreButton({ tenantId, onboardingFeePaid, hasPendingTask }: ActivateCentreButtonProps) {
  const router = useRouter()
  const [isActivating, setIsActivating] = useState(false)
  const [, startTransition] = useTransition()

  const canActivate = onboardingFeePaid && hasPendingTask

  async function handleActivate() {
    if (!canActivate) return
    setIsActivating(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to activate centre')
      }

      toast.success('Centre activated successfully!')
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error.message || 'Error activating centre.')
    } finally {
      setIsActivating(false)
    }
  }

  if (!canActivate) {
    return null
  }

  return (
    <Button
      size="sm"
      loading={isActivating}
      loadingText="Activating..."
      className="bg-cyan-500 text-black hover:bg-cyan-400"
      onClick={handleActivate}
    >
      <CheckCircle2 className="mr-2 h-4 w-4" />
      Activate Centre
    </Button>
  )
}
