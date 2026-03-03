'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { requestLinkedParentDocumentsAction } from './co-parent-actions'

type ParticipantOption = {
  userId: string
  label: string
  roleLabel: string
  guardianId: string | null
}

type RequestHistoryItem = {
  id: string
  requested_by_user_id: string
  requested_for_user_id: string
  requested_by_label: string | null
  requested_for_label: string | null
  document_codes: string[]
  message: string
  status: string
  requested_at: string
  acknowledged_at: string | null
  completed_at: string | null
}

const DOCUMENT_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'birth_certificate', label: 'Birth certificate' },
  { code: 'medical_certificate', label: 'Medical card/certificate' },
  { code: 'immunization_record', label: 'Immunization record' },
  { code: 'proof_of_address', label: 'Proof of address' },
  { code: 'parent_id', label: 'Parent ID document' },
  { code: 'medical_aid', label: 'Medical aid document' },
  { code: 'guardian_consent', label: 'Guardian consent form' },
]

type CoParentDocumentRequestPanelProps = {
  applicationId: string
  childId: string
  participants: ParticipantOption[]
  initialHistory: RequestHistoryItem[]
}

function toDisplayStatus(item: RequestHistoryItem) {
  if (item.completed_at) return 'Completed'
  if (item.acknowledged_at) return 'Acknowledged'
  if (item.status === 'cancelled') return 'Cancelled'
  return 'Requested'
}

export function CoParentDocumentRequestPanel({
  applicationId,
  childId,
  participants,
  initialHistory,
}: CoParentDocumentRequestPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [history, setHistory] = useState<RequestHistoryItem[]>(initialHistory)

  const [requestedByUserId, setRequestedByUserId] = useState(participants[0]?.userId ?? '')
  const [requestedForUserId, setRequestedForUserId] = useState(participants[1]?.userId ?? participants[0]?.userId ?? '')
  const [selectedCodes, setSelectedCodes] = useState<string[]>(['birth_certificate'])
  const [customMessage, setCustomMessage] = useState('')
  const [lastWhatsappHref, setLastWhatsappHref] = useState<string | null>(null)

  const participantById = useMemo(
    () => new Map(participants.map((participant) => [participant.userId, participant])),
    [participants]
  )

  const recipientOptions = useMemo(
    () => participants.filter((participant) => participant.userId !== requestedByUserId),
    [participants, requestedByUserId]
  )

  function toggleCode(code: string) {
    setSelectedCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    )
  }

  function resetForNextRequest(nextRecipient: string) {
    setRequestedForUserId(nextRecipient)
    setSelectedCodes(['birth_certificate'])
    setCustomMessage('')
  }

  function submitRequest() {
    if (!requestedByUserId || !requestedForUserId || selectedCodes.length === 0) {
      toast.error('Choose both linked users and at least one requested document.')
      return
    }

    const requestedBy = participantById.get(requestedByUserId)
    const requestedFor = participantById.get(requestedForUserId)

    startTransition(async () => {
      const result = await requestLinkedParentDocumentsAction({
        applicationId,
        childId,
        requestedByUserId,
        requestedForUserId,
        requestedByGuardianId: requestedBy?.guardianId ?? null,
        requestedForGuardianId: requestedFor?.guardianId ?? null,
        documentCodes: selectedCodes,
        customMessage: customMessage.trim() || null,
      })

      if (!result.ok) {
        toast.error(result.error || 'Unable to send document request.')
        return
      }

      toast.success(result.message || 'Document request sent.')
      setLastWhatsappHref(result.whatsappHref ?? null)
      const now = new Date().toISOString()
      const optimistic: RequestHistoryItem = {
        id: `optimistic-${now}`,
        requested_by_user_id: requestedByUserId,
        requested_for_user_id: requestedForUserId,
        requested_by_label: requestedBy?.label ?? null,
        requested_for_label: requestedFor?.label ?? null,
        document_codes: selectedCodes,
        message: customMessage.trim(),
        status: 'requested',
        requested_at: now,
        acknowledged_at: null,
        completed_at: null,
      }
      setHistory((current) => [optimistic, ...current].slice(0, 20))
      resetForNextRequest(recipientOptions[0]?.userId ?? '')
    })
  }

  if (participants.length < 2) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Add and link at least one co-parent account before sending cross-parent document requests.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requested by</span>
          <select
            value={requestedByUserId}
            onChange={(event) => {
              const nextRequestedBy = event.target.value
              setRequestedByUserId(nextRequestedBy)
              const nextRecipient = participants.find((item) => item.userId !== nextRequestedBy)?.userId ?? ''
              setRequestedForUserId(nextRecipient)
            }}
            className="cc-native-field h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            {participants.map((participant) => (
              <option key={participant.userId} value={participant.userId}>
                {participant.label} ({participant.roleLabel})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requested from</span>
          <select
            value={requestedForUserId}
            onChange={(event) => setRequestedForUserId(event.target.value)}
            className="cc-native-field h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            {recipientOptions.map((participant) => (
              <option key={participant.userId} value={participant.userId}>
                {participant.label} ({participant.roleLabel})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requested documents</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOCUMENT_OPTIONS.map((option) => (
            <label
              key={option.code}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={selectedCodes.includes(option.code)}
                onChange={() => toggleCode(option.code)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <label className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Custom message (optional)</span>
        <textarea
          value={customMessage}
          onChange={(event) => setCustomMessage(event.target.value)}
          placeholder="Add context if needed. Otherwise a professional default message is used."
          className="cc-native-field min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <Button
        type="button"
        onClick={submitRequest}
        disabled={isPending}
        className="h-11 rounded-2xl bg-teal-600 px-5 font-bold text-white hover:bg-teal-700"
      >
        {isPending ? 'Sending request...' : 'Request Document Upload'}
      </Button>
      {lastWhatsappHref ? (
        <Button
          type="button"
          variant="outline"
          asChild
          className="h-11 rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <a href={lastWhatsappHref} target="_blank" rel="noreferrer">
            Open WhatsApp Link
          </a>
        </Button>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recent requests</p>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No linked-parent document requests yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {item.requested_by_label || 'Linked parent'} {'->'} {item.requested_for_label || 'Linked parent'}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {item.document_codes.join(', ')} | {toDisplayStatus(item)} |{' '}
                  {new Date(item.requested_at).toLocaleString('en-ZA')}
                </p>
                {item.message?.trim() ? <p className="mt-1 text-xs text-slate-700">{item.message}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
