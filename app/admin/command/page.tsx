import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'
import { CyberCard }      from '@/components/cc-admin/CyberCard'
import { KpiCard }        from '@/components/cc-admin/KpiCard'
import { NeuralMap }      from '@/components/cc-admin/NeuralMap'
import { MeshAreaChart }  from '@/components/cc-admin/MeshAreaChart'
import { HexHeatmap, type ProvinceScore } from '@/components/cc-admin/HexHeatmap'
import { LiveSessionsCounter } from '@/components/cc-admin/LiveSessionsCounter'
import { SystemStatus } from '@/components/cc-admin/SystemStatus'
import {
  Building2, Users, Activity,
  TrendingUp, Cpu, Globe,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Control Tower | CC Command',
  description: 'Premium operations console for onboarding, verification, and neural telemetry.',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProfile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (userProfile?.role !== 'platform_admin') redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let activeCentreCount = 0
  let mrrFormatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(0)
  let revenueGrowth = '0.0'
  let totalParentCount = 0
  let regionalData: ProvinceScore[] = []

  try {
    // Fetch Data
    const [
      centresResult,
      subscriptionsResult,
      childrenResult,
    ] = await Promise.all([
      admin.from('ecd_centres').select('id,is_active,created_at'),
      admin.from('subscriptions').select('id,monthly_price,status,created_at'),
      admin.from('children').select('id'),
    ])

    // Calculations
    const activeSubs = (subscriptionsResult.data ?? []).filter(s => ['active', 'trial', 'past_due'].includes(s.status))
    const mrrValue = activeSubs.reduce((sum, sub) => sum + (Number(sub.monthly_price) || 0), 0)
    mrrFormatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(mrrValue)
    const newSubsThisMonth = activeSubs.filter(s => new Date(s.created_at) >= thirtyDaysAgo)
    revenueGrowth = ((newSubsThisMonth.length / (activeSubs.length || 1)) * 100).toFixed(1)
    activeCentreCount = centresResult.data?.filter(c => c.is_active).length ?? 0
    totalParentCount = new Set((childrenResult.data ?? []).map(c => c.id)).size

    // Regional Mastery Mock (Ready for real developmental_milestones join)
    regionalData = [
      { id: 'lp',  shortLabel: 'LP', score: 62, centres: 34,  row: 0, col: 1 },
      { id: 'mp',  shortLabel: 'MP', score: 58, centres: 28,  row: 0, col: 2 },
      { id: 'nw',  shortLabel: 'NW', score: 54, centres: 22,  row: 1, col: 0 },
      { id: 'gp',  shortLabel: 'GP', score: 88, centres: 142, row: 1, col: 1 },
      { id: 'kzn', shortLabel: 'KZN',score: 74, centres: 89,  row: 1, col: 2 },
      { id: 'fs',  shortLabel: 'FS', score: 61, centres: 31,  row: 2, col: 0 },
      { id: 'nc',  shortLabel: 'NC', score: 45, centres: 14,  row: 2, col: 1 },
      { id: 'ec',  shortLabel: 'EC', score: 56, centres: 47,  row: 2, col: 2 },
      { id: 'wc',  shortLabel: 'WC', score: 82, centres: 98,  row: 3, col: 0 },
    ]
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    // Optionally, set default/empty values or show a user-friendly error message
    // For now, variables are initialized with defaults, so rendering will proceed with those.
  }

  return (
    <DashboardShell
      title="Control Tower"
      description="System protocols and neural platform activity."
      roleLabel="Architect Console"
      userEmail={user.email ?? 'Unknown'}
      wide
      navItems={ADMIN_NAV_ITEMS}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Tenants"
            value={activeCentreCount}
            subValue="ECD Centres"
            trend={12}
            trendLabel="vs last month"
            icon={Building2}
            accent="cyan"
            index={0}
          />
          <KpiCard
            label="Platform MRR"
            value={mrrFormatted}
            subValue="Monthly Recurring"
            trend={Number(revenueGrowth)}
            trendLabel="Projected growth"
            icon={TrendingUp}
            accent="violet"
            index={1}
          />
          <KpiCard
            label="Active Operatives"
            value={totalParentCount.toLocaleString()}
            subValue="Platform Users"
            trend={23}
            trendLabel="vs last month"
            icon={Users}
            accent="cyan"
            index={2}
          />
          <KpiCard
            label="System Uptime"
            value="99.98%"
            subValue="Last 30 days"
            trend={0}
            trendLabel="STABLE"
            icon={Cpu}
            accent="violet"
            index={3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-auto">
          <CyberCard accent="cyan" scanLine glow className="p-5 lg:col-span-2 lg:row-span-2 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-cyan font-semibold">Neural Activity Map</p>
                <p className="font-inter text-xs mt-1 text-slate-400">Cross-platform centre engagement protocols</p>
              </div>
              <Globe className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="h-[320px]"><NeuralMap /></div>
          </CyberCard>

          <CyberCard accent="violet" glow className="p-6 flex flex-col justify-between min-h-[200px]">
            <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-violet font-semibold">Live Sessions</p>
            <div className="text-center py-4">
              <LiveSessionsCounter initialCount={1284} />
              <p className="font-inter text-[10px] mt-3 text-slate-500 uppercase tracking-widest">concurrent entities</p>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-4">
              {[
                { label: 'Parents', val: '834' },
                { label: 'Staff', val: '312' },
                { label: 'Admins', val: '138' },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="font-orbitron text-xs font-bold text-cyber-violet">{val}</p>
                  <p className="text-[8px] text-slate-500 uppercase tracking-tighter">{label}</p>
                </div>
              ))}
            </div>
          </CyberCard>

          <CyberCard accent="cyan" className="p-6 min-h-[200px]">
            <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-cyan font-semibold mb-4">Core Status</p>
            <SystemStatus />
          </CyberCard>

          <CyberCard accent="cyan" className="p-6 lg:col-span-2 min-h-[260px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-cyan font-semibold">Load vs Learners</p>
                <p className="font-inter text-xs mt-1 text-slate-400">Daily system stress-test telemetry</p>
              </div>
              <Activity className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="h-40"><MeshAreaChart /></div>
          </CyberCard>

          <CyberCard accent="violet" glow className="p-6 lg:col-span-3 min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-violet font-semibold">Curriculum Mastery</p>
                <p className="font-inter text-xs mt-1 text-slate-400">Regional developmental metrics · Neural platform rollup</p>
              </div>
              <Globe className="w-4 h-4 text-cyber-violet" />
            </div>
            <div className="h-full"><HexHeatmap data={regionalData} /></div>
          </CyberCard>
        </div>
      </div>
    </DashboardShell>
  )
}
