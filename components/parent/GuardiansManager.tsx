'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AddGuardianSheet } from '@/components/parent/guardians/AddGuardianSheet'
import { sendCoParentInviteAction } from '@/lib/actions/guardians/send-invite'
import { Input } from '@/components/ui/input'
import { Mail, Link2, CheckCircle2, Clock, UserCheck, MessageCircle, Share2 } from 'lucide-react'

export type GuardianChild = {
  id: string
  first_name: string
  last_name: string
}

type Guardian = {
  id: string
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

  const selectedChildName = useMemo(() => {
    const child = childList.find((item) => item.id === selectedChildId)
    return child ? `${child.first_name} ${child.last_name}` : 'Select a child'
  }, [childList, selectedChildId])

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
          'id,full_name,relationship,phone,email,import_source,is_verified,can_pickup,can_view_applications,can_receive_announcements,can_generate_pickup_code,linked_user_id,invite_sent_at,invite_accepted_at'
        )
        .eq('child_id', selectedChildId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGuardians((data ?? []) as Guardian[])
    } catch (error: any) {
      toast.error(error?.message || 'Could not load guardians')
    } finally {
      setLoading(false)
    }
  }, [selectedChildId])

  useEffect(() => {
    void loadGuardians()
  }, [loadGuardians])

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[var(--shadow-elevation-1)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px]">
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
          disabled={!selectedChildId}
          className="h-11 rounded-2xl bg-cyan-600 font-bold text-white hover:bg-cyan-700"
        >
          + Add Co-Parent
        </Button>
      </div>

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
                    {guardian.relationship} · {guardian.phone}
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

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {guardian.can_view_applications ? <span className="text-[11px] text-slate-500">✓ Applications</span> : null}
                {guardian.can_pickup ? <span className="text-[11px] text-slate-500">✓ Pickup</span> : null}
                {guardian.can_receive_announcements ? <span className="text-[11px] text-slate-500">✓ Announcements</span> : null}
                {guardian.can_generate_pickup_code ? <span className="text-[11px] text-slate-500">✓ Pickup code</span> : null}
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

