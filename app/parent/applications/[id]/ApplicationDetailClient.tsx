'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ApplicationTimeline from '@/components/parent/ApplicationTimeline'
import PlacementDecisionModal from '@/components/parent/PlacementDecisionModal'

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
