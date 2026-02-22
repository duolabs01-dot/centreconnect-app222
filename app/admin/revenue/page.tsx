import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Button } from '@/components/cc-admin/Button'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, CreditCard, DollarSign, Clock, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Revenue | CC Control Tower',
  description: 'Financial performance, subscription health, and payment telemetry.',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function AdminRevenuePage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [subscriptionsResult, invoicesResult, centresResult] = await Promise.all([
    admin.from('subscriptions').select('*, ecd_centres(name)').order('created_at', { ascending: false }),
    admin
      .from('invoices')
      .select('*, ecd_centres(name)')
      .gte('issued_at', thirtyDaysAgo.toISOString())
      .order('issued_at', { ascending: false }),
    admin.from('ecd_centres').select('id, name'),
  ])

  const subscriptions = subscriptionsResult.data ?? []
  const invoices = invoicesResult.data ?? []
  
  const activeSubs = subscriptions.filter((s) => s.status === 'active')
  const mrr = activeSubs.reduce((sum, s) => sum + Number(s.monthly_price || 0), 0)
  
  const churnedThisMonth = subscriptions.filter(
    (s) => s.status === 'canceled' && s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo
  )
  const churnedRevenue = churnedThisMonth.reduce((sum, s) => sum + Number(s.monthly_price || 0), 0)

  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue')
  const pendingRevenue = pendingInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0)

  const failedInvoices = invoices.filter((i) => i.status === 'failed')
  const failedRevenue = failedInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0)

  return (
    <DashboardShell
      title="Revenue"
      description="Real-time financial protocols and subscription telemetry."
      roleLabel="Architect Console"
      userEmail={user.email ?? 'Unknown email'}
      wide
      navItems={ADMIN_NAV_ITEMS}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Platform MRR</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{formatCurrency(mrr)}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">MONTHLY_RECURRING</p>
            </div>
            <TrendingUp className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>

        <CyberCard accent="rose" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Revenue Leakage</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{formatCurrency(churnedRevenue + failedRevenue)}</h3>
              <p className="text-[10px] text-cyber-rose mt-1">CHURN_AND_FAILURES</p>
            </div>
            <TrendingDown className="w-4 h-4 text-cyber-rose" />
          </div>
        </CyberCard>

        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Accounts Receivable</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{formatCurrency(pendingRevenue)}</h3>
              <p className="text-[10px] text-cyber-violet mt-1">PENDING_COLLECTION</p>
            </div>
            <Clock className="w-4 h-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Active Plans</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{activeSubs.length}</h3>
              <p className="text-[10px] text-cyber-green mt-1">VERIFIED_TENANTS</p>
            </div>
            <CreditCard className="w-4 h-4 text-cyber-green" />
          </div>
        </CyberCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CyberCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <h2 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase text-cyber-cyan">Recent Transactions</h2>
          </div>
          <div className="bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Tenant</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Amount</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.slice(0, 10).map((inv) => (
                  <TableRow key={inv.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white p-4">{(inv.ecd_centres as any)?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="text-slate-300 p-4">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        inv.status === 'paid' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                        inv.status === 'failed' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}>
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-400 p-4 text-xs">{formatDateTime(inv.issued_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CyberCard>

        <CyberCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/2">
            <h2 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase text-cyber-violet">Subscription Log</h2>
          </div>
          <div className="bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Tenant</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Tier</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">MRR</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.slice(0, 10).map((sub) => (
                  <TableRow key={sub.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white p-4">{(sub.ecd_centres as any)?.name ?? 'Unknown'}</TableCell>
                    <TableCell className="uppercase text-cyber-cyan p-4 text-xs font-bold">{sub.tier}</TableCell>
                    <TableCell className="text-slate-300 p-4">{formatCurrency(sub.monthly_price)}</TableCell>
                    <TableCell className="p-4 text-xs text-slate-400 capitalize">{sub.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CyberCard>
      </div>
    </DashboardShell>
  )
}
