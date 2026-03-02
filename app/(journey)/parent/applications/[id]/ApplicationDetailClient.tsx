'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
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
  childId: string
  ecdId: string
  parentId: string
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

type PickupCodeSectionProps = {
  applicationId: string
  childId: string
  ecdId: string
  parentId: string
}

function PickupCodeSection({ applicationId, childId, ecdId, parentId }: PickupCodeSectionProps) {
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadActiveCode() {
      if (!childId || !ecdId) return
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('pickup_codes')
        .select('id,code,expires_at,used,locked')
        .eq('child_id', childId)
        .eq('ecd_id', ecdId)
        .eq('used', false)
        .eq('locked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      if (data?.code) {
        setCode(data.code)
        setExpiresAt(data.expires_at ?? null)
      }
    }

    void loadActiveCode()

    return () => {
      active = false
    }
  }, [childId, ecdId])

  async function generateCode() {
    if (!childId || !ecdId || !parentId) return
    setGenerating(true)
    setError(null)
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString()
    const nextExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const supabase = createClient()

    try {
      const { data, error: rpcError } = await supabase.rpc('generate_pickup_code_atomic', {
        p_ecd_id: ecdId,
        p_child_id: childId,
        p_parent_id: parentId,
        p_generated_by_role: 'parent',
        p_code: randomCode,
        p_expires_at: nextExpiresAt,
      })

      if (rpcError) {
        setError(rpcError.message)
        toast.error('Could not generate code')
        return
      }

      const result = data as { success?: boolean; error?: string } | null
      if (!result?.success) {
        setError(result?.error ?? 'unknown')
        toast.error('Could not generate code')
        return
      }

      setCode(randomCode)
      setExpiresAt(nextExpiresAt)
      toast.success('Pickup code generated')
    } finally {
      setGenerating(false)
    }
  }

  if (code) {
    return (
      <section data-application-id={applicationId} className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">{`Today's Pickup Code`}</p>
          <p className="mt-2 text-4xl font-black tracking-[0.3em] text-cyan-900">{code}</p>
          <p className="mt-1 text-xs text-slate-500">
            Show this to the crèche staff at pickup. Expires {expiresAt ? formatDate(expiresAt) : 'soon'}.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section data-application-id={applicationId} className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pickup Code</p>
        <p className="mt-1 text-sm text-slate-600">{`No active code. Generate one for today's pickup.`}</p>
        <button
          type="button"
          onClick={generateCode}
          disabled={generating}
          className="mt-3 rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Pickup Code'}
        </button>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </div>
    </section>
  )
}

export default function ApplicationDetailClient({
  id,
  applicationNumber,
  status,
  submittedAt,
  childId,
  ecdId,
  parentId,
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
  const [isWithdrawing, startWithdraw] = useTransition()

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
  const canWithdraw = ['draft', 'partial', 'submitted', 'in_review', 'waitlisted', 'approved'].includes(status)
  const withdrawLabel = status === 'approved' ? 'Cancel application' : 'Withdraw application'

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

  function onWithdraw() {
    const confirmed = window.confirm('Withdraw this application? You can re-apply later if needed.')
    if (!confirmed) return

    startWithdraw(async () => {
      const response = await fetch(`/api/parent/applications/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) {
        toast.error(payload.error || 'Failed to withdraw application')
        return
      }
      toast.success('Application withdrawn')
      router.refresh()
    })
  }

  return (
    <div style={{ fontFamily: 'var(--font-parent)', padding: '0 0 32px' }}>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          {'\u2190'} Back
        </button>
        <button
          onClick={() => router.push('/parent/dashboard')}
          className="rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          Home
        </button>
      </div>
      <h1>{childFirstName}&apos;s Application</h1>
      <p>
        {centreName} {'\u00b7'} {centreSuburb}
      </p>
      {canWithdraw ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onWithdraw}
            disabled={isWithdrawing}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
          >
            {isWithdrawing ? 'Processing...' : withdrawLabel}
          </button>
        </div>
      ) : null}
      {showMultipleApplicationsNotice ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          This crèche can see that this child has multiple active applications because you enabled this sharing preference.
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
            <p className="mb-1 text-sm text-slate-600">Your message to the crèche</p>
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
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-2xl px-2 py-1 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    Edit message {'\u2192'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="cc-native-field min-h-[80px] w-full rounded-xl p-3 text-sm"
                      placeholder="Your message to the crèche..."
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
                        className="rounded-2xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setEditMessage(parentMessage ?? '')
                        }}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
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
                Contact the crèche directly to request changes after review starts.
              </p>
            )}
          </div>
        </div>
      </div>
      {status === 'enrolled' && (
        <PickupCodeSection
          applicationId={id}
          childId={childId || ''}
          ecdId={ecdId}
          parentId={parentId}
        />
      )}
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


