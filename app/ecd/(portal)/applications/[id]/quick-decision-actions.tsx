'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateApplicationStatusAction } from './status-actions'

type QuickDecisionActionsProps = {
  applicationId: string
  currentStatus: string
  currentNotes: string | null
  currentOfferAcceptedAt: string | null
}

export function QuickDecisionActions({
  applicationId,
  currentStatus,
  currentNotes,
  currentOfferAcceptedAt,
}: QuickDecisionActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function applyStatus(nextStatus: 'approved' | 'waitlisted' | 'rejected') {
    if (currentOfferAcceptedAt && nextStatus !== 'approved') {
      toast.error('This offer was already accepted. Status is locked.')
      return
    }

    startTransition(async () => {
      const result = await updateApplicationStatusAction({
        applicationId,
        status: nextStatus,
        notes: currentNotes ?? undefined,
      })

      if (!result.ok) {
        toast.error(result.error || 'Unable to update application.')
        return
      }

      toast.success(
        nextStatus === 'approved'
          ? 'Application approved.'
          : nextStatus === 'waitlisted'
            ? 'Application moved to waitlist.'
            : 'Application rejected.'
      )
      if (result.warning) toast(result.warning)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Button
        type="button"
        className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={isPending || currentStatus === 'approved'}
        onClick={() => applyStatus('approved')}
      >
        Approve
      </Button>
      <Button
        type="button"
        className="h-11 rounded-2xl bg-amber-500 text-white hover:bg-amber-600"
        disabled={isPending || currentStatus === 'waitlisted'}
        onClick={() => applyStatus('waitlisted')}
      >
        Waitlist
      </Button>
      <Button
        type="button"
        className="h-11 rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
        disabled={isPending || currentStatus === 'rejected'}
        onClick={() => applyStatus('rejected')}
      >
        Reject
      </Button>
    </div>
  )
}

