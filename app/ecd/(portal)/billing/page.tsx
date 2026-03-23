import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { PayInvoiceButton } from '@/components/ecd/PayInvoiceButton'
import { MonthlyInvoicesCard } from './monthly-invoices-card'
import { StatusBadge } from "@/components/ui/status-badge";
import { TrialStatusBanner } from '@/components/ecd/trial-status-banner'
import { getInternalTierLabel, toInternalTier } from '@/lib/billing/plans'
import { requestCancellationAction, saveFinancialSnapshotAction } from './actions'
import { PaymentMethodUpdateButton } from './payment-method-update-button'

export const metadata: Metadata = {
  title: 'Billing - CentreConnect',
  description: 'Subscription, invoices, and billing controls.',
}

export default async function EcdBillingPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthName = now.toLocaleString('en-ZA', { month: 'long' })
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [{ data: subscription }, { data: invoices }, { data: billingTickets }, { data: financialSnapshot }, { data: enrolledApps }, { data: paymentMethod }, { data: latestPaymentMethodUpdate }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id,tier,status,monthly_price,setup_fee,current_period_start,current_period_end,trial_ends_at')
      .eq('ecd_id', ecdId)
      .order('current_period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('id,invoice_number,status,total,issued_at,due_at,paid_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('support_tickets')
      .select('id,ticket_number,status,created_at')
      .eq('ecd_id', ecdId)
      .eq('category', 'billing')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('ecd_financial_snapshots')
      .select('period_month,revenue_total,expenses_total,assets_total,liabilities_total,notes')
      .eq('ecd_id', ecdId)
      .eq('period_month', currentMonth)
      .maybeSingle(),
    supabase
      .from('applications')
      .select('monthly_fee_cents')
      .eq('ecd_id', ecdId)
      .eq('status', 'enrolled')
      .gt('monthly_fee_cents', 0),
    supabase
      .from('ecd_billing_payment_methods')
      .select('id,card_type,last4,bank,exp_month,exp_year,updated_at')
      .eq('ecd_id', ecdId)
      .maybeSingle(),
    supabase
      .from('billing_payment_method_updates')
      .select('status,created_at,completed_at,failed_at,error_message')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const enrolledWithFeesCount = enrolledApps?.length ?? 0
  const totalExpectedMonthlyRevenue = (enrolledApps?.reduce((acc, app) => acc + (app.monthly_fee_cents ?? 0), 0) ?? 0) / 100

  const pnl = {
    revenue: Number(financialSnapshot?.revenue_total ?? 0),
    expenses: Number(financialSnapshot?.expenses_total ?? 0),
    assets: Number(financialSnapshot?.assets_total ?? 0),
    liabilities: Number(financialSnapshot?.liabilities_total ?? 0),
  }
  const monthlyProfit = pnl.revenue - pnl.expenses
  const netWorth = pnl.assets - pnl.liabilities

  return (
    <>
      <section className="space-y-6">
        {role === 'ecd_admin' && (
          <MonthlyInvoicesCard 
            ecdId={ecdId}
            enrolledWithFeesCount={enrolledWithFeesCount}
            totalExpectedMonthlyRevenue={totalExpectedMonthlyRevenue}
            currentMonthName={monthName}
            year={year}
            month={month}
          />
        )}
        <TrialStatusBanner
          subscription={{
            tier: subscription?.tier ?? 'basic',
            status: subscription?.status ?? 'trial',
            monthlyPrice: subscription?.monthly_price ?? null,
            trialEndsAt: subscription?.trial_ends_at ?? null,
          }}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden lg:col-span-2">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!subscription ? (
                <EmptyState
                  title="No active subscription record"
                  description="Your subscription details will appear once billing is activated."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tier</p>
                    <p className="mt-0.5 text-sm font-semibold text-teal-700">
                      {getInternalTierLabel(toInternalTier(subscription.tier, 'basic'))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 capitalize">{subscription.status}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Price</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">R{subscription.monthly_price}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Setup Fee</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">R{subscription.setup_fee}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billing Period</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </p>
                    {subscription.trial_ends_at ? (
                      <p className="mt-1 text-xs font-medium text-amber-600">Trial ends: {formatDate(subscription.trial_ends_at)}</p>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-100 bg-rose-50/30 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-rose-50/50">
              <CardTitle className="text-base font-bold text-rose-900">Cancel Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-xs font-medium text-rose-800 leading-relaxed">
                Cancellation creates a billing support ticket so the team can finalize your account and invoices safely.
              </p>
              <form action={requestCancellationAction} className="space-y-4">
                <textarea
                  id="billing-cancellation-reason"
                  name="reason"
                  className="cc-native-field min-h-24 h-auto py-3 rounded-2xl text-sm"
                  placeholder="Reason for cancellation (optional)"
                />
                <Button type="submit" variant="outline" className="w-full border-rose-200 text-rose-700 font-bold h-11 rounded-2xl shadow-sm hover:bg-rose-50">
                  Request Cancellation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {paymentMethod ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Saved Method</p>
                <p className="mt-1 text-sm font-bold text-emerald-900">
                  {paymentMethod.card_type ?? 'Card'} •••• {paymentMethod.last4 ?? '----'}
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  {paymentMethod.bank ?? 'Bank'} • Exp {paymentMethod.exp_month ?? '--'}/{paymentMethod.exp_year ?? '--'}
                </p>
                <p className="mt-2 text-[11px] text-emerald-700">
                  Updated {paymentMethod.updated_at ? formatDate(paymentMethod.updated_at) : '--'}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                <p className="text-sm font-semibold text-amber-900">No saved payment method yet.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Add or refresh your card details to reduce failed collections and avoid billing interruptions.
                </p>
              </div>
            )}

            {latestPaymentMethodUpdate ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Latest Update Request</p>
                <p className="mt-1 text-sm font-bold text-slate-900 capitalize">{latestPaymentMethodUpdate.status}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Started: {latestPaymentMethodUpdate.created_at ? formatDate(latestPaymentMethodUpdate.created_at) : '--'}
                </p>
                {latestPaymentMethodUpdate.completed_at ? (
                  <p className="mt-1 text-xs text-emerald-700">Completed: {formatDate(latestPaymentMethodUpdate.completed_at)}</p>
                ) : null}
                {latestPaymentMethodUpdate.failed_at ? (
                  <p className="mt-1 text-xs text-rose-700">Failed: {formatDate(latestPaymentMethodUpdate.failed_at)}</p>
                ) : null}
                {latestPaymentMethodUpdate.error_message ? (
                  <p className="mt-1 text-xs text-rose-700">{latestPaymentMethodUpdate.error_message}</p>
                ) : null}
              </div>
            ) : null}

            <PaymentMethodUpdateButton />
            <p className="text-xs text-slate-500">
              This opens a secure Paystack checkout. A small verification charge may apply and helps save your updated card authorization.
            </p>
          </CardContent>
        </Card>

        {role === 'ecd_admin' && (
          <Button variant="outline" asChild className="w-full sm:w-fit border-slate-200 text-slate-700 font-bold h-11 px-8 rounded-2xl">
            <Link href="/ecd/financials">Financials Overview <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        )}

        <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Revenue</p>
                <p className="mt-1 text-xl font-black text-emerald-900">R{pnl.revenue.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Expenses</p>
                <p className="mt-1 text-xl font-black text-rose-900">R{pnl.expenses.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Profit / Loss</p>
                <p className="mt-1 text-xl font-black text-emerald-900">R{monthlyProfit.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Net Assets</p>
                <p className="mt-1 text-xl font-black text-violet-900">R{netWorth.toLocaleString()}</p>
              </div>
            </div>
            <form action={saveFinancialSnapshotAction} className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Month</span>
                <input type="date" name="period_month" className="cc-native-field h-12 rounded-2xl" defaultValue={currentMonth} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Revenue (R)</span>
                <input
                  type="number"
                  name="revenue_total"
                  className="cc-native-field h-12 rounded-2xl"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.revenue}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expenses (R)</span>
                <input
                  type="number"
                  name="expenses_total"
                  className="cc-native-field h-12 rounded-2xl"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.expenses}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assets (R)</span>
                <input
                  type="number"
                  name="assets_total"
                  className="cc-native-field h-12 rounded-2xl"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.assets}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Liabilities (R)</span>
                <input
                  type="number"
                  name="liabilities_total"
                  className="cc-native-field h-12 rounded-2xl"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.liabilities}
                />
              </label>
              <label className="space-y-1.5 lg:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Internal Notes</span>
                <textarea
                  name="notes"
                  className="cc-native-field h-auto min-h-24 py-3 rounded-2xl leading-relaxed"
                  defaultValue={financialSnapshot?.notes ?? ''}
                  placeholder="Add context for this month..."
                />
              </label>
              <Button type="submit" className="w-full sm:w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-colors shadow-sm" disabled={role === 'ecd_staff'}>
                Save Financial Snapshot
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {(invoices ?? []).length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Invoices will appear here once generated."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</TableHead>
                      <TableHead className="hidden lg:table-cell text-[10px] font-black uppercase tracking-widest text-slate-400">Issued</TableHead>
                      <TableHead className="hidden lg:table-cell text-[10px] font-black uppercase tracking-widest text-slate-400">Due</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices ?? []).map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-900">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">R{invoice.total}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-slate-500">{invoice.issued_at ? formatDate(invoice.issued_at) : '--'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-slate-500">{invoice.due_at ? formatDate(invoice.due_at) : '--'}</TableCell>
                        <TableCell className="text-right pr-6">
                          {invoice.status !== 'paid' ? (
                            <PayInvoiceButton invoiceId={invoice.id} />
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-2xl border border-emerald-100">Paid</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Recent Billing Tickets</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {(billingTickets ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 py-4 italic">No billing tickets yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(billingTickets ?? []).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="tile rounded-2xl border border-slate-100 bg-slate-50/30 p-4 transition-colors duration-200 hover:bg-slate-50"
                  >
                    <p className="text-sm font-bold text-slate-900">{ticket.ticket_number}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {ticket.status} • {formatDate(ticket.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}



