'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/cc-admin/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { Input } from '@/components/ui/input'

type TenantAdminRow = {
  id: string
  user_id: string
  role: 'ecd_admin' | 'ecd_staff'
  invited_at: string
  accepted_at: string | null
  full_name: string | null
  phone: string | null
}

type InvitationRow = {
  id: string
  email: string
  role: 'ecd_admin' | 'ecd_staff'
  invited_at: string
  accepted_at: string | null
  auth_user_id: string | null
}

type TenantAccessManagerProps = {
  tenantId: string
  admins: TenantAdminRow[]
  invitations: InvitationRow[]
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

export function TenantAccessManager({ tenantId, admins, invitations }: TenantAccessManagerProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'ecd_staff' as 'ecd_admin' | 'ecd_staff',
  })

  async function sendInvite() {
    const email = inviteForm.email.trim().toLowerCase()
    if (!email) {
      toast.error('Email is required')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/internal/platform-admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ecdId: tenantId,
          email,
          role: inviteForm.role,
          fullName: inviteForm.fullName.trim() || undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; invitedEmail?: string; role?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to send invite')

      toast.success(`Invite sent to ${payload.invitedEmail ?? email} as ${payload.role ?? inviteForm.role}`)
      setInviteForm({ email: '', fullName: '', role: 'ecd_staff' })
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invite')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access (Admins & Staff)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
          <Input
            type="email"
            placeholder="educator@centre.co.za"
            value={inviteForm.email}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            placeholder="Full name (optional)"
            value={inviteForm.fullName}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
          <select
            className="cc-native-field"
            value={inviteForm.role}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value as 'ecd_admin' | 'ecd_staff' }))}
          >
            <option value="ecd_staff">Teacher / Educator</option>
            <option value="ecd_admin">ECD Admin</option>
          </select>
          <Button disabled={busy} onClick={() => void sendInvite()}>
            {busy ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Linked Team Members</p>
          {admins.length === 0 ? (
            <p className="text-sm text-slate-400">No admins or staff linked yet.</p>
          ) : (
            admins.map((adminRow) => (
              <div key={adminRow.id} className="rounded-md border border-slate-700 bg-slate-900/50 p-2 text-sm">
                <p className="font-medium">{adminRow.full_name ?? adminRow.user_id}</p>
                <p className="text-xs text-slate-400">
                  {adminRow.role} | Invited: {formatDateTime(adminRow.invited_at)} | Accepted: {formatDateTime(adminRow.accepted_at)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Invitation Ledger</p>
          {invitations.length === 0 ? (
            <p className="text-sm text-slate-400">No invitation records yet.</p>
          ) : (
            invitations.slice(0, 20).map((invitation) => (
              <div key={invitation.id} className="rounded-md border border-slate-700 bg-slate-950/40 p-2 text-xs">
                <p className="font-mono text-slate-200">{invitation.email}</p>
                <p className="text-slate-400">
                  {invitation.role} | Invited: {formatDateTime(invitation.invited_at)} | Accepted: {formatDateTime(invitation.accepted_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
