import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { AdminStatCard } from '@/components/ui/admin-stat-card'
import { NeuralMap } from '@/components/cc-admin/NeuralMap'
import { LiveSessionsCounter } from '@/components/cc-admin/LiveSessionsCounter'
import { SystemHealthWidget } from '@/components/cc-admin/SystemHealthWidget'
import { HexHeatmap, type ProvinceScore } from '@/components/cc-admin/HexHeatmap'
import { Building2, Users, Activity, TrendingUp, Globe, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Operations | Platform Admin',
  description: 'Operations view for platform health, onboarding, and live centre issues.',
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
  LP: 'LP', LIMPOPO: 'LP', MP: 'MP', MPUMALANGA: 'MP', NW: 'NW', NORTHWEST: 'NW', NORTH_WEST: 'NW',
  GP: 'GP', GAUTENG: 'GP', KZN: 'KZN', KWAZULUNATAL: 'KZN', KWAZULU_NATAL: 'KZN', FS: 'FS',
  FREESTATE: 'FS', FREE_STATE: 'FS', NC: 'NC', NORTHERNCAPE: 'NC', NORTHERN_CAPE: 'NC',
  EC: 'EC', EASTERNCAPE: 'EC', EASTERN_CAPE: 'EC', WC: 'WC', WESTERNCAPE: 'WC', WESTERN_CAPE: 'WC',
}

function normalizeProvinceToCode(value: string | null): ProvinceScore['shortLabel'] | null {
  if (!value) return null
  const normalized = value.toUpperCase().replace(/\./g, '').replace(/[\s-]+/g, '_').trim()
  return PROVINCE_NORMALIZED_TO_CODE[normalized] ?? PROVINCE_NORMALIZED_TO_CODE[normalized.replace(/_/g, '')] ?? null
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: userProfile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (userProfile?.role !== 'platform_admin') redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let activeCentreCount = 0
  let mrrValue = 0
  let revenueGrowth = 0
  let pendingApplicationCount = 0
  let totalAdmins = 0
  let totalParents = 0
  let totalStaff = 0
  let realRegionalData: ProvinceScore[] = SA_PROVINCES.map(p => ({ ...p }))

  try {
    const activeStatuses = ['active', 'trial', 'past_due']
    const [centres, activeSubs, newSubs, mrrRows, pendingApps, centresProv, admins, parents, staff] = await Promise.all([
      admin.from('ecd_centres').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', activeStatuses),
      admin.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', activeStatuses).gte('created_at', thirtyDaysAgo.toISOString()),
      admin.from('subscriptions').select('monthly_price').in('status', activeStatuses),
      admin.from('applications').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'in_review']),
      admin.from('ecd_centres').select('province').eq('is_active', true).not('province', 'is', null),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'ecd_admin'),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent_user'),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).in('role', ['ecd_staff', 'ecd_supervisor']),
    ])

    activeCentreCount = centres.count ?? 0
    mrrValue = (mrrRows.data ?? []).reduce((s, row) => s + (Number(row.monthly_price) || 0), 0)
    revenueGrowth = activeSubs.count && activeSubs.count > 0 ? (newSubs.count ?? 0) / activeSubs.count * 100 : 0
    pendingApplicationCount = pendingApps.count ?? 0
    totalAdmins = admins.count ?? 0
    totalParents = parents.count ?? 0
    totalStaff = staff.count ?? 0

    const regionRows = centresProv.data ?? []
    const provinceCounts = regionRows.reduce<Record<string, number>>((acc, row) => {
      const p = normalizeProvinceToCode(row.province) || "Unknown"
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})

    const regionalData = Object.entries(provinceCounts).map(([province, count]) => ({
      province,
      count
    }))

    const max = Math.max(...SA_PROVINCES.map(p => provinceCounts[p.shortLabel] ?? 0), 1)
    realRegionalData = SA_PROVINCES.map(p => ({
      ...p,
      centres: provinceCounts[p.shortLabel] ?? 0,
      score: Math.round(((provinceCounts[p.shortLabel] ?? 0) / max) * 100)
    }))
  } catch (e) { console.error(e) }

  const mrrFormatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(mrrValue)

  return (
    <AdminPageLayout
      title="Operations"
      description="Live platform activity, centre health, and quick operational checks."
      roleLabel="Platform Admin"
      wide
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AdminStatCard label="Active Tenants" value={activeCentreCount} icon={<Building2 className="w-4 h-4" />} trend="up" change="12% vs last month" />
          <AdminStatCard label="Platform MRR" value={mrrFormatted} icon={<TrendingUp className="w-4 h-4" />} trend="up" change={`${revenueGrowth.toFixed(1)}% projection`} />
          <AdminStatCard label="Active Operatives" value={(totalAdmins + totalParents).toLocaleString()} icon={<Users className="w-4 h-4" />} />
          <AdminStatCard label="Pending Apps" value={pendingApplicationCount.toLocaleString()} icon={<Activity className="w-4 h-4" />} trend="neutral" change="Live queue" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 admin-card p-6 border-t-2 border-t-admin-accent">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-accent">Activity map</p>
                <p className="text-xs text-admin-text-muted mt-1">Recent centre activity across the platform</p>
              </div>
              <Globe className="w-5 h-5 text-admin-accent" />
            </div>
            <div className="h-[400px] bg-admin-bg rounded-xl border border-admin-border overflow-hidden">
              <NeuralMap />
            </div>
          </div>

          <div className="space-y-6">
            <div className="admin-card p-6 border-t-2 border-t-admin-warning">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-warning mb-4">Live sessions</p>
              <div className="py-6 text-center bg-admin-bg rounded-xl border border-admin-border mb-4">
                <LiveSessionsCounter />
                <p className="text-[9px] font-bold uppercase tracking-widest text-admin-text-muted mt-2">Signed-in users</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Parents', val: totalParents },
                  { label: 'Staff', val: totalStaff },
                  { label: 'Admins', val: totalAdmins },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-sm font-black text-admin-text">{item.val.toLocaleString()}</p>
                    <p className="text-[8px] font-bold uppercase text-admin-text-muted">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-text-muted mb-4">System status</p>
              <div className="bg-admin-bg p-4 rounded-xl border border-admin-border">
                <SystemHealthWidget />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 admin-card p-6 border-t-2 border-t-admin-accent">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-accent">Regional spread</p>
                <p className="text-xs text-admin-text-muted mt-1">Where your active centres are concentrated right now</p>
              </div>
              <Zap className="w-5 h-5 text-admin-accent" />
            </div>
            <div className="bg-admin-bg p-6 rounded-xl border border-admin-border">
              <HexHeatmap data={realRegionalData} />
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  )
}
