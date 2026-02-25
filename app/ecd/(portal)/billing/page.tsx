import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { PayInvoiceButton } from '@/components/ecd/PayInvoiceButton'
import { requestCancellationAction, saveFinancialSnapshotAction } from './actions'

export const metadata: Metadata = {
  title: 'Billing - CentreConnect',
  description: 'Subscription, invoices, and billing controls.',
}

export default async function EcdBillingPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: subscription }, { data: invoices }, { data: billingTickets }, { data: financialSnapshot }] = await Promise.all([
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
  ])

  const pnl = {
    revenue: Number(financialSnapshot?.revenue_total ?? 0),
    expenses: Number(financialSnapshot?.expenses_total ?? 0),
    assets: Number(financialSnapshot?.assets_total ?? 0),
    liabilities: Number(financialSnapshot?.liabilities_total ?? 0),
  }
  const monthlyProfit = pnl.revenue - pnl.expenses
  const netWorth = pnl.assets - pnl.liabilities

  return (
    <EcdOsShell
      title="Billing"
      description="Plan details, invoices, and subscription actions in one place."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {!subscription ? (
                <EmptyState
                  title="No active subscription record"
                  description="Your subscription details will appear once billing is activated."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-card/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{subscription.tier}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{subscription.status}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Price</p>
                    <p className="mt-1 text-lg font-bold text-foreground">R{subscription.monthly_price}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Setup Fee</p>
                    <p className="mt-1 text-lg font-bold text-foreground">R{subscription.setup_fee}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card/80 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing Period</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </p>
                    {subscription.trial_ends_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">Trial ends: {formatDate(subscription.trial_ends_at)}</p>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/50">
            <CardHeader>
              <CardTitle>Cancel Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-rose-900">
                Cancellation creates a billing support ticket so the team can finalize your account and invoices safely.
              </p>
              <form action={requestCancellationAction} className="space-y-3">
                <label htmlFor="billing-cancellation-reason" className="text-sm font-medium text-rose-900">
                  Reason (optional)
                </label>
                <textarea
                  id="billing-cancellation-reason"
                  name="reason"
                  className="cc-native-field min-h-24 h-auto py-2"
                  placeholder="Reason (optional)"
                />
                <Button type="submit" variant="outline" className="border-rose-300 text-rose-800 hover:bg-rose-100">
                  Request Cancellation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Business Snapshot (P&L)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Keep monthly financials updated to track profitability and operational health.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-cyan-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Revenue</p>
                <p className="mt-1 text-lg font-bold text-cyan-800">R{pnl.revenue.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Expenses</p>
                <p className="mt-1 text-lg font-bold text-rose-800">R{pnl.expenses.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Profit / Loss</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">R{monthlyProfit.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Net Assets</p>
                <p className="mt-1 text-lg font-bold text-violet-800">R{netWorth.toLocaleString()}</p>
              </div>
            </div>
            <form action={saveFinancialSnapshotAction} className="grid gap-3 lg:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Month
                <input type="date" name="period_month" className="cc-native-field mt-1" defaultValue={currentMonth} />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Revenue (R)
                <input
                  type="number"
                  name="revenue_total"
                  className="cc-native-field mt-1"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.revenue}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expenses (R)
                <input
                  type="number"
                  name="expenses_total"
                  className="cc-native-field mt-1"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.expenses}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assets (R)
                <input
                  type="number"
                  name="assets_total"
                  className="cc-native-field mt-1"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.assets}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Liabilities (R)
                <input
                  type="number"
                  name="liabilities_total"
                  className="cc-native-field mt-1"
                  min="0"
                  step="0.01"
                  defaultValue={pnl.liabilities}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:col-span-2">
                Notes
                <textarea
                  name="notes"
                  className="cc-native-field mt-1 h-auto min-h-20 py-2"
                  defaultValue={financialSnapshot?.notes ?? ''}
                  placeholder="Add context for this month (seasonality, staffing changes, etc.)"
                />
              </label>
              <Button type="submit" className="w-full sm:w-fit" disabled={role === 'ecd_staff'}>
                Save Financial Snapshot
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {(invoices ?? []).length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Invoices will appear here once generated."
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="hidden lg:table-cell">Issued</TableHead>
                      <TableHead className="hidden lg:table-cell">Due</TableHead>
                      <TableHead className="hidden lg:table-cell">Paid</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices ?? []).map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.status}</TableCell>
                        <TableCell>R{invoice.total}</TableCell>
                        <TableCell className="hidden lg:table-cell">{invoice.issued_at ? formatDate(invoice.issued_at) : '--'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{invoice.due_at ? formatDate(invoice.due_at) : '--'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{invoice.paid_at ? formatDate(invoice.paid_at) : '--'}</TableCell>
                        <TableCell className="text-right">
                          {invoice.status !== 'paid' ? (
                            <PayInvoiceButton invoiceId={invoice.id} />
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600">Paid</span>
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

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Recent Billing Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {(billingTickets ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">No billing tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {(billingTickets ?? []).map((ticket) => (
                  <div key={ticket.id} className="border border-border p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{ticket.ticket_number}</p>
                    <p className="text-xs text-slate-400">
                      {ticket.status} | {formatDate(ticket.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </EcdOsShell>
  )
}


