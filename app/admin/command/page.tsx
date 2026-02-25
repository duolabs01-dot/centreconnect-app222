import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { KpiCard } from '@/components/cc-admin/KpiCard'
import { NeuralMap } from '@/components/cc-admin/NeuralMap'
import { LiveSessionsCounter } from '@/components/cc-admin/LiveSessionsCounter'
import { SystemHealthWidget } from '@/components/cc-admin/SystemHealthWidget'
import { MeshAreaChart } from '@/components/cc-admin/MeshAreaChart'
import { HexHeatmap, type ProvinceScore } from '@/components/cc-admin/HexHeatmap'
import { Building2, Users, Activity, TrendingUp, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Control Tower | CC Command',
  description: 'Premium operations console for onboarding, verification, and neural telemetry.',
}

const SA_PROVINCES: ProvinceScore[] = [
  { id: 'lp', shortLabel: 'LP', row: 0, col: 1, score: 0, centres: 0 },
  { id: 'mp', shortLabel: 'MP', row: 0, col: 2, score: 0, centres: 0 },
  { id: 'nw', shortLabel: 'NW', row: 1, col: 0, score: 0, centres: 0 },
  { id: 'gp', shortLabel: 'GP', row: 1, col: 1, score: 0, centres: 0 },
  { id: 'kzn', shortLabel: 'KZN', row: 1, col: 2, score: 0, centres: 0 },
  { id: 'fs', shortLabel: 'FS', row: 2, col: 0, score: 0, centres: 0 },
  { id: 'nc', shortLabel: 'NC', row: 2, col: 1, score: 0, centres: 0 },
  { id: 'ec', shortLabel: 'EC', row: 2, col: 2, score: 0, centres: 0 },
  { id: 'wc', shortLabel: 'WC', row: 3, col: 0, score: 0, centres: 0 },
]

const PROVINCE_NORMALIZED_TO_CODE: Record<string, ProvinceScore['shortLabel']> = {
  LP: 'LP',
  LIMPOPO: 'LP',
  MP: 'MP',
  MPUMALANGA: 'MP',
  NW: 'NW',
  NORTHWEST: 'NW',
  NORTH_WEST: 'NW',
  NORTH-WEST: 'NW',
  GP: 'GP',
  GAUTENG: 'GP',
  KZN: 'KZN',
  KWAZULUNATAL: 'KZN',
  KWAZULU_NATAL: 'KZN',
  KWAZULU-NATAL: 'KZN',
  FS: 'FS',
  FREESTATE: 'FS',
  FREE_STATE: 'FS',
  FREE-STATE: 'FS',
  NC: 'NC',
  NORTHERNCAPE: 'NC',
  NORTHERN_CAPE: 'NC',
  NORTHERN-CAPE: 'NC',
  EC: 'EC',
  EASTERNCAPE: 'EC',
  EASTERN_CAPE: 'EC',
  EASTERN-CAPE: 'EC',
  WC: 'WC',
  WESTERNCAPE: 'WC',
  WESTERN_CAPE: 'WC',
  WESTERN-CAPE: 'WC',
}

