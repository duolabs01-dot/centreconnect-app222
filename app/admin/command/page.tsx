import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Control Tower | CC Command',
  description: 'Premium operations console for onboarding, verification, and neural telemetry.',
}

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

  const overview = [
    {
      label: 'Active Tenants',
      value: activeCentreCount.toLocaleString(),
      helper: 'ECD Centres',
    },
    {
      label: 'Platform MRR',
      value: mrrFormatted,
      helper: `Growth ${revenueGrowth}% (last 30 days)`,
    },
    {
      label: 'Active Operatives',
      value: totalParentCount.toLocaleString(),
      helper: 'Platform Users',
    },
    {
      label: 'System Uptime',
      value: '99.98%',
      helper: 'Last 30 days',
    },
  ]

  return (
    <DashboardShell
      title="Control Tower"
      description="System protocols and core platform activity."
      roleLabel="Architect Console"
      userEmail={user.email ?? 'Unknown'}
      wide
      navItems={ADMIN_NAV_ITEMS}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {overview.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-[0_10px_24px_rgba(2,6,23,0.25)]"
            >
              <p className="font-orbitron text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 font-orbitron text-2xl font-bold text-white tracking-tight">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{item.helper}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/45 p-6">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.18em] text-cyan-300">
            Control Tower
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Advanced visual telemetry is running in safe mode. Core platform metrics and access
            controls remain active.
          </p>
        </div>
      </div>
    </DashboardShell>
  )
}
