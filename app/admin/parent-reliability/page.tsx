import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowUpRight, BarChart3, Route, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Parent Reliability | CC Control Tower',
  description: 'Monitor parent submit failures by route and failure type.',
}

type FailureRow = {
  id: string
  parent_id: string
  route_path: string
  form_name: string
  failure_type: string
  source: 'client' | 'server'
  error_code: string | null
  error_message: string
  created_at: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatHourLabel(offset: number) {
  const date = new Date(Date.now() - offset * 60 * 60 * 1000)
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit' })
}

function truncate(value: string, max = 120) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

export default async function AdminParentReliabilityPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const nowMs = Date.now()
  const dayAgoIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()
  const weekAgoIso = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [rowsResult, failures24hCountResult, failures7dCountResult] = await Promise.all([
    admin
      .from('parent_form_submit_failures')
      .select('id,parent_id,route_path,form_name,failure_type,source,error_code,error_message,created_at')
      .gte('created_at', weekAgoIso)
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('parent_form_submit_failures')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgoIso),
    admin
      .from('parent_form_submit_failures')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgoIso),
  ])

  const rows = ((rowsResult.data ?? []) as FailureRow[]).filter((row) => row.created_at)
  const failures24h = rows.filter((row) => Date.parse(row.created_at) >= nowMs - 24 * 60 * 60 * 1000)

  const parentIds = Array.from(new Set(rows.map((row) => row.parent_id).filter(Boolean)))
  const parentProfilesResult = parentIds.length
    ? await admin.from('user_profiles').select('id,full_name,phone').in('id', parentIds)
    : { data: [] as Array<{ id: string; full_name: string | null; phone: string | null }> }
  const profileMap = new Map(
    ((parentProfilesResult.data ?? []) as Array<{ id: string; full_name: string | null; phone: string | null }>).map((row) => [
      row.id,
      row,
    ])
  )

  const routeCounts = new Map<string, number>()
  const failureTypeCounts = new Map<string, number>()
  const routeFailureCounts = new Map<string, { route: string; failureType: string; count: number }>()
  const hourBuckets = Array.from({ length: 24 }, () => 0)
  const windowStart = nowMs - 24 * 60 * 60 * 1000

  for (const row of failures24h) {
    const routeKey = row.route_path || 'unknown_route'
    const typeKey = row.failure_type || 'unknown_failure'
    routeCounts.set(routeKey, (routeCounts.get(routeKey) ?? 0) + 1)
    failureTypeCounts.set(typeKey, (failureTypeCounts.get(typeKey) ?? 0) + 1)

    const comboKey = `${routeKey}__${typeKey}`
    const existing = routeFailureCounts.get(comboKey)
    if (existing) {
      existing.count += 1
      routeFailureCounts.set(comboKey, existing)
    } else {
      routeFailureCounts.set(comboKey, { route: routeKey, failureType: typeKey, count: 1 })
    }

    const createdMs = Date.parse(row.created_at)
    if (Number.isNaN(createdMs) || createdMs < windowStart || createdMs > nowMs) continue
    const bucket = Math.min(23, Math.floor((createdMs - windowStart) / (60 * 60 * 1000)))
    hourBuckets[bucket] += 1
  }

  const routeHotspots = Array.from(routeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([route, count]) => ({ route, count }))

  const failureTypeHotspots = Array.from(failureTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([failureType, count]) => ({ failureType, count }))

  const routeFailureHotspots = Array.from(routeFailureCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const maxBucket = Math.max(...hourBuckets, 1)
  const uniqueParents24h = new Set(failures24h.map((row) => row.parent_id)).size
  const uniqueRoutes24h = new Set(failures24h.map((row) => row.route_path)).size
  const latestFailure = rows[0]

  return (
    <AdminPageLayout
      title="Parent Reliability"
      description="Monitor parent form submit failures by route and failure type."
      roleLabel="Reliability Console"
      wide
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/dashboard?audience=parent"
            className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Parent Command Center
          </Link>
          <Link
            href="/admin/audit-trail"
            className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Audit Trail
          </Link>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CyberCard accent="cyan" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Failures (24h)</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{(failures24hCountResult.count ?? 0).toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-cyan-300">Parent submit failures</p>
        </CyberCard>
        <CyberCard accent="violet" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Failures (7d)</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{(failures7dCountResult.count ?? 0).toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-violet-300">Rolling weekly volume</p>
        </CyberCard>
        <CyberCard accent="rose" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Affected Parents (24h)</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{uniqueParents24h.toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-rose-300">Unique parent accounts</p>
        </CyberCard>
        <CyberCard accent="green" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Failing Routes (24h)</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{uniqueRoutes24h.toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-emerald-300">Route hotspots detected</p>
        </CyberCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <CyberCard className="xl:col-span-2 p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-300" />
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">24h Failure Trend</h2>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Hourly count of `parent_form_submit_failures` over the last 24 hours.
          </p>
          <div className="mt-4 flex h-28 items-end gap-1 rounded-2xl border border-white/5 bg-black/30 px-3 py-3">
            {hourBuckets.map((value, index) => (
              <div key={`${index}-${value}`} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="w-full rounded-full bg-gradient-to-t from-cyan-600/90 to-cyan-300/90"
                  style={{ height: `${Math.max(8, Math.round((value / maxBucket) * 100))}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
            <span>{formatHourLabel(23)}h</span>
            <span>{formatHourLabel(12)}h</span>
            <span>{formatHourLabel(0)}h</span>
          </div>
        </CyberCard>

        <CyberCard className="p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">Latest Incident</h2>
          </div>
          {latestFailure ? (
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <p className="font-semibold text-white">{latestFailure.route_path}</p>
              <p className="text-xs uppercase tracking-wider text-amber-300">{latestFailure.failure_type}</p>
              <p className="text-xs text-slate-400">{truncate(latestFailure.error_message, 140)}</p>
              <p className="text-[11px] text-slate-500">{formatDateTime(latestFailure.created_at)}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No recent submit failures in the selected lookback.</p>
          )}
        </CyberCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CyberCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-cyan-300">Route Hotspots (24h)</h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            {routeHotspots.length === 0 ? (
              <p className="text-sm text-slate-500">No route hotspots in the last 24 hours.</p>
            ) : (
              routeHotspots.map((row) => (
                <div key={row.route} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  <p className="truncate pr-3 text-sm text-slate-200">{row.route}</p>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-300">
                    {row.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </CyberCard>

        <CyberCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-violet-300">Failure Types (24h)</h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            {failureTypeHotspots.length === 0 ? (
              <p className="text-sm text-slate-500">No failure types recorded in the last 24 hours.</p>
            ) : (
              failureTypeHotspots.map((row) => (
                <div key={row.failureType} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  <p className="truncate pr-3 text-sm text-slate-200">{row.failureType}</p>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-300">
                    {row.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </CyberCard>
      </div>

      <CyberCard className="p-0 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-white/5 bg-white/2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-rose-300" />
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">Recent Submit Failures</h2>
          </div>
          <p className="text-xs text-slate-400">Showing latest {Math.min(50, rows.length)} rows from 7-day lookback</p>
        </div>
        <div className="bg-slate-950/40">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Time</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Parent</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Route</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Form</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Failure Type</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Message</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={7} className="px-6 py-10 text-sm text-slate-500">
                    No submit failures found in the last 7 days.
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 50).map((row) => {
                  const parentProfile = profileMap.get(row.parent_id)
                  const parentName = parentProfile?.full_name?.trim() || 'Parent account'
                  const parentPhone = parentProfile?.phone?.trim() || null
                  return (
                    <TableRow key={row.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="p-4 text-xs text-slate-400">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="p-4 text-sm text-white">
                        <p className="font-semibold">{parentName}</p>
                        <p className="text-[11px] text-slate-500">{parentPhone || row.parent_id}</p>
                      </TableCell>
                      <TableCell className="p-4 text-xs text-cyan-200">{row.route_path}</TableCell>
                      <TableCell className="p-4 text-xs text-slate-300">{row.form_name}</TableCell>
                      <TableCell className="p-4">
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {row.failure_type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[360px] p-4 text-xs text-slate-300">{truncate(row.error_message, 180)}</TableCell>
                      <TableCell className="p-4 text-xs uppercase tracking-wider text-slate-400">{row.source}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CyberCard>

      {routeFailureHotspots.length > 0 ? (
        <CyberCard className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">Top Route + Failure Pairs (24h)</h2>
            <Link href="/admin/dashboard?audience=parent" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
              Open Parent Audience
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {routeFailureHotspots.map((item) => (
              <div key={`${item.route}:${item.failureType}`} className="rounded-xl border border-white/5 bg-black/20 p-3">
                <p className="truncate text-sm font-semibold text-slate-100">{item.route}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-amber-300">{item.failureType}</p>
                <p className="mt-1 text-xs text-slate-400">{item.count} failures</p>
              </div>
            ))}
          </div>
        </CyberCard>
      ) : null}
    </AdminPageLayout>
  )
}
