'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import ApplicationTimeline from '@/components/parent/ApplicationTimeline'
import PlacementDecisionModal from '@/components/parent/PlacementDecisionModal'
import { Button } from '@/components/ui/button'
import { getRejectionReasonLabel, getRejectionReasonMessage } from '@/lib/admissions/rejection-reasons'
import { createClient } from '@/lib/supabase/client'
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
  offerBreakdown: Array<{
    key: string
    label: string
    amount_cents: number
    frequency: 'monthly' | 'once'
  }>
  offerConditions: string | null
  offerPenalties: string | null
  offerAgreement: string | null
  offerExpiresAt: string | null
  rejectionReasonCode: string | null
  rejectionReasonNote: string | null
  acceptedAt: string | null
  centreName: string
  centreSuburb: string
  centreSlug: string
  childFirstName: string
  childLastName: string
  registrationSubmittedAt: string | null
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
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enlarged, setEnlarged] = useState(false)

  const loadLatestCode = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!childId || !ecdId || !parentId) return
      if (!silent) setLoading(true)
      if (silent) setRefreshing(true)
      setError(null)

      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('pickup_codes')
        .select('code,created_at,expires_at,used,locked')
        .eq('child_id', childId)
        .eq('ecd_id', ecdId)
        .eq('parent_id', parentId)
        .eq('used', false)
        .eq('locked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        setError(fetchError.message || 'Unable to load pickup code right now.')
      } else {
        setCode(data?.code ?? null)
        setCreatedAt(data?.created_at ?? null)
        setExpiresAt(data?.expires_at ?? null)
      }

      if (!silent) setLoading(false)
      if (silent) setRefreshing(false)
    },
    [childId, ecdId, parentId]
  )

  useEffect(() => {
    void loadLatestCode()
  }, [loadLatestCode])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadLatestCode({ silent: true })
    }, 30_000)
    return () => clearInterval(interval)
  }, [loadLatestCode])

  return (
    <section id="pickup-code-section" data-application-id={applicationId} className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pickup & Collection</p>
            <p className="mt-1 text-sm text-slate-600">A secure code appears here automatically after the crèche marks your child present at check-in.</p>
          </div>
          <Button
            type="button"
            onClick={() => void loadLatestCode({ silent: true })}
            disabled={loading || refreshing}
            variant="outline"
            className="h-10 rounded-2xl border-slate-300 px-4 text-sm font-semibold"
          >
            {refreshing ? 'Refreshing...' : 'Refresh code'}
          </Button>
        </div>

        {loading ? (
          <div className="mt-3 animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-4 w-32 rounded-xl bg-slate-200" />
            <div className="mt-3 h-10 w-44 rounded-xl bg-slate-200" />
            <div className="mt-2 h-3 w-64 rounded-xl bg-slate-100" />
          </div>
        ) : code ? (
          <>
          <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Active code</p>
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              className="mt-2 flex flex-col items-start gap-1 rounded-xl border-2 border-cyan-300 bg-white px-4 py-3 text-left transition-colors hover:bg-cyan-50 active:scale-95 w-full"
              title="Tap to enlarge"
            >
              <span className="text-4xl font-black tracking-[0.3em] text-cyan-900">{code}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600">Tap to enlarge for gate staff</span>
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Show this code to the cr&egrave;che staff at pickup. Expires {expiresAt ? formatDate(expiresAt) : 'soon'}.
            </p>
            {createdAt ? (
              <p className="mt-1 text-[11px] font-medium text-cyan-700">Generated at {formatDate(createdAt)}</p>
            ) : null}
          </div>

          {enlarged ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pickup code enlarged"
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cyan-950/95 p-6"
              onClick={() => setEnlarged(false)}
            >
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Pickup code</p>
              <p className="mt-4 text-7xl font-black tracking-[0.4em] text-white sm:text-8xl">{code}</p>
              <p className="mt-6 text-sm text-cyan-300">Show this to gate staff</p>
              <button
                type="button"
                className="mt-8 rounded-2xl border border-cyan-400 px-6 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-900"
                onClick={(e) => { e.stopPropagation(); setEnlarged(false) }}
              >
                Close
              </button>
            </div>
          ) : null}
          </>
        ) : (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Waiting for check-in</p>
            <p className="mt-1 text-sm text-amber-900">No code yet. Your crèche will trigger this automatically on first attendance check-in.</p>
            <p className="mt-2 text-xs text-amber-800">No manual activation needed from your side.</p>
          </div>
        )}

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
  adminNotes,
  offerBreakdown,
  offerConditions,
  offerPenalties,
  offerAgreement,
  offerExpiresAt,
  rejectionReasonCode,
  rejectionReasonNote,
  acceptedAt,
  centreName,
  centreSuburb,
  childFirstName,
  childLastName,
  registrationSubmittedAt,
  history: initialHistory,
  missingDocuments: initialMissingDocuments,
  showMultipleApplicationsNotice,
}: ApplicationDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  // Must be a plain (non-state) value derived from props — declared before any
  // useState/useEffect that gates on it so TypeScript flow analysis is satisfied.
  const isOfferExpired =
    offerExpiresAt != null && new Date(offerExpiresAt).getTime() <= Date.now()

  const [liveStatus, setLiveStatus] = useState(initialStatus)
  const [liveAcceptedAt, setLiveAcceptedAt] = useState(acceptedAt)
  const [liveHistory, setLiveHistory] = useState<TimelineEvent[]>(initialHistory)
  const [liveMissingDocuments, setLiveMissingDocuments] = useState(initialMissingDocuments)
  const [decisionOpen, setDecisionOpen] = useState(
    initialStatus === 'approved' && !acceptedAt && !isOfferExpired
  )
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
  const offerMonthlyTotal = offerBreakdown
    .filter((item) => item.frequency === 'monthly')
    .reduce((sum, item) => sum + item.amount_cents, 0)
  const offerOnceOffTotal = offerBreakdown
    .filter((item) => item.frequency === 'once')
    .reduce((sum, item) => sum + item.amount_cents, 0)
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
  const registrationDone = searchParams.get('registration') === 'done'

  useEffect(() => {
    statusRef.current = liveStatus
    if (liveStatus === 'approved' && !liveAcceptedAt && !isOfferExpired) {
      setDecisionOpen(true)
    }
  }, [isOfferExpired, liveAcceptedAt, liveStatus])

  useEffect(() => {
    const channel = supabase
      .channel(`parent-application-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications', filter: `id=eq.${id}` },
        (payload: any) => {
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
        (payload: any) => {
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
        (payload: any) => {
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
    window.location.assign(`/parent/applications/${id}/registration`)
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
      {registrationDone ? (
        <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Registration received</p>
          <p className="mt-1 text-sm text-emerald-900">Your Bajabulile-style registration form has been saved. CentreConnect will keep future updates linked to this child.</p>
        </div>
      ) : null}
      {liveStatus === 'enrolled' ? (
        registrationSubmittedAt ? (
          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Registration complete</p>
            <p className="mt-1 text-sm text-emerald-900">Registration form submitted on {formatDate(registrationSubmittedAt)}. Your child&apos;s pickup, daily updates, and admissions details now stay linked in CentreConnect.</p>
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Finish registration</p>
            <p className="mt-1 text-sm text-amber-900">The crèche accepted this child. Complete the registration form now so health, emergency, and guardian details are ready before the first full day.</p>
            <Button
              type="button"
              onClick={() => router.push(`/parent/applications/${id}/registration`)}
              className="mt-3 h-9 rounded-2xl bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Open registration form
            </Button>
          </div>
        )
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
      {offerBreakdown.length > 0 ? (
        <div className="mt-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Offer Details</p>
          <div className="mt-2 space-y-1 text-sm text-cyan-900">
            {offerBreakdown.map((item) => (
              <p key={`${item.key}-${item.label}`}>
                {item.label}: <span className="font-semibold">R {(item.amount_cents / 100).toFixed(2)}</span>{' '}
                <span className="text-xs text-cyan-700">({item.frequency === 'monthly' ? 'monthly' : 'once-off'})</span>
              </p>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs text-cyan-900">
              Monthly total: <span className="font-bold">R {(offerMonthlyTotal / 100).toFixed(2)}</span>
            </div>
            <div className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs text-cyan-900">
              Once-off total: <span className="font-bold">R {(offerOnceOffTotal / 100).toFixed(2)}</span>
            </div>
          </div>
          {offerExpiresAt ? (() => {
            const msLeft = new Date(offerExpiresAt).getTime() - Date.now()
            // Use Math.floor so a 2-hour-remaining offer shows "today", not "tomorrow"
            const daysLeft = Math.floor(msLeft / 86_400_000)
            const isExpired = daysLeft < 0
            const isExpiringSoon = daysLeft <= 1
            const label = isExpired
              ? 'This offer has expired'
              : daysLeft === 0
              ? 'Offer expires today \u2014 respond now'
              : daysLeft === 1
              ? 'Offer expires tomorrow \u2014 respond today'
              : `Offer expires in ${daysLeft} days (${formatDate(offerExpiresAt)})`
            return (
              <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 ${isExpired ? 'border-slate-300 bg-slate-50' : isExpiringSoon ? 'border-rose-300 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                <span className="text-base leading-none" aria-hidden="true">{isExpired ? '\u{1F512}' : isExpiringSoon ? '\u26a0\ufe0f' : '\u23f0'}</span>
                <p className={`text-xs font-bold ${isExpired ? 'text-slate-600' : isExpiringSoon ? 'text-rose-800' : 'text-amber-800'}`}>{label}</p>
              </div>
            )
          })() : null}
          {offerConditions ? (
            <p className="mt-2 text-xs text-cyan-900">
              <span className="font-semibold">Conditions:</span> {offerConditions}
            </p>
          ) : null}
          {offerPenalties ? (
            <p className="mt-1 text-xs text-cyan-900">
              <span className="font-semibold">Penalties:</span> {offerPenalties}
            </p>
          ) : null}
          {offerAgreement ? (
            <details className="mt-3 rounded-xl border border-cyan-300 bg-white p-2">
              <summary className="cursor-pointer text-xs font-semibold text-cyan-800">View agreement text</summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{offerAgreement}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
      {normalizeStatus(liveStatus) === 'rejected' ? (
        <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Decision Reason</p>
          <p className="mt-1 text-sm font-semibold text-rose-900">{getRejectionReasonLabel(rejectionReasonCode)}</p>
          <p className="mt-1 text-xs text-rose-800">{getRejectionReasonMessage(rejectionReasonCode)}</p>
          {rejectionReasonNote ? <p className="mt-1 text-xs text-rose-900">Note: {rejectionReasonNote}</p> : null}
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
                            const client = createClient()
                            const { error } = await client
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
          {adminNotes ? (
            <div>
              <p className="mb-1 text-sm text-slate-600">Message from crèche</p>
              <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">{adminNotes}</p>
            </div>
          ) : null}
        </div>
      </div>
      {liveStatus === 'enrolled' ? (
        <PickupCodeSection applicationId={id} childId={childId || ''} ecdId={ecdId} parentId={parentId} />
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
