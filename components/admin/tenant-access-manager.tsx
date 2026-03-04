'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
  const darkInputClass =
    'border-cyan-500/20 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400/70'

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
    <Card className="border-cyan-500/20 bg-slate-950/70">
      <CardHeader>
        <CardTitle className="text-white">Access (Admins & Staff)</CardTitle>
        <CardDescription className="text-slate-400">
          Link team members and track invitation delivery and acceptance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_220px_auto] xl:items-end">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                className={darkInputClass}
                placeholder="educator@centre.co.za"
                value={inviteForm.email}
                onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name" className="text-slate-300">
                Full Name (Optional)
              </Label>
              <Input
                id="invite-name"
                className={darkInputClass}
                placeholder="Jane Nkosi"
                value={inviteForm.fullName}
                onChange={(event) => setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value as 'ecd_admin' | 'ecd_staff' }))}
              >
                <SelectTrigger className={`${darkInputClass} [&_span]:text-slate-100`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                  <SelectItem value="ecd_staff">Teacher / Educator</SelectItem>
                  <SelectItem value="ecd_admin">ECD Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={busy}
              onClick={() => void sendInvite()}
              className="bg-cyan-500 text-black hover:bg-cyan-400"
            >
              {busy ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white">Linked Team Members</p>
          {admins.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400">
              No admins or staff linked yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Role</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Invited</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Accepted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((adminRow) => (
                    <TableRow key={adminRow.id} className="border-slate-800">
                      <TableCell className="font-medium text-slate-100">{adminRow.full_name ?? adminRow.user_id}</TableCell>
                      <TableCell className="text-slate-300">{adminRow.role}</TableCell>
                      <TableCell className="text-slate-300">{formatDateTime(adminRow.invited_at)}</TableCell>
                      <TableCell className="text-slate-300">{formatDateTime(adminRow.accepted_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white">Invitation Ledger</p>
          {invitations.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400">
              No invitation records yet.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Role</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Invited</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Accepted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.slice(0, 40).map((invitation) => (
                    <TableRow key={invitation.id} className="border-slate-800">
                      <TableCell className="font-mono text-slate-100">{invitation.email}</TableCell>
                      <TableCell className="text-slate-300">{invitation.role}</TableCell>
                      <TableCell className="text-slate-300">{formatDateTime(invitation.invited_at)}</TableCell>
                      <TableCell className="text-slate-300">{formatDateTime(invitation.accepted_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
