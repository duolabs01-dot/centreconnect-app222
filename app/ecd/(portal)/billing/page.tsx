import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Billing - CentreConnect',
  description: 'Subscription, invoices, and billing controls.',
}

export default async function EcdBillingPage() {
  const { supabase, user, ecdId } = await requireEcdPortalSession()

  async function requestCancellation(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const reason = String(formData.get('reason') ?? '').trim()
    const ticketNumber = `BILL-${Date.now().toString().slice(-8)}`

    await session.supabase.from('support_tickets').insert({
      ticket_number: ticketNumber,
      ecd_id: session.ecdId,
      created_by: session.user.id,
      subject: 'Subscription cancellation request',
      description: reason || 'Please assist with subscription cancellation and final invoice process.',
      category: 'billing',
      priority: 3,
      status: 'open',
    })

    revalidatePath('/ecd/billing')
  }

  const [{ data: subscription }, { data: invoices }, { data: billingTickets }] = await Promise.all([
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
  ])

  return (
    <EcdOsShell
      title="Billing"
      description="Plan details, invoices, and subscription actions in one place."
      roleLabel="ECD Portal"
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
              <form action={requestCancellation} className="space-y-3">
                <textarea
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
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices ?? []).map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.status}</TableCell>
                        <TableCell>R{invoice.total}</TableCell>
                        <TableCell>{invoice.issued_at ? formatDate(invoice.issued_at) : '--'}</TableCell>
                        <TableCell>{invoice.due_at ? formatDate(invoice.due_at) : '--'}</TableCell>
                        <TableCell>{invoice.paid_at ? formatDate(invoice.paid_at) : '--'}</TableCell>
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
                  <div key={ticket.id} className="glass border border-white/10 p-3 text-sm text-white/80">
                    <p className="font-medium text-white">{ticket.ticket_number}</p>
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