function normalizeProvinceToCode(value: string | null): ProvinceScore['shortLabel'] | null {
  if (!value) return null
  const normalized = value.toUpperCase().replace(/\./g, '').replace(/\s+/g, '_').trim()
  return PROVINCE_NORMALIZED_TO_CODE[normalized] ?? PROVINCE_NORMALIZED_TO_CODE[normalized.replace(/_/g, '')] ?? null
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

  const admin = createAdminClient()
  try {
    const { data: userProfile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()

    if (userProfile?.role !== 'platform_admin') {
      console.error('Role mismatch - userId:', user.id, 'role:', userProfile?.role)
      redirect('/login')
    }
  } catch (err) {
    console.error('Admin command page error:', err)
    redirect('/login')
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let activeCentreCount = 0
  let mrrValue = 0
  let revenueGrowth = '0.0'
  let pendingApplicationCount = 0
  let totalAdmins = 0
  let totalParents = 0
  let totalStaff = 0
  let realRegionalData: ProvinceScore[] = SA_PROVINCES.map((province) => ({
    id: province.id,
    shortLabel: province.shortLabel,
    row: province.row,
    col: province.col,
    score: 0,
    centres: 0,
  }))

  try {
    const activeStatuses = ['active', 'trial', 'past_due']
    const [
      activeCentresResult,
      activeSubscriptionsCountResult,
      newActiveSubscriptionsCountResult,
      activeSubscriptionsMrrResult,
      pendingApplicationsCountResult,
      centresWithProvinceResult,
      totalAdminUsersResult,
      totalParentUsersResult,
      totalStaffUsersResult,
    ] = await Promise.all([
      admin.from('ecd_centres').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', activeStatuses),
      admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .in('status', activeStatuses)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      admin.from('subscriptions').select('monthly_price').in('status', activeStatuses).limit(5000),
      admin.from('applications').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'in_review']),
      admin.from('ecd_centres').select('province').not('province', 'is', null).limit(2000),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'ecd_admin'),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent_user'),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).in('role', ['ecd_staff', 'ecd_supervisor']),
    ])

    if (activeCentresResult.error) throw activeCentresResult.error
    if (activeSubscriptionsCountResult.error) throw activeSubscriptionsCountResult.error
    if (newActiveSubscriptionsCountResult.error) throw newActiveSubscriptionsCountResult.error
    if (activeSubscriptionsMrrResult.error) throw activeSubscriptionsMrrResult.error
    if (pendingApplicationsCountResult.error) throw pendingApplicationsCountResult.error
    if (centresWithProvinceResult.error) throw centresWithProvinceResult.error
    if (totalAdminUsersResult.error) throw totalAdminUsersResult.error
    if (totalParentUsersResult.error) throw totalParentUsersResult.error
    if (totalStaffUsersResult.error) throw totalStaffUsersResult.error

    const activeSubsCount = activeSubscriptionsCountResult.count ?? 0
    const newSubsCount = newActiveSubscriptionsCountResult.count ?? 0

    mrrValue = (activeSubscriptionsMrrResult.data ?? []).reduce(
      (sum, subscription) => sum + (Number(subscription.monthly_price) || 0),
      0
    )
    revenueGrowth = activeSubsCount > 0 ? ((newSubsCount / activeSubsCount) * 100).toFixed(1) : '0.0'

    activeCentreCount = activeCentresResult.count ?? 0
    pendingApplicationCount = pendingApplicationsCountResult.count ?? 0
    totalAdmins = totalAdminUsersResult.count ?? 0
    totalParents = totalParentUsersResult.count ?? 0
    totalStaff = totalStaffUsersResult.count ?? 0

    const centresWithProvince = centresWithProvinceResult.data ?? []
    const provinceCounts: Record<ProvinceScore['shortLabel'], number> = {
      LP: 0,
      MP: 0,
      NW: 0,
      GP: 0,
      KZN: 0,
      FS: 0,
      NC: 0,
      EC: 0,
      WC: 0,
    }

    for (const centre of centresWithProvince) {
      const code = normalizeProvinceToCode(centre.province)
      if (!code) continue
      provinceCounts[code] = (provinceCounts[code] ?? 0) + 1
    }

    const maxCentres = Math.max(...SA_PROVINCES.map((province) => provinceCounts[province.shortLabel] ?? 0), 1)

    realRegionalData = SA_PROVINCES.map((province) => ({
      id: province.id,
      shortLabel: province.shortLabel,
      row: province.row,
      col: province.col,
      centres: provinceCounts[province.shortLabel] ?? 0,
      score: Math.round(((provinceCounts[province.shortLabel] ?? 0) / maxCentres) * 100),
    }))
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            value={(totalAdmins + totalParents).toLocaleString()}
            subValue="Admins + Parents registered"
            trend={0}
            trendLabel="users in system"
            icon={Users}
            accent="cyan"
            index={2}
          />
          <KpiCard
            label="Pending Applications"
            value={pendingApplicationCount.toLocaleString()}
            subValue="Submitted + In Review"
            trend={0}
            trendLabel="Live queue"
            icon={Activity}
            accent="violet"
            index={3}
          />
        </div>

        <div className="grid auto-rows-auto grid-cols-1 gap-6 lg:grid-cols-3">
          <CyberCard accent="cyan" scanLine glow className="min-h-[400px] p-5 lg:col-span-2 lg:row-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-orbitron text-[9px] font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
                  Neural Activity Map
                </p>
                <p className="mt-1 font-inter text-xs text-slate-400">Cross-platform centre engagement protocols</p>
              </div>
              <Globe className="h-4 w-4 text-cyber-cyan" />
            </div>
            <div className="h-[320px]">
              <NeuralMap />
            </div>
          </CyberCard>

          <CyberCard accent="violet" glow className="flex min-h-[200px] flex-col justify-between p-6">
            <p className="font-orbitron text-[9px] font-semibold uppercase tracking-[0.25em] text-cyber-violet">
              Live Sessions
            </p>
            <div className="py-4 text-center">
              <LiveSessionsCounter />
              <p className="mt-3 font-inter text-[10px] uppercase tracking-widest text-slate-500">concurrent entities</p>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-4">
              {[
                { label: 'Parents', val: totalParents.toLocaleString() },
                { label: 'Staff', val: totalStaff.toLocaleString() },
                { label: 'Admins', val: totalAdmins.toLocaleString() },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="font-orbitron text-xs font-bold text-cyber-violet">{val}</p>
                  <p className="text-[8px] uppercase tracking-tighter text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </CyberCard>

          <CyberCard accent="cyan" className="min-h-[200px] p-6">
            <p className="mb-4 font-orbitron text-[9px] font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
              Core Status
            </p>
            <SystemHealthWidget />
          </CyberCard>

          <CyberCard accent="cyan" className="min-h-[260px] p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-orbitron text-[9px] font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
                  Load vs Learners
                </p>
                <p className="mt-1 font-inter text-xs text-slate-400">Daily system stress-test telemetry</p>
              </div>
              <Activity className="h-4 w-4 text-cyber-cyan" />
            </div>
            <div className="h-40">
              <MeshAreaChart />
            </div>
          </CyberCard>

          <CyberCard accent="violet" glow className="min-h-[300px] p-6 lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-orbitron text-[9px] font-semibold uppercase tracking-[0.25em] text-cyber-violet">
                  Curriculum Mastery
                </p>
                <p className="mt-1 font-inter text-xs text-slate-400">
                  Regional developmental metrics - Neural platform rollup
                </p>
              </div>
              <Globe className="h-4 w-4 text-cyber-violet" />
            </div>
            <div className="h-full">
              <HexHeatmap data={realRegionalData} />
            </div>
          </CyberCard>
        </div>
      </div>
    </DashboardShell>
  )
}
