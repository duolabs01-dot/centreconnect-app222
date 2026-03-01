'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateApplicationStatusAction } from './status-actions'

type StatusUpdateFormProps = {
  applicationId: string
  currentStatus: string
  currentNotes: string | null
  currentOfferAcceptedAt: string | null
}

const statusLabels: Record<string, string> = {
  approved: 'Approval sent. Parent must confirm to finalize.',
  enrolled: 'Enrollment confirmed.',
}

export function StatusUpdateForm({
  applicationId,
  currentStatus,
  currentNotes,
  currentOfferAcceptedAt,
}: StatusUpdateFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    startTransition(async () => {
      const result = await updateApplicationStatusAction({
        applicationId,
        status,
        notes,
      })

      if (!result.ok) {
        toast.error(result.error || 'Failed to update application')
        return
      }

      if (result.warning) {
        toast(result.warning)
      }

      toast.success(statusLabels[status] ?? 'Application updated')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="cc-native-field"
          disabled={Boolean(currentOfferAcceptedAt)}
        >
          <option value="submitted">Submitted</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="enrolled">Enrolled</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        {currentOfferAcceptedAt ? (
          <p className="text-xs text-slate-600">Parent has accepted this offer. Status changes are locked.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes for this application"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Update Application'}
      </Button>
    </form>
  )
}
