'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import ApplicationTimeline from '@/components/parent/ApplicationTimeline'
import PlacementDecisionModal from '@/components/parent/PlacementDecisionModal'
import { Button } from '@/components/ui/button'
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
  missingDocuments: string[]
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
        <Button
          type="button"
          onClick={generateCode}
          disabled={generating}
          className="mt-3 h-10 rounded-2xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700"
        >
          {generating ? 'Generating...' : 'Generate Pickup Code'}
        </Button>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </div>
    </section>
  )
}

export default function ApplicationDetailClient({
  id,
  applicationNumber,
  status: initialStatus,
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
  history: initialHistory,
  missingDocuments: initialMissingDocuments,
  showMultipleApplicationsNotice,
}: ApplicationDetailClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [liveStatus, setLiveStatus] = useState(initialStatus)
  const [liveAcceptedAt, setLiveAcceptedAt] = useState(acceptedAt)
  const [liveHistory, setLiveHistory] = useState<TimelineEvent[]>(initialHistory)
  const [liveMissingDocuments, setLiveMissingDocuments] = useState(initialMissingDocuments)
  const [decisionOpen, setDecisionOpen] = useState(initialStatus === 'approved' && !acceptedAt)
  const [isEditing, setIsEditing] = useState(false)
  const [parentMessage, setParentMessage] = useState(initialParentMessage ?? '')
  const [editMessage, setEditMessage] = useState(initialParentMessage ?? '')
  const [isSaving, startSave] = useTransition()
  const [isWithdrawing, startWithdraw] = useTransition()
  const statusRef = useRef(initialStatus)

  const childName = useMemo(
    () => `${childFirstName}${childLastName ? ` ${childLastName}` : ''}`.trim(),
    [childFirstName, childLastName]
  )

  const normalizeStatus = (value: string): TimelineEvent['status'] =>
    value === 'draft' ||
    value === 'partial' ||
    value === 'submitted' ||
    value === 'in_review' ||
    value === 'approved' ||
    value === 'enrolled' ||
    value === 'waitlisted' ||
    value === 'rejected' ||
    value === 'withdrawn'
      ? value === 'draft' || value === 'partial'
        ? 'submitted'
        : value
      : 'submitted'

  const currentStatus = normalizeStatus(liveStatus)
  const timelineHistory =
    liveHistory.length > 0
      ? liveHistory.map((item) => ({
          ...item,
          status: normalizeStatus(item.status),
          notes: item.notes ?? undefined,
        }))
      : [{ status: currentStatus, created_at: submittedAt }]
  const canWithdraw = ['draft', 'partial', 'submitted', 'in_review', 'waitlisted', 'approved'].includes(liveStatus)
  const withdrawLabel = liveStatus === 'approved' ? 'Cancel application' : 'Withdraw application'

  useEffect(() => {
    statusRef.current = liveStatus
    if (liveStatus === 'approved' && !liveAcceptedAt) {
      setDecisionOpen(true)
    }
  }, [liveAcceptedAt, liveStatus])

  useEffect(() => {
    const channel = supabase
      .channel(`parent-application-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications', filter: `id=eq.${id}` },
        (payload) => {
          const nextApplication = payload.new as {
            status?: string
            offer_accepted_at?: string | null
            parent_message?: string | null
            missing_documents?: unknown
          }

          if (nextApplication.status && nextApplication.status !== statusRef.current) {
            toast.success(`✨ Good news! Status is now "${nextApplication.status.replaceAll('_', ' ')}"`)
            setLiveStatus(nextApplication.status)
          }
          if (nextApplication.offer_accepted_at !== undefined) {
            setLiveAcceptedAt(nextApplication.offer_accepted_at ?? null)
          }
          if (nextApplication.parent_message !== undefined && typeof nextApplication.parent_message === 'string') {
            setParentMessage(nextApplication.parent_message)
            setEditMessage(nextApplication.parent_message)
          }
          if (Array.isArray(nextApplication.missing_documents)) {
            setLiveMissingDocuments(
              nextApplication.missing_documents.map((entry) => String(entry).trim()).filter(Boolean)
            )
          }
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'application_status_history', filter: `application_id=eq.${id}` },
        (payload) => {
          const nextHistory = payload.new as {
            new_status?: string
            created_at?: string
            notes?: string | null
          }
          const nextStatus = nextHistory.new_status
          const nextCreatedAt = nextHistory.created_at
          if (!nextStatus || !nextCreatedAt) return
          setLiveHistory((current) => [
            ...current,
            {
              status: normalizeStatus(nextStatus),
              created_at: nextCreatedAt,
              notes: nextHistory.notes ?? undefined,
            },
          ])
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const nextNotification = payload.new as {
            application_id?: string | null
            title?: string
            message?: string
          }
          if (nextNotification.application_id !== id) return
          toast(nextNotification.title ?? 'New update from your crèche', {
            description: nextNotification.message ?? 'Open your Application Journey for details.',
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id, parentId, router, supabase])

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

  function goBackToApplications() {
    router.push('/parent/applications')
  }

  return (
    <div style={{ fontFamily: 'var(--font-parent)', padding: '0 0 32px' }}>
      <div className="mb-3 hidden items-center gap-2 md:flex">
        <Button
          type="button"
          variant="ghost"
          onClick={goBackToApplications}
          className="h-8 rounded-2xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800"
        >
          {'\u2190'} Back
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/parent/dashboard')}
          className="h-8 rounded-2xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800"
        >
          Home
        </Button>
      </div>
      <h1>{childFirstName}&apos;s Application</h1>
      <p>
        {centreName} {'\u00b7'} {centreSuburb}
      </p>
      {canWithdraw ? (
        <div className="mt-2">
          <Button
            type="button"
            onClick={onWithdraw}
            disabled={isWithdrawing}
            variant="outline"
            className="h-8 rounded-2xl border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            {isWithdrawing ? 'Processing...' : withdrawLabel}
          </Button>
        </div>
      ) : null}
      {showMultipleApplicationsNotice ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          This crèche can see that this child has multiple active applications because you enabled this sharing preference.
        </p>
      ) : null}
      {liveMissingDocuments.length > 0 ? (
        <div className="mt-2 rounded-2xl border border-teal-200 bg-teal-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Friendly reminder ✨</p>
          <p className="mt-1 text-sm text-teal-900">
            You&apos;re almost done! Upload the final documents and this application can move faster 🚀
          </p>
          <ul className="mt-2 space-y-1 text-xs text-teal-800">
            {liveMissingDocuments.slice(0, 5).map((document) => (
              <li key={document}>- {document.replaceAll('_', ' ')}</li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={() => router.push('/parent/profile/documents')}
            className="mt-3 h-9 rounded-2xl bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700"
          >
            Upload documents now
          </Button>
        </div>
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
            {liveStatus === 'submitted' && (
              <div className="mt-2">
                {!isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-7 rounded-2xl px-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    Edit message {'\u2192'}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="cc-native-field min-h-[80px] w-full rounded-xl p-3 text-sm"
                      placeholder="Your message to the crèche..."
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
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
                        className="h-8 rounded-2xl bg-cyan-600 px-4 text-xs font-semibold text-white hover:bg-cyan-700"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false)
                          setEditMessage(parentMessage ?? '')
                        }}
                        className="h-8 rounded-2xl border-slate-200 px-4 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {liveStatus !== 'submitted' && (
              <p className="mt-1 text-xs text-slate-400">
                Contact the crèche directly to request changes after review starts.
              </p>
            )}
          </div>
        </div>
      </div>
      {liveStatus === 'enrolled' && (
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


