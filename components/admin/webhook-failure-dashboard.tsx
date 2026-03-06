'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { Button } from '@/components/cc-admin/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'

type WebhookStatus = 'received' | 'processed' | 'ignored' | 'failed'

type WebhookFailureRow = {
  id: string
  event_id: string
  event_type: string
  status: WebhookStatus
  reference: string | null
  invoice_id: string | null
  invoice_number: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

type Props = {
  rows: WebhookFailureRow[]
  activityAlertMetrics: {
    windowHours: number
    sentCount: number
    suppressedCount: number
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function statusClass(status: WebhookStatus) {
  if (status === 'failed') return 'bg-rose-500/20 text-rose-200'
  if (status === 'ignored') return 'bg-slate-700/80 text-slate-200'
  if (status === 'received') return 'bg-cyan-500/20 text-cyan-200'
  return 'bg-emerald-500/20 text-emerald-200'
}

export function WebhookFailureDashboard({ rows, activityAlertMetrics }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | WebhookStatus>('failed')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const stats = useMemo(() => {
    return {
      failed: rows.filter((row) => row.status === 'failed').length,
      ignored: rows.filter((row) => row.status === 'ignored').length,
      received: rows.filter((row) => row.status === 'received').length,
      processed: rows.filter((row) => row.status === 'processed').length,
    }
  }, [rows])

  const visibleRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!search) return true
      const haystack = `${row.event_id} ${row.event_type} ${row.reference ?? ''} ${row.invoice_number ?? row.invoice_id ?? ''} ${row.error_message ?? ''}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [query, rows, statusFilter])

  async function replay(row: WebhookFailureRow) {
    setBusyId(row.id)
    try {
      const response = await fetch(`/api/internal/platform-admin/webhooks/paystack/events/${row.id}/replay`, { method: 'POST' })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        status?: string
        previousStatus?: string
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to replay webhook event')

      toast.success(`Replay complete: ${payload.previousStatus ?? row.status} -> ${payload.status ?? 'processed'}`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to replay webhook event')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-rose-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-rose-200">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-200">Ignored</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">{stats.ignored}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-200">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">{stats.received}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-200">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">{stats.processed}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-200">
              Activity-Log Alerts Sent ({activityAlertMetrics.windowHours}h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">{activityAlertMetrics.sentCount}</p>
            <p className="mt-1 text-xs text-slate-400">Action: alert_activity_log_write_failure</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200">
              Activity-Log Alerts Suppressed ({activityAlertMetrics.windowHours}h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">{activityAlertMetrics.suppressedCount}</p>
            <p className="mt-1 text-xs text-slate-400">Action: suppress_activity_log_write_failure</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Failed Event Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search event id, type, reference, invoice..."
              className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | WebhookStatus)}
              className="cc-native-field h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="failed">Failed only</option>
              <option value="ignored">Ignored only</option>
              <option value="received">Received only</option>
              <option value="processed">Processed only</option>
              <option value="all">All statuses</option>
            </select>
            <div className="flex items-center text-xs text-slate-400">
              Showing {visibleRows.length} of {rows.length} events
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Event</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Reference</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Invoice</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Error</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-[0.16em] text-slate-500">Replay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      No webhook events match this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => (
                    <TableRow key={row.id} className="border-slate-800">
                      <TableCell>
                        <p className="font-medium text-slate-100">{row.event_type}</p>
                        <p className="font-mono text-xs text-slate-400">{row.event_id}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">{row.reference ?? '-'}</TableCell>
                      <TableCell className="text-xs text-slate-300">{row.invoice_number ?? row.invoice_id ?? '-'}</TableCell>
                      <TableCell className="text-xs text-slate-300">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal break-words text-xs text-rose-300">
                        {row.error_message ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                          disabled={isPending || busyId === row.id || row.status === 'processed'}
                          onClick={() => void replay(row)}
                        >
                          Replay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
