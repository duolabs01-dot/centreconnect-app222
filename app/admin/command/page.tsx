import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { KpiCard } from '@/components/cc-admin/KpiCard'
import { Building2, Users, Activity, TrendingUp, Cpu, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Control Tower | CC Command',
  description: 'Premium operations console for onboarding, verification, and neural telemetry.',
}

type ProvinceScore = {
  id: string
  shortLabel: string
  score: number
  centres: number
  row: number
  col: number
}

const NeuralMap = dynamic(
  () => import('@/components/cc-admin/NeuralMap').then((mod) => mod.NeuralMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-md bg-white/5 animate-pulse" />,
  }
)

const MeshAreaChart = dynamic(
  () => import('@/components/cc-admin/MeshAreaChart').then((mod) => mod.MeshAreaChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-md bg-white/5 animate-pulse" />,
  }
)

const HexHeatmap = dynamic(
  () => import('@/components/cc-admin/HexHeatmap').then((mod) => mod.HexHeatmap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-md bg-white/5 animate-pulse" />,
  }
)

const LiveSessionsCounter = dynamic(
  () => import('@/components/cc-admin/LiveSessionsCounter').then((mod) => mod.LiveSessionsCounter),
  {
    ssr: false,
    loading: () => <div className="mx-auto h-12 w-36 rounded-md bg-white/5 animate-pulse" />,
  }
)

const SystemStatus = dynamic(
  () => import('@/components/cc-admin/SystemStatus').then((mod) => mod.SystemStatus),
  {
    ssr: false,
    loading: () => <div className="h-24 w-full rounded-md bg-white/5 animate-pulse" />,
  }
)

function ConfigurationError() {
  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
      <div className="text-center">
        <p className="font-orbitron text-cyber-cyan text-sm uppercase tracking-widest mb-2">
          Configuration Error
        </p>
        <p className="text-slate-400 text-xs">
          SUPABASE_SERVICE_ROLE_KEY is not configured in this environment.
        </p>
      </div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('Failed to load authenticated user for /admin/command.', userError)
  }
  if (!user) redirect('/login')

  let admin: any = null
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('Admin client initialization failed in /admin/command.', error)
    return <ConfigurationError />
  }

  let role: string | null = null
  try {
    const { data, error } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    role = data?.role ?? null
  } catch (error) {
    console.error('Role lookup failed in /admin/command.', { userId: user.id, error })
  }

  if (role !== 'platform_admin') {
    console.warn('Admin role check failed in /admin/command.', {
      userId: user.id,
      role,
    })
    redirect('/login')
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let activeCentreCount = 0
  let mrrValue = 0
  let revenueGrowth = '0.0'
  let totalParentCount = 0
  const regionalData: ProvinceScore[] = [
    { id: 'lp', shortLabel: 'LP', score: 62, centres: 34, row: 0, col: 1 },
    { id: 'mp', shortLabel: 'MP', score: 58, centres: 28, row: 0, col: 2 },
    { id: 'nw', shortLabel: 'NW', score: 54, centres: 22, row: 1, col: 0 },
    { id: 'gp', shortLabel: 'GP', score: 88, centres: 142, row: 1, col: 1 },
    { id: 'kzn', shortLabel: 'KZN', score: 74, centres: 89, row: 1, col: 2 },
    { id: 'fs', shortLabel: 'FS', score: 61, centres: 31, row: 2, col: 0 },
    { id: 'nc', shortLabel: 'NC', score: 45, centres: 14, row: 2, col: 1 },
    { id: 'ec', shortLabel: 'EC', score: 56, centres: 47, row: 2, col: 2 },
    { id: 'wc', shortLabel: 'WC', score: 82, centres: 98, row: 3, col: 0 },
  ]

  try {
    const activeStatuses = ['active', 'trial', 'past_due']
    const [
      activeCentresResult,
      activeSubscriptionsCountResult,
      newActiveSubscriptionsCountResult,
      activeSubscriptionsMrrResult,
      childrenCountResult,
    ] = await Promise.all([
      admin
        .from('ecd_centres')
        .select('id', { count: 'planned', head: true })
        .eq('is_active', true),
      admin
        .from('subscriptions')
        .select('id', { count: 'planned', head: true })
        .in('status', activeStatuses),
      admin
        .from('subscriptions')
        .select('id', { count: 'planned', head: true })
        .in('status', activeStatuses)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      admin
        .from('subscriptions')
        .select('monthly_price')
        .in('status', activeStatuses)
        .limit(5000),
      admin.from('children').select('id', { count: 'planned', head: true }),
    ])

    if (activeCentresResult.error) throw activeCentresResult.error
    if (activeSubscriptionsCountResult.error) throw activeSubscriptionsCountResult.error
    if (newActiveSubscriptionsCountResult.error) throw newActiveSubscriptionsCountResult.error
    if (activeSubscriptionsMrrResult.error) throw activeSubscriptionsMrrResult.error
    if (childrenCountResult.error) throw childrenCountResult.error

    const activeSubsCount = activeSubscriptionsCountResult.count ?? 0
    const newSubsCount = newActiveSubscriptionsCountResult.count ?? 0

    mrrValue = (activeSubscriptionsMrrResult.data ?? []).reduce(
      (sum: number, sub: any) => sum + (Number(sub.monthly_price) || 0),
      0
    )
    revenueGrowth = activeSubsCount > 0 ? ((newSubsCount / activeSubsCount) * 100).toFixed(1) : '0.0'
    activeCentreCount = activeCentresResult.count ?? 0
    totalParentCount = childrenCountResult.count ?? 0
  } catch (error) {
    console.error('Error fetching admin dashboard data, using defaults:', error)
  }

  const mrrFormatted = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(mrrValue)

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
                <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-cyan font-semibold">
                  Neural Activity Map
                </p>
                <p className="font-inter text-xs mt-1 text-slate-400">
                  Cross-platform centre engagement protocols
                </p>
              </div>
              <Globe className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="h-[320px]">
              <NeuralMap />
            </div>
          </CyberCard>

          <CyberCard accent="violet" glow className="p-6 flex flex-col justify-between min-h-[200px]">
            <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-violet font-semibold">
              Live Sessions
            </p>
            <div className="text-center py-4">
              <LiveSessionsCounter initialCount={1284} />
              <p className="font-inter text-[10px] mt-3 text-slate-500 uppercase tracking-widest">
                concurrent entities
              </p>
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
            <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-cyan font-semibold mb-4">
              Core Status
            </p>
            <SystemStatus />
          </CyberCard>

          <CyberCard accent="cyan" className="p-6 lg:col-span-2 min-h-[260px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-cyan font-semibold">
                  Load vs Learners
                </p>
                <p className="font-inter text-xs mt-1 text-slate-400">
                  Daily system stress-test telemetry
                </p>
              </div>
              <Activity className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="h-40">
              <MeshAreaChart />
            </div>
          </CyberCard>

          <CyberCard accent="violet" glow className="p-6 lg:col-span-3 min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-cyber-violet font-semibold">
                  Curriculum Mastery
                </p>
                <p className="font-inter text-xs mt-1 text-slate-400">
                  Regional developmental metrics - Neural platform rollup
                </p>
              </div>
              <Globe className="w-4 h-4 text-cyber-violet" />
            </div>
            <div className="h-full">
              <HexHeatmap data={regionalData} />
            </div>
          </CyberCard>
        </div>
      </div>
    </DashboardShell>
  )
}
