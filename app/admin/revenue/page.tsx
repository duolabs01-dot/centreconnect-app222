import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { RevenueOperations } from '@/components/admin/revenue-operations'
import { StaleWarningAckButton } from '@/components/admin/stale-warning-ack-button'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, CreditCard, Clock } from 'lucide-react'

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

function formatCounterAgeLabel(ageMinutes: number | null) {
  if (ageMinutes === null) return 'No recent counter source events'
  if (ageMinutes <= 1) return 'Under 1 minute old'
  if (ageMinutes < 60) return `${ageMinutes} minutes old`
  const hours = Math.floor(ageMinutes / 60)
  const remainingMinutes = ageMinutes % 60
  return `${hours}h ${remainingMinutes}m old`
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function incidentBadgeClass(level: 'healthy' | 'warning' | 'critical') {
  if (level === 'healthy') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  if (level === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-rose-500/30 bg-rose-500/10 text-rose-200'
}

function maxIncidentLevel(levels: Array<'healthy' | 'warning' | 'critical'>): 'healthy' | 'warning' | 'critical' {
  if (levels.includes('critical')) return 'critical'
  if (levels.includes('warning')) return 'warning'
  return 'healthy'
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
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const lagCutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const [subscriptionsResult, invoicesResult, webhookEventsResult, failedWebhookCountResult, laggedWebhookResult, alertActivityRowsResult] = await Promise.all([
    admin.from('subscriptions').select('*, ecd_centres(name,slug)').order('created_at', { ascending: false }),
    admin
      .from('invoices')
      .select('*, ecd_centres(name,slug)')
      .gte('issued_at', thirtyDaysAgo.toISOString())
      .order('issued_at', { ascending: false }),
    admin
      .from('payment_webhook_events')
      .select('id,provider,event_id,event_type,reference,invoice_id,status,error_message,processed_at,created_at,invoices(invoice_number)')
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('payment_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', twentyFourHoursAgo),
    admin
      .from('payment_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received')
      .lt('created_at', lagCutoffIso),
    admin
      .from('platform_admin_activity_log')
      .select('action,created_at')
      .in('action', ['alert_activity_log_write_failure', 'suppress_activity_log_write_failure'])
      .gte('created_at', twentyFourHoursAgo),
  ])

  const subscriptions = subscriptionsResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const webhookEvents = webhookEventsResult.data ?? []
  const failedWebhookCount24h = failedWebhookCountResult.count ?? 0
  const laggedWebhookCount = laggedWebhookResult.count ?? 0
  const sentAlertCount24h = (alertActivityRowsResult.data ?? []).filter((row) => row.action === 'alert_activity_log_write_failure').length
  const suppressedAlertCount24h = (alertActivityRowsResult.data ?? []).filter((row) => row.action === 'suppress_activity_log_write_failure').length
  const currentRefreshIso = new Date().toISOString()
  const latestWebhookCounterMs = webhookEvents.reduce<number | null>((max, row) => {
    const ts = Date.parse(String(row.created_at))
    if (Number.isNaN(ts)) return max
    if (max === null || ts > max) return ts
    return max
  }, null)
  const latestAlertCounterMs = (alertActivityRowsResult.data ?? []).reduce<number | null>((max, row) => {
    const ts = Date.parse(String((row as { created_at?: string }).created_at ?? ''))
    if (Number.isNaN(ts)) return max
    if (max === null || ts > max) return ts
    return max
  }, null)
  const latestCounterMs =
    latestWebhookCounterMs === null
      ? latestAlertCounterMs
      : latestAlertCounterMs === null
      ? latestWebhookCounterMs
      : Math.max(latestWebhookCounterMs, latestAlertCounterMs)
  const counterAgeMinutes = latestCounterMs === null ? null : Math.max(0, Math.floor((Date.now() - latestCounterMs) / 60000))
  const counterStaleWarningMinutes = parsePositiveInt(process.env.BILLING_COUNTER_STALE_WARNING_MINUTES, 20)
  const isCounterStale = counterAgeMinutes !== null && counterAgeMinutes >= counterStaleWarningMinutes
  const failureLevel: 'healthy' | 'warning' | 'critical' =
    failedWebhookCount24h === 0 ? 'healthy' : failedWebhookCount24h <= 3 ? 'warning' : 'critical'
  const suppressionLevel: 'healthy' | 'warning' | 'critical' =
    suppressedAlertCount24h === 0 ? 'healthy' : suppressedAlertCount24h <= sentAlertCount24h * 2 ? 'warning' : 'critical'
  const lagLevel: 'healthy' | 'warning' | 'critical' =
    laggedWebhookCount === 0 ? 'healthy' : laggedWebhookCount <= 5 ? 'warning' : 'critical'
  const escalationLevel = maxIncidentLevel([failureLevel, suppressionLevel, lagLevel])
  
  const activeSubs = subscriptions.filter((s) => s.status === 'active')
  const mrr = activeSubs.reduce((sum, s) => sum + Number(s.monthly_price || 0), 0)
  
  const churnedThisMonth = subscriptions.filter(
    (s) => s.status === 'canceled' && s.canceled_at && new Date(s.canceled_at) >= thirtyDaysAgo
  )
  const churnedRevenue = churnedThisMonth.reduce((sum, s) => sum + Number(s.monthly_price || 0), 0)

  const pendingInvoices = invoices.filter((i) => i.status === 'draft' || i.status === 'sent' || i.status === 'overdue')
  const pendingRevenue = pendingInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0)
  
  const failedInvoices = invoices.filter((i) => i.status === 'canceled')
  const failedRevenue = failedInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0)

  const subscriptionRows = subscriptions.map((sub) => {
    const centre = normalizeOne(sub.ecd_centres as { name?: string; slug?: string } | { name?: string; slug?: string }[] | null)
    return {
      id: sub.id as string,
      ecd_id: sub.ecd_id as string,
      tier: (sub.tier ?? 'basic') as 'basic' | 'standard' | 'premium',
      status: (sub.status ?? 'trial') as 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended',
      monthly_price: Number(sub.monthly_price ?? 0),
      current_period_end: (sub.current_period_end as string | null) ?? null,
      centre_name: centre?.name ?? undefined,
      centre_slug: centre?.slug ?? undefined,
    }
  })

  const invoiceRows = invoices.map((inv) => {
    const centre = normalizeOne(inv.ecd_centres as { name?: string; slug?: string } | { name?: string; slug?: string }[] | null)
    return {
      id: inv.id as string,
      invoice_number: inv.invoice_number as string,
      ecd_id: inv.ecd_id as string,
      total: Number(inv.total ?? 0),
      status: (inv.status ?? 'draft') as 'draft' | 'sent' | 'paid' | 'overdue' | 'canceled',
      issued_at: (inv.issued_at as string | null) ?? null,
      due_at: (inv.due_at as string | null) ?? null,
      paid_at: (inv.paid_at as string | null) ?? null,
      payment_reference: (inv.payment_reference as string | null) ?? (inv.paystack_reference as string | null) ?? null,
      payment_url: (inv.payment_url as string | null) ?? null,
      reminder_last_stage: (inv.reminder_last_stage as string | null) ?? null,
      dunning_state: (inv.dunning_state as string | null) ?? null,
      centre_name: centre?.name ?? undefined,
      centre_slug: centre?.slug ?? undefined,
    }
  })

  const webhookRows = webhookEvents.map((eventRow) => {
    const linkedInvoice = normalizeOne(
      eventRow.invoices as { invoice_number?: string } | { invoice_number?: string }[] | null
    )
    return {
      id: eventRow.id as string,
      provider: (eventRow.provider as string) ?? 'paystack',
      event_id: (eventRow.event_id as string) ?? '-',
      event_type: (eventRow.event_type as string) ?? '-',
      reference: (eventRow.reference as string | null) ?? null,
      invoice_id: (eventRow.invoice_id as string | null) ?? null,
      invoice_number: linkedInvoice?.invoice_number ?? undefined,
      status: (eventRow.status as 'received' | 'processed' | 'ignored' | 'failed') ?? 'received',
      error_message: (eventRow.error_message as string | null) ?? null,
      processed_at: (eventRow.processed_at as string | null) ?? null,
      created_at: (eventRow.created_at as string) ?? new Date().toISOString(),
    }
  })

  return (
    <AdminPageLayout
      title="Revenue Ops"
      description="Real-time financial protocols and subscription telemetry."
      roleLabel="Architect Console"
      wide
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

      <CyberCard className="mb-8 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.25em] text-slate-500">Incident Quick Access</p>
            <h2 className="mt-2 text-lg font-black tracking-tight text-white">Revenue Ops Triage Shortcuts</h2>
            <p className="mt-1 text-sm text-slate-300">
              Jump directly from KPI review to response workflows and immutable timeline evidence.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
                incidentBadgeClass(failureLevel)
              )}>
                Webhook failures (24h): {failedWebhookCount24h}
              </span>
              <span className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
                incidentBadgeClass(suppressionLevel)
              )}>
                Alert suppressed (24h): {suppressedAlertCount24h}
              </span>
              <span className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
                incidentBadgeClass(lagLevel)
              )}>
                Reconciliation lagged: {laggedWebhookCount}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Badge legend: healthy = no failures/no lag, warning = failures 1-3 or lag 1-5 or suppression up to 2x sent,
              critical = failures {'>'}3 or lag {'>'}5 or suppression above 2x sent.
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Escalation note:{' '}
              {escalationLevel === 'critical'
                ? 'critical badge detected — open Webhook Incident Desk now and follow Payment Runbook before continuing manual ops.'
                : escalationLevel === 'warning'
                ? 'warning badge detected — verify failed event queue and runbook checklist before end of session.'
                : 'all badges healthy — continue monitoring and keep incident shortcuts ready.'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Last refreshed: {formatDateTime(currentRefreshIso)}. Counter data age: {formatCounterAgeLabel(counterAgeMinutes)}.
            </p>
            {isCounterStale ? (
              <div className="mt-1">
                <p className="text-xs font-semibold text-rose-300">
                  Counter data stale warning: age exceeds {counterStaleWarningMinutes} minutes. Refresh counters and verify
                  Webhook Incident Desk before making escalation decisions.
                </p>
                <StaleWarningAckButton
                  counterAgeMinutes={counterAgeMinutes}
                  thresholdMinutes={counterStaleWarningMinutes}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-emerald-300">
                Freshness status: within SLA ({counterStaleWarningMinutes} min threshold).
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/revenue?refresh=${Date.now()}`}
              className="inline-flex h-9 items-center rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-900"
            >
              Refresh counters
            </Link>
            <Link
              href="/admin/webhook-failures"
              className="inline-flex h-9 items-center rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-900"
            >
              Webhook Incident Desk
            </Link>
            <Link
              href="/admin/runbooks/payment-incidents"
              className="inline-flex h-9 items-center rounded-xl bg-cyan-500 px-3 text-xs font-black uppercase tracking-[0.08em] text-slate-900 hover:bg-cyan-400"
            >
              Payment Runbook
            </Link>
            <Link
              href="/admin/audit-trail"
              className="inline-flex h-9 items-center rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-900"
            >
              Audit Trail
            </Link>
          </div>
        </div>
      </CyberCard>

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
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Payment Ref</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Checkout</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Reminder</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Dunning</TableHead>
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
                        inv.status === 'canceled' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}>
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300 p-4 text-xs font-mono">
                      {(inv as any).payment_reference ?? (inv as any).paystack_reference ?? '-'}
                    </TableCell>
                    <TableCell className="text-slate-300 p-4 text-xs">
                      {(inv as any).payment_url ? (
                        <a
                          href={(inv as any).payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 underline-offset-2 hover:underline"
                        >
                          Link ready
                        </a>
                      ) : (
                        'Missing'
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300 p-4 text-xs uppercase">
                      {(inv as any).reminder_last_stage ?? '-'}
                    </TableCell>
                    <TableCell className="text-slate-300 p-4 text-xs uppercase">
                      {(inv as any).dunning_state ?? 'none'}
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

      <RevenueOperations subscriptions={subscriptionRows} invoices={invoiceRows} webhookEvents={webhookRows} />
    </AdminPageLayout>
  )
}
