'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ensureParentReady } from '@/lib/auth/ensure-parent-ready'
import { toFriendlyClientError } from '@/lib/supabase/client-errors'
import { reportParentSubmitFailure } from '@/lib/telemetry/parent-submit-failures.client'
import { Button } from '@/components/ui/button'
import { AddGuardianSheet } from '@/components/parent/guardians/AddGuardianSheet'
import { sendCoParentInviteAction } from '@/lib/actions/guardians/send-invite'
import { requestCoParentDocumentUploadAction } from '@/lib/actions/guardians/request-document-upload'
import { removeGuardianAction } from '@/lib/actions/guardians/remove-guardian'
import { Input } from '@/components/ui/input'
import { Mail, Link2, CheckCircle2, Clock, UserCheck, MessageCircle, Share2, Trash2, X } from 'lucide-react'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'

export type GuardianChild = {
  id: string
  first_name: string
  last_name: string
}

type Guardian = {
  id: string
  parent_id: string
  full_name: string | null
  relationship: string | null
  phone: string | null
  email: string | null
  import_source: string | null
  is_verified: boolean
  can_pickup: boolean
  can_view_applications: boolean
  can_receive_announcements: boolean
  can_generate_pickup_code: boolean
  linked_user_id: string | null
  invite_sent_at: string | null
  invite_accepted_at: string | null
}

type Props = {
  childList: GuardianChild[]
}

const DOCUMENT_REQUEST_OPTIONS = [
  { code: 'birth_certificate', label: 'Birth certificate' },
  { code: 'medical_certificate', label: 'Medical card/certificate' },
  { code: 'immunization_record', label: 'Immunization record' },
  { code: 'proof_of_address', label: 'Proof of address' },
  { code: 'parent_id', label: 'Parent ID document' },
  { code: 'medical_aid', label: 'Medical aid document' },
  { code: 'guardian_consent', label: 'Guardian consent form' },
]

function GuardianStatusBadge({ guardian }: { guardian: Guardian }) {
  if (guardian.linked_user_id) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <UserCheck className="h-3 w-3" /> Joined
      </span>
    )
  }
  if (guardian.invite_sent_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Invite sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      Not invited
    </span>
  )
}

function InvitePanel({
  guardian,
  onDone,
}: {
  guardian: Guardian
  onDone: () => void
}) {
  const [email, setEmail] = useState(guardian.email ?? '')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    inviteUrl?: string
    whatsappShareUrl?: string
    shareText?: string
    childNames?: string[]
    error?: string
    success?: boolean
  } | null>(null)

  function handleCreateInvite() {
    startTransition(async () => {
      const res = await sendCoParentInviteAction({
        guardian_id: guardian.id,
        email: email.trim() || undefined,
      })
      setResult(res)
      if (res.success) {
        toast.success('Secure invite link created.')
        onDone()
      } else if (res.error) {
        reportParentSubmitFailure({
          route: '/parent/profile/guardians',
          form: 'guardian_invite_create',
          failureType: 'submit_failed',
          message: res.error,
        })
        toast.error(res.error)
      }
    })
  }

  function copyLink() {
    if (!result?.inviteUrl) return
    navigator.clipboard.writeText(result.inviteUrl)
    toast.success('Invite link copied.')
  }

  async function shareLink() {
    if (!result?.inviteUrl) return
    const text = result.shareText ?? `Join me on CentreConnect: ${result.inviteUrl}`
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'CentreConnect Co-parent Invite', text, url: result.inviteUrl })
        return
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(`${text}\n${result.inviteUrl}`)
    toast.success('Invite copied for sharing.')
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
        Invite {guardian.full_name} via WhatsApp, email, or link
      </p>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 bg-white text-sm"
        />
        <Button
          size="sm"
          className="h-10 shrink-0 rounded-2xl bg-teal-600 px-4 font-bold text-white hover:bg-teal-700"
          onClick={handleCreateInvite}
          disabled={isPending}
        >
          {isPending ? '...' : <><Mail className="mr-1 h-4 w-4" />Create Link</>}
        </Button>
      </div>

      {result?.inviteUrl ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            This secure invite can be shared anywhere. It links to{' '}
            <strong>{result.childNames?.join(', ') || 'the selected child'}</strong>.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="flex-1 truncate font-mono text-xs text-slate-600">{result.inviteUrl}</p>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 text-teal-600 hover:text-teal-800"
              aria-label="Copy invite link"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {result.whatsappShareUrl ? (
              <Button size="sm" asChild className="h-9 rounded-2xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">
                <a href={result.whatsappShareUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Send WhatsApp
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-2xl border-slate-200 px-3 text-xs font-bold"
              onClick={shareLink}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share Anywhere
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-2xl border-slate-200 px-3 text-xs font-bold"
              onClick={copyLink}
            >
              Copy Link
            </Button>
          </div>
        </div>
      ) : null}

      {result?.error && !result?.inviteUrl ? <p className="text-xs font-medium text-rose-600">{result.error}</p> : null}
    </div>
  )
}

