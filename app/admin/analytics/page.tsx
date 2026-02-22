import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'
import { cn } from '@/lib/utils'
import { Activity, BarChart3, Fingerprint, Zap, Globe, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Neural | CC Control Tower',
  description: 'Event-stream visibility and cross-platform neural indicators.',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
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
    .limit(1000)

  const events = (rows ?? []) as Array<{
    id: string
    ecd_id: string
    event_type: 'profile_view' | 'whatsapp_click' | 'call_click' | 'application_submitted'
    created_at: string
    metadata: Record<string, unknown> | null
  }>

  const since7 = Date.now() - 7 * 24 * 60 * 60 * 1000
  const total = events.length
  const last7 = events.filter((e) => new Date(e.created_at).getTime() >= since7).length
  
  const byType = {
    profile_view: events.filter((e) => e.event_type === 'profile_view').length,
    whatsapp_click: events.filter((e) => e.event_type === 'whatsapp_click').length,
    call_click: events.filter((e) => e.event_type === 'call_click').length,
    application_submitted: events.filter((e) => e.event_type === 'application_submitted').length,
  }

  return (
    <DashboardShell
      title="Neural Stream"
      description="Live platform activity and neural event telemetry."
      roleLabel="Architect Console"
      userEmail={user.email ?? 'Unknown email'}
      wide
      navItems={ADMIN_NAV_ITEMS}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Total Pings</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{total}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">LIFETIME_EVENT_COUNT</p>
            </div>
            <Activity className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>

        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Active Week</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{last7}</h3>
              <p className="text-[10px] text-cyber-violet mt-1">LAST_7_DAYS_ACTIVITY</p>
            </div>
            <Zap className="w-4 h-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Engagement</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{byType.whatsapp_click + byType.call_click}</h3>
              <p className="text-[10px] text-cyber-green mt-1">TOUCHPOINT_CLICKS</p>
            </div>
            <Fingerprint className="w-4 h-4 text-cyber-green" />
          </div>
        </CyberCard>

        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Conversions</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{byType.application_submitted}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">APPS_SUBMITTED</p>
            </div>
            <Globe className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>
      </section>

      <div className="grid gap-6 lg:grid-cols-4 mb-8">
        {[
          { label: 'Neural Profile Views', val: byType.profile_view, color: 'text-white', icon: BarChart3 },
          { label: 'Comm Link Clicks', val: byType.whatsapp_click, color: 'text-emerald-400', icon: MessageSquare },
          { label: 'Direct Dial Clicks', val: byType.call_click, color: 'text-amber-400', icon: Zap },
          { label: 'Application Nodes', val: byType.application_submitted, color: 'text-cyan-400', icon: Fingerprint },
        ].map((stat) => (
          <CyberCard key={stat.label} className="p-4 bg-white/2 border-white/5">
            <div className="flex items-center gap-3">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <p className={cn("font-orbitron text-lg font-bold", stat.color)}>{stat.val}</p>
              </div>
            </div>
          </CyberCard>
        ))}
      </div>

      <CyberCard className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/2">
          <h2 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase text-cyber-cyan">Neural Stream Log</h2>
        </div>
        <div className="h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-cyan/30 scrollbar-track-transparent">
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
                    <TableCell className="text-slate-400 p-4 text-xs font-mono">{formatDateTime(event.created_at)}</TableCell>
                    <TableCell className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        event.event_type === 'application_submitted' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                        event.event_type === 'whatsapp_click' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-white/5 text-slate-300 border border-white/10"
                      )}>
                        {event.event_type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-500 p-4">{event.ecd_id.slice(0,12)}...</TableCell>
                    <TableCell className="p-4">
                      <pre className="text-[10px] text-slate-500 max-w-[400px] truncate">{JSON.stringify(event.metadata)}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CyberCard>
    </DashboardShell>
  )
}
