'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type DisconnectCentreButtonProps = {
  tenantId: string
}

export function DisconnectCentreButton({ tenantId }: DisconnectCentreButtonProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  async function handleDisconnect() {
    if (!confirm('This will purge admin accounts, reset the centre to a “paused” state, and leave only the directory contact info. Continue?')) {
      return
    }

    setBusy(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to disconnect centre')
      }

      toast.success('Centre disconnected from CentreConnect.')
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Error disconnecting centre.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      loading={busy}
      loadingText="Disconnecting..."
      className="bg-rose-500 text-white hover:bg-rose-400"
      onClick={handleDisconnect}
    >
      Disconnect Centre
    </Button>
  )
}
