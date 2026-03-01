import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { TenantsIndexTable, type TenantRow } from '@/components/admin/tenants-index-table'
import { cn } from '@/lib/utils'
import { Building2, AlertCircle, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tenants | CC Control Tower',
  description: 'Cross-tenant operational index for tenant health and package control.',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function AdminTenantsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    centresResult,
    adminsResult,
    attendanceResult,
    invoicesResult,
    applicationsResult,
    supportTicketsResult,
  ] = await Promise.all([
    admin
      .from('ecd_centres')
      .select(
        'id,slug,name,city,suburb,is_active,is_registered,created_at,ecd_admins(count),subscriptions(tier,status,monthly_price,current_period_end)'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('ecd_admins')
      .select('ecd_id, user_id, user_profiles!inner(id, role)')
      .limit(1000), 
    admin
      .from('attendance')
      .select('ecd_id, date')
      .gte('date', sevenDaysAgo.toISOString())
      .limit(5000), 
    admin
      .from('invoices')
      .select('ecd_id, status')
      .or('status.eq.overdue,status.eq.failed')
      .limit(1000), 
    admin
      .from('applications')
      .select('ecd_id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(5000), 
    admin
      .from('support_tickets')
      .select('ecd_id, status')
      .eq('status', 'open')
      .limit(1000), 
  ])

  const { data: authUsers } = await admin.auth.admin.listUsers()
  const userMap = new Map(authUsers.users.map(u => [u.id, u.last_sign_in_at]))

  const rawTenants = (centresResult.data ?? []).map((row: any) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    city: row.city as string,
    suburb: row.suburb as string,
    is_active: Boolean(row.is_active),
    is_registered: Boolean(row.is_registered),
    created_at: row.created_at as string,
    admin_count: Number(normalizeOne(row.ecd_admins)?.count ?? 0),
    subscription: normalizeOne(row.subscriptions)
      ? {
          tier: (normalizeOne(row.subscriptions) as any).tier as string,
          status: (normalizeOne(row.subscriptions) as any).status as string,
          monthly_price: Number((normalizeOne(row.subscriptions) as any).monthly_price ?? 0),
          current_period_end: (normalizeOne(row.subscriptions) as any).current_period_end as string | null,
        }
      : null,
  }))

  const tenants: TenantRow[] = rawTenants.map(tenant => {
    const tenantAdmins = (adminsResult.data ?? []).filter(admin => admin.ecd_id === tenant.id)
    let lastLogin: string | null = null
    tenantAdmins.forEach(admin => {
      const login = userMap.get(admin.user_id)
      if (login && (!lastLogin || new Date(login) > new Date(lastLogin))) {
        lastLogin = login
      }
    })

    const attendanceCount = (attendanceResult.data ?? []).filter(a => a.ecd_id === tenant.id).length
    const appCount = (applicationsResult.data ?? []).filter(a => a.ecd_id === tenant.id).length
    const openTickets = (supportTicketsResult.data ?? []).filter(t => t.ecd_id === tenant.id).length
    const problematicInvoices = (invoicesResult.data ?? []).filter(i => i.ecd_id === tenant.id)

    let paymentStatus: TenantRow['payment_status'] = 'paid'
    if (problematicInvoices.some(i => i.status === 'failed')) paymentStatus = 'failed'
    else if (problematicInvoices.some(i => i.status === 'overdue')) paymentStatus = 'overdue'
    else if (tenant.subscription?.status === 'past_due') paymentStatus = 'overdue' 

    let health_score: TenantRow['health_score'] = 'green'
    if (paymentStatus === 'failed' || openTickets > 2 || !tenant.is_active) health_score = 'red'
    else if (paymentStatus === 'overdue' || !lastLogin || (new Date().getTime() - new Date(lastLogin).getTime() > 14 * 86400000) || (attendanceCount === 0 && tenant.is_active)) health_score = 'amber'

    return {
      ...tenant,
      last_login_at: lastLogin,
      attendance_recorded: attendanceCount,
      applications_received: appCount,
      payment_status: paymentStatus,
      support_tickets_open: openTickets,
      health_score: health_score,
    }
  })

  const payingCount = tenants.filter((tenant) => tenant.subscription?.status === 'active').length
  const nonPayingCount = tenants.length - payingCount
  const noPlanCount = tenants.filter((tenant) => !tenant.subscription).length

  return (
    <AdminPageLayout
      title="Centres"
      description="Operational telemetry for every tenant workspace."
      roleLabel="Architect Console"
      wide
    >
      <section className="grid gap-4 md:grid-cols-3 mb-8">
        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Paying Entities</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{payingCount}</h3>
              <p className="text-[10px] text-cyber-green mt-1">SUBSCRIPTION_ACTIVE</p>
            </div>
            <Zap className="w-4 h-4 text-cyber-green" />
          </div>
        </CyberCard>
        
        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Non-Paying</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{nonPayingCount}</h3>
              <p className="text-[10px] text-slate-500 mt-1">TRIAL_OR_EXPIRED</p>
            </div>
            <AlertCircle className="w-4 h-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Pipeline Ready</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{noPlanCount}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">READY_TO_CONVERT</p>
            </div>
            <Building2 className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>
      </section>

      <CyberCard className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/2">
          <h2 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase">Global Registry ({tenants.length})</h2>
        </div>
        <div className="bg-slate-950/40 p-6">
          <TenantsIndexTable tenants={tenants} />
        </div>
      </CyberCard>
    </AdminPageLayout>
  )
}