export function GuardiansManager({ childList }: Props) {
  const [selectedChildId, setSelectedChildId] = useState(childList[0]?.id ?? '')
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openInvitePanelId, setOpenInvitePanelId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [requestedForUserId, setRequestedForUserId] = useState('')
  const [requestCodes, setRequestCodes] = useState<string[]>(['birth_certificate'])
  const [requestMessage, setRequestMessage] = useState('')
  const [requestWhatsappHref, setRequestWhatsappHref] = useState<string | null>(null)
  const [isRequestPending, startRequestTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const selectedChildName = useMemo(() => {
    const child = childList.find((item) => item.id === selectedChildId)
    return child ? `${child.first_name} ${child.last_name}` : 'Select a child'
  }, [childList, selectedChildId])

  const linkedParticipants = useMemo(() => {
    const participants: Array<{ userId: string; label: string }> = []
    const seen = new Set<string>()
    const primaryParentId = guardians[0]?.parent_id ?? null

    for (const guardian of guardians) {
      if (!guardian.linked_user_id || guardian.linked_user_id === currentUserId) continue
      if (seen.has(guardian.linked_user_id)) continue
      seen.add(guardian.linked_user_id)
      participants.push({
        userId: guardian.linked_user_id,
        label: guardian.full_name?.trim() || 'Linked co-parent',
      })
    }

    if (primaryParentId && primaryParentId !== currentUserId && !seen.has(primaryParentId)) {
      participants.unshift({ userId: primaryParentId, label: 'Primary parent' })
    }

    return participants
  }, [currentUserId, guardians])

  const canAddCoParent =
    guardians.length === 0 || !currentUserId || !guardians[0]?.parent_id || guardians[0].parent_id === currentUserId

  const loadGuardians = useCallback(async () => {
    if (!selectedChildId) {
      setGuardians([])
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('guardians')
        .select(
          'id,parent_id,full_name,relationship,phone,email,import_source,is_verified,can_pickup,can_view_applications,can_receive_announcements,can_generate_pickup_code,linked_user_id,invite_sent_at,invite_accepted_at'
        )
        .eq('child_id', selectedChildId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGuardians((data ?? []) as Guardian[])
    } catch (error: unknown) {
      toast.error(toFriendlyClientError(error, 'Could not load guardians'))
    } finally {
      setLoading(false)
    }
  }, [selectedChildId])

  useEffect(() => {
    void loadGuardians()
  }, [loadGuardians])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    void ensureParentReady(supabase).then((result) => {
      if (!mounted) return
      setCurrentUserId(result.ok ? result.userId : '')
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!linkedParticipants.some((item) => item.userId === requestedForUserId)) {
      setRequestedForUserId(linkedParticipants[0]?.userId ?? '')
    }
  }, [linkedParticipants, requestedForUserId])

  function toggleRequestCode(code: string) {
    setRequestCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    )
  }

  function submitDocumentRequest() {
    if (!selectedChildId || !requestedForUserId || requestCodes.length === 0) {
      reportParentSubmitFailure({
        route: '/parent/profile/guardians',
        form: 'guardian_document_request',
        failureType: 'validation_failed',
        message: 'Choose a linked parent and at least one document.',
      })
      toast.error('Choose a linked parent and at least one document.')
      return
    }
    startRequestTransition(async () => {
      const result = await requestCoParentDocumentUploadAction({
        childId: selectedChildId,
        requestedForUserId,
        documentCodes: requestCodes,
        customMessage: requestMessage.trim() || null,
      })
      if (!result.ok) {
        reportParentSubmitFailure({
          route: '/parent/profile/guardians',
          form: 'guardian_document_request',
          failureType: 'submit_failed',
          message: result.error || 'Could not send request right now.',
        })
        toast.error(result.error || 'Could not send request right now.')
        return
      }
      toast.success(result.message || 'Request sent.')
      setRequestWhatsappHref(result.whatsappHref ?? null)
      setRequestCodes(['birth_certificate'])
      setRequestMessage('')
    })
  }

  async function handleRemoveGuardian(id: string) {
    setIsDeleting(id)
    try {
      const result = await removeGuardianAction(id)
      if (result.success) {
        toast.success(result.message)
        void loadGuardians()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to remove co-parent')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[var(--shadow-elevation-1)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:min-w-[220px]">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Child</label>
          <select
            value={selectedChildId}
            onChange={(event) => setSelectedChildId(event.target.value)}
            className="cc-native-field mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          >
            {childList.length === 0 ? (
              <option value="">No child linked</option>
            ) : (
              childList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                </option>
              ))
            )}
          </select>
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          disabled={!selectedChildId || !canAddCoParent}
          className="h-11 rounded-2xl bg-cyan-600 font-bold text-white hover:bg-cyan-700"
        >
          + Add Co-Parent
        </Button>
      </div>
      {!canAddCoParent ? (
        <p className="text-xs text-slate-500">
          Only the primary parent can add new co-parent profiles for this child.
        </p>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading...</p>
      ) : guardians.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
          <p className="text-sm font-semibold text-slate-500">No co-parents yet</p>
          <p className="mt-1 text-xs text-slate-400">Add a co-parent or trusted adult for {selectedChildName}.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {guardians.map((guardian) => (
            <li key={guardian.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{guardian.full_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(guardian.relationship || 'Co-parent') + (guardian.phone ? ` | ${guardian.phone}` : '')}
                  </p>
                  {guardian.email ? <p className="mt-0.5 text-xs text-slate-400">{guardian.email}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <GuardianStatusBadge guardian={guardian} />
                  {!guardian.linked_user_id ? (
                    <button
                      onClick={() => setOpenInvitePanelId(openInvitePanelId === guardian.id ? null : guardian.id)}
                      className="text-xs font-bold text-cyan-600 transition-colors hover:text-cyan-800"
                    >
                      {openInvitePanelId === guardian.id ? 'Close' : 'Invite'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Account linked
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {guardian.can_view_applications ? <span className="text-[11px] text-slate-500">Applications enabled</span> : null}
                  {guardian.can_pickup ? <span className="text-[11px] text-slate-500">Pickup enabled</span> : null}
                  {guardian.can_receive_announcements ? <span className="text-[11px] text-slate-500">Announcements enabled</span> : null}
                  {guardian.can_generate_pickup_code ? <span className="text-[11px] text-slate-500">Pickup code enabled</span> : null}
                </div>

                {canAddCoParent && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button 
                        className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                        disabled={isDeleting === guardian.id}
                      >
                        <Trash2 className="h-3 w-3" />
                        {isDeleting === guardian.id ? 'Removing...' : 'Remove'}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="relative rounded-[2.5rem] p-8">
                      <div className="absolute right-4 top-4 z-10">
                        <AlertDialogCancel asChild>
                          <button type="button" aria-label="Close dialog" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                            <X className="h-4 w-4" />
                          </button>
                        </AlertDialogCancel>
                      </div>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                          Remove {guardian.full_name || 'co-parent'}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-slate-600">
                          This will remove their access to {selectedChildName}. They will no longer be able to view applications, receive updates, or generate pickup codes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-12 rounded-2xl border-slate-200 font-bold text-slate-600">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRemoveGuardian(guardian.id)}
                          className="h-12 rounded-2xl bg-rose-600 font-bold text-white hover:bg-rose-700"
                        >
                          Remove access
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {openInvitePanelId === guardian.id ? (
                <InvitePanel
                  guardian={guardian}
                  onDone={() => {
                    setOpenInvitePanelId(null)
                    void loadGuardians()
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Request document upload from linked parent
        </p>
        {linkedParticipants.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            Link at least one co-parent account before sending cross-parent document requests.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requested from</span>
              <select
                value={requestedForUserId}
                onChange={(event) => setRequestedForUserId(event.target.value)}
                className="cc-native-field h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {linkedParticipants.map((item) => (
                  <option key={item.userId} value={item.userId}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requested documents</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DOCUMENT_REQUEST_OPTIONS.map((option) => (
                  <label
                    key={option.code}
                    className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={requestCodes.includes(option.code)}
                      onChange={() => toggleRequestCode(option.code)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Custom message (optional)
              </span>
              <textarea
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                placeholder="Add context for the co-parent. Leave blank to use the default professional message."
                className="cc-native-field min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={submitDocumentRequest}
                disabled={isRequestPending}
                className="h-10 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700"
              >
                {isRequestPending ? 'Sending...' : 'Request Upload'}
              </Button>
              {requestWhatsappHref ? (
                <Button
                  type="button"
                  asChild
                  variant="outline"
                  className="h-10 rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <a href={requestWhatsappHref} target="_blank" rel="noreferrer">
                    Open WhatsApp Link
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <AddGuardianSheet
        open={sheetOpen}
        childId={selectedChildId}
        childOptions={childList}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => {
          void loadGuardians()
        }}
      />
    </div>
  )
}
