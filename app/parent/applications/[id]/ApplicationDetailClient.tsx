'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import ApplicationTimeline from '@/components/parent/ApplicationTimeline'
import PlacementDecisionModal from '@/components/parent/PlacementDecisionModal'
import { formatDate } from '@/lib/utils'

type TimelineEvent = {
  status: 'submitted' | 'in_review' | 'approved' | 'enrolled' | 'waitlisted' | 'rejected' | 'withdrawn'
  created_at: string
  notes?: string
}

type ApplicationDetailClientProps = {
  id: string
  applicationNumber: string
  status: string
  submittedAt: string
  startDate: string | null
  parentMessage?: string | null
  adminNotes: string | null
  acceptedAt: string | null
  centreName: string
  centreSuburb: string
  centreSlug: string
  childFirstName: string
  childLastName: string
  history: TimelineEvent[]
  showMultipleApplicationsNotice: boolean
}

export default function ApplicationDetailClient({
  id,
  applicationNumber,
  status,
  submittedAt,
  startDate,
  parentMessage: initialParentMessage,
  acceptedAt,
  centreName,
  centreSuburb,
  childFirstName,
  childLastName,
  history,
  showMultipleApplicationsNotice,
}: ApplicationDetailClientProps) {
  const router = useRouter()
  const [decisionOpen, setDecisionOpen] = useState(status === 'approved' && !acceptedAt)
  const [isEditing, setIsEditing] = useState(false)
  const [parentMessage, setParentMessage] = useState(initialParentMessage ?? '')
  const [editMessage, setEditMessage] = useState(initialParentMessage ?? '')
  const [isSaving, startSave] = useTransition()

  const childName = useMemo(
    () => `${childFirstName}${childLastName ? ` ${childLastName}` : ''}`.trim(),
    [childFirstName, childLastName]
  )

  const normalizeStatus = (value: string): TimelineEvent['status'] =>
    value === 'submitted' ||
    value === 'in_review' ||
    value === 'approved' ||
    value === 'enrolled' ||
    value === 'waitlisted' ||
    value === 'rejected' ||
    value === 'withdrawn'
      ? value
      : 'submitted'

  const currentStatus = normalizeStatus(status)
  const timelineHistory =
    history.length > 0
      ? history.map((item) => ({
          ...item,
          status: normalizeStatus(item.status),
          notes: item.notes ?? undefined,
        }))
      : [{ status: currentStatus, created_at: submittedAt }]

  async function onAccept() {
    const response = await fetch(`/api/parent/applications/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    const payload = (await response.json()) as { ok?: boolean; error?: string; withdrawnCount?: number }
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Failed to accept offer')
    }
    if ((payload.withdrawnCount ?? 0) > 0) {
      toast.success('Other active applications were withdrawn automatically.')
    }
    setDecisionOpen(false)
    router.refresh()
  }

  async function onDecline() {
    const response = await fetch(`/api/parent/applications/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })
    const payload = (await response.json()) as { ok?: boolean; error?: string }
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Failed to decline offer')
    }
    setDecisionOpen(false)
    router.refresh()
  }

  return (
    <div style={{ fontFamily: 'var(--font-parent)', padding: '0 0 32px' }}>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => router.back()}> {'\u2190'} Back </button>
        <button onClick={() => router.push('/parent/dashboard')}>Home</button>
      </div>
      <h1>{childFirstName}&apos;s Application</h1>
      <p>
        {centreName} {'\u00b7'} {centreSuburb}
      </p>
      {showMultipleApplicationsNotice ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          This centre can see that this child has multiple active applications because you enabled this sharing preference.
        </p>
      ) : null}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Application Summary</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Child</p>
            <p className="text-sm font-semibold text-slate-900">
              {childFirstName} {childLastName}
            </p>
          </div>
          {startDate && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Preferred start</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(startDate)}</p>
            </div>
          )}
          <div>
            <p className="mb-1 text-sm text-slate-600">Your message to the centre</p>
            {parentMessage ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">{parentMessage}</p>
            ) : (
              <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                No message added yet.
              </p>
            )}
            {status === 'submitted' && (
              <div className="mt-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-cyan-700 hover:text-cyan-800">
                    Edit message {'\u2192'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="cc-native-field min-h-[80px] w-full rounded-xl p-3 text-sm"
                      placeholder="Your message to the centre..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          startSave(async () => {
                            const supabase = createClient()
                            const { error } = await supabase
                              .from('applications')
                              .update({ parent_message: editMessage })
                              .eq('id', id)
                            if (error) {
                              toast.error(error.message || 'Failed to update message')
                              return
                            }
                            setParentMessage(editMessage)
                            setIsEditing(false)
                            toast.success('Message updated')
                          })
                        }}
                        disabled={isSaving}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setEditMessage(parentMessage ?? '')
                        }}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {status !== 'submitted' && (
              <p className="mt-1 text-xs text-slate-400">
                Contact the centre directly to request changes after review starts.
              </p>
            )}
          </div>
        </div>
      </div>
      <ApplicationTimeline
        currentStatus={currentStatus}
        history={timelineHistory}
        centreName={centreName}
        childName={childName}
        applicationNumber={applicationNumber}
      />
      <PlacementDecisionModal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        onAccept={onAccept}
        onDecline={onDecline}
        centreName={centreName}
        centreSuburb={centreSuburb}
        childName={childName}
        startDate={startDate ?? undefined}
      />
    </div>
  )
}
