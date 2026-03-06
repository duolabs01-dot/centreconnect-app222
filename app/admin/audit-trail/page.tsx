import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Audit Trail | CC Control Tower',
  description: 'Immutable timeline of platform admin and billing actions.',
}

type SearchParams = Promise<{
  q?: string
  actor?: string
  action?: string
  from?: string
  to?: string
}>

type ActivityRow = {
  id: string
  actor_email: string | null
  actor_user_id: string | null
  entity_type: string | null
  entity_id: string | null
  action: string
  summary: string
  details: Record<string, unknown> | null
  created_at: string
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function asDateBound(value: string | undefined, endOfDay: boolean) {
  if (!value) return null
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'
  const parsed = new Date(`${value}${suffix}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default async function AdminAuditTrailPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const actor = params.actor?.trim() ?? ''
  const selectedAction = params.action?.trim() ?? ''
  const fromRaw = params.from?.trim()
  const toRaw = params.to?.trim()
  const from = asDateBound(fromRaw, false)
  const to = asDateBound(toRaw, true)

  const { data, error } = await admin
    .from('platform_admin_activity_log')
    .select('id,actor_email,actor_user_id,entity_type,entity_id,action,summary,details,created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return (
      <AdminPageLayout
        title="Audit Trail"
        description="Immutable timeline of billing and admin actions."
        roleLabel="Audit Console"
        wide
      >
        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="text-rose-200">Audit log unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rose-100/80">{error.message}</p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    )
  }

  const rows = (data ?? []) as ActivityRow[]
  const actionOptions = Array.from(new Set(rows.map((row) => row.action))).sort((a, b) => a.localeCompare(b))

  const filteredRows = rows.filter((row) => {
    if (selectedAction && row.action !== selectedAction) return false
    if (actor) {
      const actorValue = (row.actor_email ?? '').toLowerCase()
      if (!actorValue.includes(actor.toLowerCase())) return false
    }

    const created = new Date(row.created_at)
    if (from && created < from) return false
    if (to && created > to) return false

    if (!q) return true
    const haystack = `${row.summary ?? ''} ${row.action ?? ''} ${row.entity_id ?? ''} ${row.entity_type ?? ''}`.toLowerCase()
    return haystack.includes(q.toLowerCase())
  })

  return (
    <AdminPageLayout
      title="Audit Trail"
      description="Immutable timeline for platform admin and billing actions."
      roleLabel="Audit Console"
      wide
      actions={
        <div className="flex gap-2">
          <Link
            href="/admin/webhook-failures"
            className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Webhook Incident Desk
          </Link>
          <Link
            href="/admin/runbooks/payment-incidents"
            className="inline-flex h-10 items-center rounded-xl bg-cyan-500 px-4 text-xs font-black uppercase tracking-[0.08em] text-slate-900 hover:bg-cyan-400"
          >
            Payment Runbook
          </Link>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search summary, action, tenant..."
              className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              type="text"
              name="actor"
              defaultValue={actor}
              placeholder="Actor email contains..."
              className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <select
              name="action"
              defaultValue={selectedAction}
              className="cc-native-field h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="">All actions</option>
              {actionOptions.map((actionValue) => (
                <option key={actionValue} value={actionValue}>
                  {actionValue}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={fromRaw ?? ''}
              className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            />
            <input
              type="date"
              name="to"
              defaultValue={toRaw ?? ''}
              className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            />
            <div className="md:col-span-5 flex gap-2">
              <button
                type="submit"
                className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-bold text-slate-900 hover:bg-cyan-400"
              >
                Apply filters
              </button>
              <a
                href="/admin/audit-trail"
                className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Reset
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            Immutable events ({filteredRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Time</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Actor</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Action</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Entity</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Summary</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.16em] text-slate-500">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      No activity matches the current filter set.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id} className="border-slate-800">
                      <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="text-xs text-slate-300">{row.actor_email ?? row.actor_user_id ?? 'platform-admin'}</TableCell>
                      <TableCell className="font-mono text-xs text-cyan-300">{row.action}</TableCell>
                      <TableCell className="text-xs text-slate-300">{[row.entity_type, row.entity_id].filter(Boolean).join(': ') || '-'}</TableCell>
                      <TableCell className="max-w-[460px] whitespace-normal break-words text-slate-200">{row.summary}</TableCell>
                      <TableCell className="max-w-[340px] whitespace-pre-wrap break-words text-[11px] text-slate-400">
                        {row.details ? JSON.stringify(row.details, null, 2) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
