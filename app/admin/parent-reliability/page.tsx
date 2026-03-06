import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowUpRight, BarChart3, Route } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { IncidentHandoffActions } from './_components/incident-handoff-actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Parent Reliability | CC Control Tower',
  description: 'Monitor parent submit failures by route and failure type.',
}

type SearchParams = Record<string, string | string[] | undefined>
type ReliabilityWindow = '24h' | '7d'
type ReliabilityFilters = {
  routeFilter?: string
  failureTypeFilter?: string
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

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]?.trim() ?? ''
  return value?.trim() ?? ''
}

function toWindow(value: string): ReliabilityWindow {
  return value.toLowerCase() === '7d' ? '7d' : '24h'
}

function buildReliabilityHref(window: ReliabilityWindow, filters?: ReliabilityFilters) {
  const routeFilter = filters?.routeFilter?.trim() ?? ''
  const failureTypeFilter = filters?.failureTypeFilter?.trim() ?? ''
  const params = new URLSearchParams()
  if (window !== '24h') params.set('window', window)
  if (routeFilter) params.set('route', routeFilter)
  if (failureTypeFilter) params.set('failureType', failureTypeFilter)
  const query = params.toString()
  return query ? `/admin/parent-reliability?${query}` : '/admin/parent-reliability'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatTrendLabel(timestampMs: number, window: ReliabilityWindow) {
  const date = new Date(timestampMs)
  if (window === '24h') return date.toLocaleTimeString('en-ZA', { hour: '2-digit' })
  return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
}

function truncate(value: string, max = 120) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}...`
}

function trendDeltaFromSeries(series: number[]) {
  if (series.length === 0) {
    return { direction: 'flat' as const, percentChange: 0, firstHalfTotal: 0, secondHalfTotal: 0 }
  }

  const midpoint = Math.floor(series.length / 2)
  const firstHalf = series.slice(0, midpoint)
  const secondHalf = series.slice(midpoint)
  const firstHalfTotal = firstHalf.reduce((sum, value) => sum + value, 0)
  const secondHalfTotal = secondHalf.reduce((sum, value) => sum + value, 0)

  let percentChange = 0
  if (firstHalfTotal === 0) {
    percentChange = secondHalfTotal > 0 ? 100 : 0
  } else {
    percentChange = Number((((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100).toFixed(1))
  }

  const direction = secondHalfTotal > firstHalfTotal ? 'up' : secondHalfTotal < firstHalfTotal ? 'down' : 'flat'
  return { direction, percentChange, firstHalfTotal, secondHalfTotal }
}

export default async function AdminParentReliabilityPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const selectedWindow = toWindow(first(searchParams?.window))
  const routeFilter = first(searchParams?.route)
  const failureTypeFilter = first(searchParams?.failureType)
  const windowMs = selectedWindow === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  const nowMs = Date.now()
  const windowStartMs = nowMs - windowMs
  const windowStartIso = new Date(windowStartMs).toISOString()

  let rowsQuery = admin
    .from('parent_form_submit_failures')
    .select('id,parent_id,route_path,form_name,failure_type,source,error_code,error_message,created_at')
    .gte('created_at', windowStartIso)
    .order('created_at', { ascending: false })
    .limit(500)
  if (routeFilter) rowsQuery = rowsQuery.ilike('route_path', `%${routeFilter}%`)
  if (failureTypeFilter) rowsQuery = rowsQuery.ilike('failure_type', `%${failureTypeFilter}%`)

  const rowsResult = await rowsQuery
  const rows = ((rowsResult.data ?? []) as FailureRow[]).filter((row) => row.created_at)

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
  const bucketCount = selectedWindow === '24h' ? 24 : 7
  const bucketMs = selectedWindow === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const trendBuckets = Array.from({ length: bucketCount }, () => 0)

  for (const row of rows) {
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
    if (Number.isNaN(createdMs) || createdMs < windowStartMs || createdMs > nowMs) continue
    const bucket = Math.min(bucketCount - 1, Math.floor((createdMs - windowStartMs) / bucketMs))
    trendBuckets[bucket] += 1
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

  const trendDelta = trendDeltaFromSeries(trendBuckets)
  const trendDeltaPercentLabel =
    trendDelta.percentChange > 0 ? `+${trendDelta.percentChange}%` : `${trendDelta.percentChange}%`
  const trendDeltaDirectionLabel = trendDelta.direction === 'up' ? 'UP' : trendDelta.direction === 'down' ? 'DOWN' : 'FLAT'
  const trendDeltaChipClass =
    trendDelta.direction === 'up'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : trendDelta.direction === 'down'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        : 'border-slate-500/30 bg-slate-500/10 text-slate-300'

  const maxBucket = Math.max(...trendBuckets, 1)
  const uniqueParents = new Set(rows.map((row) => row.parent_id).filter(Boolean)).size
  const uniqueRoutes = new Set(rows.map((row) => row.route_path).filter(Boolean)).size
  const uniqueFailureTypes = new Set(rows.map((row) => row.failure_type).filter(Boolean)).size
  const latestFailure = rows[0]
  const windowLabel = selectedWindow === '24h' ? '24h' : '7d'
  const trendDetailLabel = selectedWindow === '24h' ? 'Hourly' : 'Daily'
  const filterSegments = [`Window: ${windowLabel}`]
  if (routeFilter) filterSegments.push(`Route filter: ${routeFilter}`)
  if (failureTypeFilter) filterSegments.push(`Failure type filter: ${failureTypeFilter}`)
  const activeFilterSummary = filterSegments.join(' | ')
  const window24hHref = buildReliabilityHref('24h', { routeFilter, failureTypeFilter })
  const window7dHref = buildReliabilityHref('7d', { routeFilter, failureTypeFilter })
  const clearFiltersHref = buildReliabilityHref(selectedWindow)
  const clearRouteOnlyHref = buildReliabilityHref(selectedWindow, { failureTypeFilter })
  const clearFailureTypeOnlyHref = buildReliabilityHref(selectedWindow, { routeFilter })
  const alternateWindow: ReliabilityWindow = selectedWindow === '24h' ? '7d' : '24h'
  const alternateWindowLabel = selectedWindow === '24h' ? 'Expand to 7d' : 'Narrow to 24h'
  const alternateWindowHref = buildReliabilityHref(alternateWindow)
  const midLabelIndex = Math.floor(bucketCount / 2)
  const topRoute = routeHotspots[0] ?? null
  const topFailureType = failureTypeHotspots[0] ?? null
  const topRouteHref = topRoute
    ? buildReliabilityHref(selectedWindow, { routeFilter: topRoute.route, failureTypeFilter })
    : null
  const topFailureTypeHref = topFailureType
    ? buildReliabilityHref(selectedWindow, { routeFilter, failureTypeFilter: topFailureType.failureType })
    : null
  const latestIncidentRouteFilter = latestFailure?.route_path?.trim() ?? ''
  const latestIncidentFailureTypeFilter = latestFailure?.failure_type?.trim() ?? ''
  const latestIncidentHref =
    latestIncidentRouteFilter && latestIncidentFailureTypeFilter
      ? buildReliabilityHref(selectedWindow, {
          routeFilter: latestIncidentRouteFilter,
          failureTypeFilter: latestIncidentFailureTypeFilter,
        })
      : null
  const generatedAtLabel = new Date(nowMs).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  const incidentSummaryText = [
    'CentreConnect parent reliability handoff',
    `Window: ${windowLabel}`,
    routeFilter ? `Route filter: ${routeFilter}` : 'Route filter: (none)',
    failureTypeFilter ? `Failure type filter: ${failureTypeFilter}` : 'Failure type filter: (none)',
    `Current failures: ${rows.length}`,
    `Top route: ${topRoute ? `${topRoute.route} (${topRoute.count})` : 'none'}`,
    `Top failure type: ${topFailureType ? `${topFailureType.failureType} (${topFailureType.count})` : 'none'}`,
    `Generated: ${generatedAtLabel}`,
  ].join('\n')
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(incidentSummaryText)}`

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
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Failures ({windowLabel})</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{rows.length.toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-cyan-300">Submit failures in selected window</p>
        </CyberCard>
        <CyberCard accent="violet" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Affected Parents ({windowLabel})</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{uniqueParents.toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-violet-300">Unique parent accounts</p>
        </CyberCard>
        <CyberCard accent="rose" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Failing Routes ({windowLabel})</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{uniqueRoutes.toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-rose-300">Route hotspots detected</p>
        </CyberCard>
        <CyberCard accent="green" glow className="p-5">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Failure Types ({windowLabel})</p>
          <h2 className="mt-2 font-orbitron text-3xl font-bold text-white">{uniqueFailureTypes.toLocaleString()}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-emerald-300">Distinct failure categories</p>
        </CyberCard>
      </section>

      <CyberCard className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">Incident Handoff Summary</h2>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Scoped to selected filters</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Active window</p>
            <p className="mt-1 text-sm font-semibold text-white">{windowLabel}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Current failures</p>
            <p className="mt-1 text-sm font-semibold text-white">{rows.length.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Top route</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{topRoute?.route || 'none'}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Top failure type</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{topFailureType?.failureType || 'none'}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {topRouteHref ? (
            <Link
              href={topRouteHref}
              className="inline-flex h-9 items-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
            >
              Focus Top Route
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-xl border border-slate-700 px-3 text-[11px] uppercase tracking-wider text-slate-500">
              No route hotspot
            </span>
          )}
          {topFailureTypeHref ? (
            <Link
              href={topFailureTypeHref}
              className="inline-flex h-9 items-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-violet-200 hover:bg-violet-500/20"
            >
              Focus Top Failure Type
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-xl border border-slate-700 px-3 text-[11px] uppercase tracking-wider text-slate-500">
              No failure type hotspot
            </span>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200">Copy-ready snippet</p>
          <textarea
            readOnly
            value={incidentSummaryText}
            className="cc-native-field mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none"
          />
          <IncidentHandoffActions summaryText={incidentSummaryText} whatsappHref={whatsappShareHref} />
        </div>
      </CyberCard>

      <CyberCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">Triage Filters</h2>
            <p className="mt-2 text-xs text-slate-400">{activeFilterSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={window24hHref}
              className={`inline-flex h-9 items-center rounded-xl border px-3 text-[11px] font-semibold uppercase tracking-wider ${
                selectedWindow === '24h'
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              24h
            </Link>
            <Link
              href={window7dHref}
              className={`inline-flex h-9 items-center rounded-xl border px-3 text-[11px] font-semibold uppercase tracking-wider ${
                selectedWindow === '7d'
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              7d
            </Link>
          </div>
        </div>
        <form method="get" action="/admin/parent-reliability" className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <input type="hidden" name="window" value={selectedWindow} />
          <label className="flex-1 space-y-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Route filter</span>
            <input
              name="route"
              defaultValue={routeFilter}
              placeholder="/parent/children/new"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>
          <label className="flex-1 space-y-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Failure type filter</span>
            <input
              name="failureType"
              defaultValue={failureTypeFilter}
              placeholder="mutation_error"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
          >
            Apply
          </button>
          <Link
            href={clearFiltersHref}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-900"
          >
            Clear filters
          </Link>
        </form>
        {routeFilter || failureTypeFilter ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {routeFilter ? (
              <Link
                href={clearRouteOnlyHref}
                className="inline-flex h-8 items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
              >
                Clear route filter
              </Link>
            ) : null}
            {failureTypeFilter ? (
              <Link
                href={clearFailureTypeOnlyHref}
                className="inline-flex h-8 items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3 text-[10px] font-semibold uppercase tracking-wider text-violet-200 hover:bg-violet-500/20"
              >
                Clear failure type filter
              </Link>
            ) : null}
          </div>
        ) : null}
      </CyberCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <CyberCard className="xl:col-span-2 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-300" />
              <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">{windowLabel} Failure Trend</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${trendDeltaChipClass}`}>
                {trendDeltaDirectionLabel}
              </span>
              <span className="text-[11px] text-slate-300">
                Delta vs previous half: {trendDeltaPercentLabel}
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {trendDetailLabel} count of `parent_form_submit_failures` in the selected filter window.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            First half: {trendDelta.firstHalfTotal.toLocaleString()} | Second half: {trendDelta.secondHalfTotal.toLocaleString()}
          </p>
          <div className="mt-4 flex h-28 items-end gap-1 rounded-2xl border border-white/5 bg-black/30 px-3 py-3">
            {trendBuckets.map((value, index) => (
              <div key={`${index}-${value}`} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="w-full rounded-full bg-gradient-to-t from-cyan-600/90 to-cyan-300/90"
                  style={{ height: `${Math.max(8, Math.round((value / maxBucket) * 100))}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
            <span>{formatTrendLabel(windowStartMs, selectedWindow)}</span>
            <span>{formatTrendLabel(windowStartMs + midLabelIndex * bucketMs, selectedWindow)}</span>
            <span>{formatTrendLabel(nowMs, selectedWindow)}</span>
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
              {latestIncidentHref ? (
                <Link
                  href={latestIncidentHref}
                  className="mt-1 inline-flex h-8 items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 hover:bg-amber-500/20"
                >
                  Focus Latest Pair
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No submit failures found for the selected filters.</p>
          )}
        </CyberCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CyberCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-cyan-300">Route Hotspots ({windowLabel})</h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            {routeHotspots.length === 0 ? (
              <p className="text-sm text-slate-500">No route hotspots in the selected filter window.</p>
            ) : (
              routeHotspots.map((row) => (
                <div key={row.route} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  <p className="truncate pr-3 text-sm text-slate-200">{row.route}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-300">
                      {row.count}
                    </span>
                    <Link
                      href={buildReliabilityHref(selectedWindow, { routeFilter: row.route, failureTypeFilter })}
                      className="inline-flex h-7 items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Focus route
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CyberCard>

        <CyberCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-violet-300">Failure Types ({windowLabel})</h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            {failureTypeHotspots.length === 0 ? (
              <p className="text-sm text-slate-500">No failure types recorded in the selected filter window.</p>
            ) : (
              failureTypeHotspots.map((row) => (
                <div key={row.failureType} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  <p className="truncate pr-3 text-sm text-slate-200">{row.failureType}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-300">
                      {row.count}
                    </span>
                    <Link
                      href={buildReliabilityHref(selectedWindow, { routeFilter, failureTypeFilter: row.failureType })}
                      className="inline-flex h-7 items-center rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-violet-200 hover:bg-violet-500/20"
                    >
                      Focus type
                    </Link>
                  </div>
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
          <p className="text-xs text-slate-400">Showing latest {Math.min(50, rows.length)} rows from {windowLabel} filtered window</p>
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
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Triage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={8} className="px-6 py-10 text-sm text-slate-500">
                    <p>No submit failures found in the selected filter window.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={clearFiltersHref}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-700 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-900"
                      >
                        Reset filters
                      </Link>
                      <Link
                        href={alternateWindowHref}
                        className="inline-flex h-8 items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
                      >
                        {alternateWindowLabel}
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 50).map((row) => {
                  const parentProfile = profileMap.get(row.parent_id)
                  const parentName = parentProfile?.full_name?.trim() || 'Parent account'
                  const parentPhone = parentProfile?.phone?.trim() || null
                  const rowRouteFilter = row.route_path?.trim() ?? ''
                  const rowFailureTypeFilter = row.failure_type?.trim() ?? ''
                  const rowFocusHref =
                    rowRouteFilter && rowFailureTypeFilter
                      ? buildReliabilityHref(selectedWindow, {
                          routeFilter: rowRouteFilter,
                          failureTypeFilter: rowFailureTypeFilter,
                        })
                      : null
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
                      <TableCell className="p-4">
                        {rowFocusHref ? (
                          <Link
                            href={rowFocusHref}
                            className="inline-flex h-7 items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20"
                          >
                            Focus row
                          </Link>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">N/A</span>
                        )}
                      </TableCell>
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
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">Top Route + Failure Pairs ({windowLabel})</h2>
            <Link href="/admin/dashboard?audience=parent" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
              Open Parent Audience
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {routeFailureHotspots.map((item) => {
              const pairHref = buildReliabilityHref(selectedWindow, {
                routeFilter: item.route,
                failureTypeFilter: item.failureType,
              })
              return (
                <div key={`${item.route}:${item.failureType}`} className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <p className="truncate text-sm font-semibold text-slate-100">{item.route}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-amber-300">{item.failureType}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.count} failures</p>
                  <Link
                    href={pairHref}
                    className="mt-2 inline-flex h-8 items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20"
                  >
                    Focus Pair
                  </Link>
                </div>
              )
            })}
          </div>
        </CyberCard>
      ) : null}
    </AdminPageLayout>
  )
}
