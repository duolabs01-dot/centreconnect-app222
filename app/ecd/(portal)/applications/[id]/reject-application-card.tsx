'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  REJECTION_REASON_OPTIONS,
  getRejectionReasonMessage,
  type RejectionReasonCode,
} from '@/lib/admissions/rejection-reasons'
import { rejectApplicationWithReasonAction } from './offer-actions'

type RejectApplicationCardProps = {
  applicationId: string
  currentStatus: string
  offerAcceptedAt: string | null
}

export function RejectApplicationCard({
  applicationId,
  currentStatus,
  offerAcceptedAt,
}: RejectApplicationCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reasonCode, setReasonCode] = useState<RejectionReasonCode>('no_space_available')
  const [reasonNote, setReasonNote] = useState('')

  const isLocked = Boolean(offerAcceptedAt) || currentStatus === 'enrolled'
  const helperMessage = useMemo(() => getRejectionReasonMessage(reasonCode), [reasonCode])

  function handleReject() {
    if (isLocked || isPending) return
    const confirmed = window.confirm('Reject this application and share reason with parent?')
    if (!confirmed) return

    startTransition(async () => {
      const result = await rejectApplicationWithReasonAction({
        applicationId,
        reasonCode,
        reasonNote,
      })
      if (!result.ok) {
        toast.error(result.error || 'Unable to reject application.')
        return
      }
      toast.success(result.message || 'Application rejected.')
      router.refresh()
    })
  }

  return (
    <Card className="rounded-3xl border-rose-200 bg-rose-50/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-rose-900">Reject With Reason</CardTitle>
        <p className="text-xs text-rose-800">
          Rejections are only sent when you explicitly reject here. Parent will see this reason in their application view.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLocked ? (
          <div className="rounded-2xl border border-rose-200 bg-white p-3 text-xs text-rose-800">
            This application is locked because the offer has already been accepted or enrollment is complete.
          </div>
        ) : null}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-rose-700">Reason template</label>
          <select
            className="cc-native-field h-11 rounded-2xl border-rose-200 bg-white"
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value as RejectionReasonCode)}
            disabled={isLocked}
          >
            {REJECTION_REASON_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-rose-900">{helperMessage}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-rose-700">
            Additional note {reasonCode === 'other' ? '(required)' : '(optional)'}
          </label>
          <Textarea
            value={reasonNote}
            onChange={(event) => setReasonNote(event.target.value)}
            placeholder="Add context to help the parent understand next steps."
            className="min-h-[84px] rounded-2xl border-rose-200 bg-white"
            disabled={isLocked}
          />
        </div>

        <Button
          type="button"
          onClick={handleReject}
          disabled={isLocked || isPending}
          className="h-11 w-full rounded-2xl bg-rose-600 font-bold text-white hover:bg-rose-700"
        >
          {isPending ? 'Rejecting...' : 'Reject Application'}
        </Button>
      </CardContent>
    </Card>
  )
}

