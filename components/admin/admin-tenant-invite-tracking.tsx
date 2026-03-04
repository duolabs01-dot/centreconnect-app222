'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type AdminTenantInviteLog = {
  id: string
  centreId: string | null
  centreName: string
  eventType: 'owner_invite' | 'admin_access_invite' | 'welcome_pack' | 'centre_bootstrap_created'
  channel: 'email' | 'whatsapp' | string
  status: 'sent' | 'opened' | 'claimed' | 'failed' | string
  recipient: string | null
  createdAt: string
  eventKey: string | null
}

type Props = {
  logs: AdminTenantInviteLog[]
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function statusBadgeClass(status: string) {
  if (status === 'claimed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'opened') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
  if (status === 'failed') return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
}

export function AdminTenantInviteTracking({ logs }: Props) {
  const [resending, setResending] = useState<Record<string, boolean>>({})
  const [resendNotes, setResendNotes] = useState<Record<string, string>>({})

  async function handleResend(log: AdminTenantInviteLog) {
    if (!log.centreId) {
      toast.error('Missing centre information; cannot resend invite.')
      return
    }
    setResending((prev) => ({ ...prev, [log.id]: true }))
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${log.centreId}/send-owner-invite`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => ({}))) as { warning?: string; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to resend owner invite.')
      }
      const message = payload.warning ? `Resent owner invite (${payload.warning})` : 'Owner invite resent'
      setResendNotes((prev) => ({ ...prev, [log.id]: message }))
      toast.success(message)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend owner invite.')
    } finally {
      setResending((prev) => ({ ...prev, [log.id]: false }))
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-950/80 shadow-none">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900">
              <TableRow className="border-white/5">
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Sent
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Centre
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Recipient
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Channel
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Event
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Status
                </TableHead>
                <TableHead className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-slate-500 text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    No invite activity captured yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-white/5">
                    <TableCell className="px-4 py-3 text-xs text-slate-400">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold text-white">{log.centreName}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-slate-200">{log.recipient ?? '-'}</TableCell>
                    <TableCell className="px-4 py-3 text-xs uppercase tracking-[0.25em] text-cyan-300">
                      {log.channel}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-300">{log.eventType}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {log.eventType === 'owner_invite' ? (
                        <div className="space-y-1 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                            onClick={() => void handleResend(log)}
                            disabled={resending[log.id]}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {resending[log.id] ? 'Resending…' : 'Resend owner invite'}
                          </Button>
                          {resendNotes[log.id] ? (
                            <p className="text-[11px] text-cyan-300">{resendNotes[log.id]}</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">—</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
