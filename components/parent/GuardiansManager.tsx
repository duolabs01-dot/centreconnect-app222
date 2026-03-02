'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AddGuardianSheet } from '@/components/parent/guardians/AddGuardianSheet'
import { sendCoParentInviteAction } from '@/lib/actions/guardians/send-invite'
import { Input } from '@/components/ui/input'
import { Mail, Link2, CheckCircle2, Clock, UserCheck } from 'lucide-react'

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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <UserCheck className="h-3 w-3" /> Joined
      </span>
    )
  }
  if (guardian.invite_sent_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Invite sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500">
      Not invited
    </span>
  )
}

function InvitePanel({ guardian, childId, onDone }: { guardian: Guardian; childId: string; onDone: () => void }) {
  const [email, setEmail] = useState(guardian.email ?? '')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ inviteUrl?: string; error?: string; success?: boolean } | null>(null)

  function handleSend() {
    startTransition(async () => {
      const res = await sendCoParentInviteAction({
        guardian_id: guardian.id,
        child_id: childId,
        email,
      })
      setResult(res)
      if (res.success) {
        toast.success('Invite sent!')
        onDone()
      }
    })
  }

  function copyLink() {
    if (result?.inviteUrl) {
      navigator.clipboard.writeText(result.inviteUrl)
      toast.success('Link copied!')
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Send invite to {guardian.full_name}</p>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="their.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 text-sm bg-white"
        />
        <Button
          size="sm"
          className="h-10 shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4"
          onClick={handleSend}
          disabled={isPending || !email.includes('@')}
        >
          {isPending ? '…' : <><Mail className="h-4 w-4 mr-1" />Send</>}
        </Button>
      </div>

      {result?.inviteUrl && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            {result.error ? result.error : 'Or share this link directly:'}
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="truncate text-xs text-slate-600 flex-1 font-mono">{result.inviteUrl}</p>
            <button onClick={copyLink} className="shrink-0 text-cyan-600 hover:text-cyan-800">
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {result?.error && !result.inviteUrl && (
        <p className="text-xs text-rose-600 font-medium">{result.error}</p>
      )}
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
    if (!selectedChildId) { setGuardians([]); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('guardians')
        .select('id,full_name,relationship,phone,email,import_source,is_verified,can_pickup,can_view_applications,can_receive_announcements,can_generate_pickup_code,linked_user_id,invite_sent_at,invite_accepted_at')
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

  useEffect(() => { void loadGuardians() }, [loadGuardians])

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[var(--shadow-elevation-1)]">
      {/* Child selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px]">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Child</label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="cc-native-field mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
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
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
        >
          + Add Co-Guardian
        </Button>
      </div>

      {/* Guardian list */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
      ) : guardians.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
          <p className="text-sm font-semibold text-slate-500">No co-guardians yet</p>
          <p className="text-xs text-slate-400 mt-1">Add a co-parent or trusted adult for {selectedChildName}.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {guardians.map((g) => (
            <li key={g.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{g.full_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{g.relationship} · {g.phone}</p>
                  {g.email && <p className="text-xs text-slate-400 mt-0.5">{g.email}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <GuardianStatusBadge guardian={g} />
                  {!g.linked_user_id && (
                    <button
                      onClick={() => setOpenInvitePanelId(openInvitePanelId === g.id ? null : g.id)}
                      className="text-xs font-bold text-cyan-600 hover:text-cyan-800 transition-colors"
                    >
                      {openInvitePanelId === g.id ? 'Close' : 'Send invite'}
                    </button>
                  )}
                  {g.linked_user_id && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Account linked
                    </span>
                  )}
                </div>
              </div>

              {/* Permissions summary */}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {g.can_view_applications && <span className="text-[11px] text-slate-500">✓ View applications</span>}
                {g.can_pickup && <span className="text-[11px] text-slate-500">✓ Pickup</span>}
                {g.can_receive_announcements && <span className="text-[11px] text-slate-500">✓ Announcements</span>}
              </div>

              {/* Invite panel — inline, collapsible */}
              {openInvitePanelId === g.id && (
                <InvitePanel
                  guardian={g}
                  childId={selectedChildId}
                  onDone={() => { setOpenInvitePanelId(null); void loadGuardians() }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <AddGuardianSheet
        open={sheetOpen}
        childId={selectedChildId}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => { void loadGuardians() }}
      />
    </div>
  )
}
