import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { cn } from '@/lib/utils'
import { Activity, BarChart3, Fingerprint, Zap, Globe, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Analytics | Platform Admin',
  description: 'See parent interest, centre engagement, and application activity.',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

type AnalyticsEvent = {
  id: string
  ecd_id: string
  event_type: 'profile_view' | 'whatsapp_click' | 'call_click' | 'application_submitted'
  created_at: string
  metadata: Record<string, unknown> | null
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const { data: rows } = await admin
    .from('ecd_analytics_events')
    .select('id,ecd_id,event_type,created_at,metadata')
    .order('created_at', { ascending: false })
    .limit(3000)

  const events = ((rows ?? []) as AnalyticsEvent[]) ?? []
  const since7 = Date.now() - 7 * 24 * 60 * 60 * 1000
  const total = events.length
  const last7 = events.filter((event) => new Date(event.created_at).getTime() >= since7).length

  const byType = {
    profile_view: events.filter((event) => event.event_type === 'profile_view').length,
    whatsapp_click: events.filter((event) => event.event_type === 'whatsapp_click').length,
    call_click: events.filter((event) => event.event_type === 'call_click').length,
    application_submitted: events.filter((event) => event.event_type === 'application_submitted').length,
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentEvents = events.filter((event) => new Date(event.created_at).getTime() >= thirtyDaysAgo.getTime())

  const dailyCounts: Record<string, Record<string, number>> = {}
  for (const event of recentEvents) {
    const day = event.created_at.slice(0, 10)
    if (!dailyCounts[day]) dailyCounts[day] = {}
    dailyCounts[day][event.event_type] = (dailyCounts[day][event.event_type] ?? 0) + 1
  }

  const centreIds = [...new Set(events.map((event) => event.ecd_id))]
  const { data: centreNames } = centreIds.length
    ? await admin.from('ecd_centres').select('id,name').in('id', centreIds)
    : { data: [] as Array<{ id: string; name: string }> }

  const centreNameMap = Object.fromEntries((centreNames ?? []).map((centre) => [centre.id, centre.name])) as Record<
    string,
    string
  >

  const byCentre: Record<string, { views: number; contacts: number; applications: number }> = {}
  for (const event of events) {
    if (!byCentre[event.ecd_id]) {
      byCentre[event.ecd_id] = { views: 0, contacts: 0, applications: 0 }
    }

    if (event.event_type === 'profile_view') byCentre[event.ecd_id].views += 1
    if (event.event_type === 'whatsapp_click' || event.event_type === 'call_click') byCentre[event.ecd_id].contacts += 1
    if (event.event_type === 'application_submitted') byCentre[event.ecd_id].applications += 1
  }

  const topCentres = Object.entries(byCentre)
    .map(([id, counts]) => ({
      id,
      name: centreNameMap[id] ?? `${id.slice(0, 8)}...`,
      views: counts.views,
      contacts: counts.contacts,
      applications: counts.applications,
      total: counts.views + counts.contacts + counts.applications,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  const conversionFunnel = [
    { stage: 'Profile Views', count: byType.profile_view, color: 'bg-cyan-500' },
    { stage: 'Contact Clicks', count: byType.whatsapp_click + byType.call_click, color: 'bg-amber-500' },
    { stage: 'Applications Submitted', count: byType.application_submitted, color: 'bg-emerald-500' },
  ]

  const days30 = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    return date.toISOString().slice(0, 10)
  })

  const maxDaily = Math.max(
    ...days30.map((day) => Object.values(dailyCounts[day] ?? {}).reduce((sum, value) => sum + value, 0)),
    1
  )

  const trendPoints = days30
    .map((day, index) => {
      const totalForDay = Object.values(dailyCounts[day] ?? {}).reduce((sum, value) => sum + value, 0)
      const x = (index / 29) * 560 + 20
      const y = 100 - (totalForDay / maxDaily) * 80
      return `${x},${y}`
    })
    .join(' ')

  return (
    <AdminPageLayout
      title="Analytics"
      description="See how parents are viewing centres, clicking contact actions, and submitting applications."
      roleLabel="Platform Admin"
      wide
    >
      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Total Pings</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{total}</h3>
              <p className="mt-1 text-[10px] text-cyber-cyan">All tracked parent and centre events</p>
            </div>
            <Activity className="h-4 w-4 text-cyber-cyan" />
          </div>
        </CyberCard>

        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Active Week</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{last7}</h3>
              <p className="mt-1 text-[10px] text-cyber-violet">Events recorded in the last 7 days</p>
            </div>
            <Zap className="h-4 w-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Engagement</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{byType.whatsapp_click + byType.call_click}</h3>
              <p className="mt-1 text-[10px] text-cyber-green">WhatsApp and call clicks</p>
            </div>
            <Fingerprint className="h-4 w-4 text-cyber-green" />
          </div>
        </CyberCard>

        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Conversions</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{byType.application_submitted}</h3>
              <p className="mt-1 text-[10px] text-cyber-cyan">Applications sent to centres</p>
            </div>
            <Globe className="h-4 w-4 text-cyber-cyan" />
          </div>
        </CyberCard>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <CyberCard className="p-5 lg:col-span-2">
          <p className="mb-3 font-orbitron text-[9px] uppercase tracking-widest text-cyber-cyan">30-Day Activity Trend</p>
          <svg viewBox="0 0 600 120" className="h-32 w-full">
            <line x1="0" y1="90" x2="600" y2="90" stroke="rgb(51,65,85)" strokeWidth="0.5" />
            <line x1="0" y1="70" x2="600" y2="70" stroke="rgb(51,65,85)" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="600" y2="50" stroke="rgb(51,65,85)" strokeWidth="0.5" />
            <polyline points={trendPoints} fill="none" stroke="rgb(6,182,212)" strokeWidth="2" />
            {days30.map((day, index) => {
              const totalForDay = Object.values(dailyCounts[day] ?? {}).reduce((sum, value) => sum + value, 0)
              const x = (index / 29) * 560 + 20
              const y = 100 - (totalForDay / maxDaily) * 80
              return <circle key={day} cx={x} cy={y} r="1.8" fill="rgb(6,182,212)" />
            })}
          </svg>
        </CyberCard>

        <CyberCard className="p-5">
          <p className="mb-4 font-orbitron text-[9px] uppercase tracking-widest text-cyber-violet">Conversion Funnel</p>
          <div className="space-y-3">
            {conversionFunnel.map((stage, index) => {
              const pct =
                index === 0
                  ? 100
                  : conversionFunnel[0].count > 0
                    ? Math.round((stage.count / conversionFunnel[0].count) * 100)
                    : 0

              return (
                <div key={stage.stage}>
                  <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                    <span>{stage.stage}</span>
                    <span>
                      {stage.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div className={cn('h-full rounded-full', stage.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CyberCard>
      </div>

      <CyberCard className="mb-8 overflow-hidden p-0">
        <div className="border-b border-white/5 bg-white/2 px-6 py-4">
          <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-cyber-cyan">Top centre activity</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Centre Name</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Profile Views</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Contact Clicks</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Applications</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCentres.length === 0 ? (
                <TableRow className="border-white/5">
                  <TableCell className="p-4 text-slate-400" colSpan={5}>
                    No centre analytics activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                topCentres.map((centre) => (
                  <TableRow key={centre.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="p-4 text-xs text-white">{centre.name}</TableCell>
                    <TableCell className="p-4 text-xs text-slate-300">{centre.views}</TableCell>
                    <TableCell className="p-4 text-xs text-slate-300">{centre.contacts}</TableCell>
                    <TableCell className="p-4 text-xs text-slate-300">{centre.applications}</TableCell>
                    <TableCell className="p-4 text-xs font-semibold text-cyber-cyan">{centre.total}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CyberCard>

      <div className="mb-8 grid gap-6 lg:grid-cols-4">
        {[
          { label: 'Profile views', val: byType.profile_view, color: 'text-white', icon: BarChart3 },
          { label: 'Comm Link Clicks', val: byType.whatsapp_click, color: 'text-emerald-400', icon: MessageSquare },
          { label: 'Direct Dial Clicks', val: byType.call_click, color: 'text-amber-400', icon: Zap },
          { label: 'Application Nodes', val: byType.application_submitted, color: 'text-cyan-400', icon: Fingerprint },
        ].map((stat) => (
          <CyberCard key={stat.label} className="border-white/5 bg-white/2 p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={cn('h-4 w-4', stat.color)} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{stat.label}</p>
                <p className={cn('font-orbitron text-lg font-bold', stat.color)}>{stat.val}</p>
              </div>
            </div>
          </CyberCard>
        ))}
      </div>

      <CyberCard className="overflow-hidden p-0">
        <div className="border-b border-white/5 bg-white/2 px-6 py-4">
          <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-cyber-cyan">Recent activity log</h2>
        </div>
        <div className="h-72 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyber-cyan/30">
          <div className="bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Timestamp</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Signal</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Source_Node</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Data_Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="p-4 font-mono text-xs text-slate-400">{formatDateTime(event.created_at)}</TableCell>
                    <TableCell className="p-4">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          event.event_type === 'application_submitted'
                            ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
                            : event.event_type === 'whatsapp_click'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/10 bg-white/5 text-slate-300'
                        )}
                      >
                        {event.event_type}
                      </span>
                    </TableCell>
                    <TableCell className="p-4 font-mono text-[10px] text-slate-500">{event.ecd_id.slice(0, 12)}...</TableCell>
                    <TableCell className="p-4">
                      <pre className="max-w-[400px] truncate text-[10px] text-slate-500">{JSON.stringify(event.metadata)}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CyberCard>
    </AdminPageLayout>
  )
}
