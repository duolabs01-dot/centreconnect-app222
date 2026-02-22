'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { Button } from '@/components/cc-admin/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'

type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'canceled'

type SubscriptionRow = {
  id: string
  ecd_id: string
  tier: 'basic' | 'standard' | 'premium'
  status: SubscriptionStatus
  monthly_price: number
  current_period_end: string | null
  centre_name?: string
  centre_slug?: string
}

type InvoiceRow = {
  id: string
  invoice_number: string
  ecd_id: string
  total: number
  status: InvoiceStatus
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  centre_name?: string
  centre_slug?: string
}

type WebhookStatus = 'received' | 'processed' | 'ignored' | 'failed'

type WebhookEventRow = {
  id: string
  provider: string
  event_id: string
  event_type: string
  reference: string | null
  invoice_id: string | null
  invoice_number?: string
  status: WebhookStatus
  error_message: string | null
  processed_at: string | null
  created_at: string
}

type RevenueOperationsProps = {
  subscriptions: SubscriptionRow[]
  invoices: InvoiceRow[]
  webhookEvents: WebhookEventRow[]
}

type PendingAction =
  | { kind: 'subscription'; id: string; nextStatus: SubscriptionStatus; entityLabel: string }
  | { kind: 'invoice'; id: string; nextStatus: InvoiceStatus; entityLabel: string }
  | null

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function currency(value: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
}

function subStatusClass(status: SubscriptionStatus) {
  if (status === 'active') return 'bg-emerald-500/20 text-emerald-200'
  if (status === 'trial') return 'bg-cyan-500/20 text-cyan-200'
  if (status === 'past_due') return 'bg-amber-500/20 text-amber-200'
  if (status === 'suspended' || status === 'canceled') return 'bg-rose-500/20 text-rose-200'
  return 'bg-slate-800 text-slate-200'
}

function invoiceStatusClass(status: InvoiceStatus) {
  if (status === 'paid') return 'bg-emerald-500/20 text-emerald-200'
  if (status === 'sent') return 'bg-cyan-500/20 text-cyan-200'
  if (status === 'overdue') return 'bg-amber-500/20 text-amber-200'
  if (status === 'canceled') return 'bg-rose-500/20 text-rose-200'
  return 'bg-slate-800 text-slate-200'
}

function subActions(status: SubscriptionStatus) {
  if (status === 'active') return ['suspended', 'canceled'] as const
  if (status === 'trial') return ['active', 'suspended'] as const
  if (status === 'past_due') return ['active', 'suspended'] as const
  if (status === 'suspended') return ['active', 'canceled'] as const
  return ['active'] as const
}

function invoiceActions(status: InvoiceStatus) {
  if (status === 'draft') return ['sent', 'canceled'] as const
  if (status === 'sent') return ['paid', 'overdue', 'canceled'] as const
  if (status === 'overdue') return ['paid', 'sent', 'canceled'] as const
  if (status === 'paid') return ['sent'] as const
  return ['sent'] as const
}

function labelForStatus(status: SubscriptionStatus | InvoiceStatus) {
  return status.replace(/_/g, ' ')
}

function webhookStatusClass(status: WebhookStatus) {
  if (status === 'processed') return 'bg-emerald-500/20 text-emerald-200'
  if (status === 'ignored') return 'bg-slate-700/80 text-slate-200'
  if (status === 'received') return 'bg-cyan-500/20 text-cyan-200'
  return 'bg-rose-500/20 text-rose-200'
}

export function RevenueOperations({ subscriptions, invoices, webhookEvents }: RevenueOperationsProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  async function patchJson(url: string, body: unknown) {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) throw new Error(payload.error || 'Request failed')
  }

  async function setSubscriptionStatus(subscriptionId: string, nextStatus: SubscriptionStatus) {
    setBusyKey(`sub:${subscriptionId}:${nextStatus}`)
    try {
      await patchJson(`/api/internal/platform-admin/subscriptions/${subscriptionId}`, { status: nextStatus })
      toast.success(`Subscription set to ${labelForStatus(nextStatus)}`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update subscription')
    } finally {
      setBusyKey(null)
    }
  }

  async function setInvoiceStatus(invoiceId: string, nextStatus: InvoiceStatus) {
    setBusyKey(`inv:${invoiceId}:${nextStatus}`)
    try {
      await patchJson(`/api/internal/platform-admin/invoices/${invoiceId}`, { status: nextStatus })
      toast.success(`Invoice set to ${labelForStatus(nextStatus)}`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update invoice')
    } finally {
      setBusyKey(null)
    }
  }

  async function collectInvoice(invoiceId: string, invoiceLabel: string) {
    setBusyKey(`collect:${invoiceId}`)
    try {
      const response = await fetch(`/api/internal/platform-admin/invoices/${invoiceId}/collect`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; authorizationUrl?: string; reference?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to initialize payment')

      if (payload.authorizationUrl) {
        await navigator.clipboard.writeText(payload.authorizationUrl)
        toast.success(`Payment link copied for ${invoiceLabel} (${payload.reference ?? 'reference ready'})`)
      } else {
        toast.success(`Payment initialized for ${invoiceLabel}`)
      }
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to initialize payment collection')
    } finally {
      setBusyKey(null)
    }
  }

  async function generateInvoices() {
    setBusyKey('generate:invoices')
    try {
      const response = await fetch('/api/internal/platform-admin/invoices/generate', { method: 'POST' })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        generated?: number
        skippedExisting?: number
        skippedInactiveCentre?: number
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to generate invoices')

      toast.success(
        `Generated ${payload.generated ?? 0} invoices (existing: ${payload.skippedExisting ?? 0}, inactive: ${payload.skippedInactiveCentre ?? 0})`
      )
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate invoices')
    } finally {
      setBusyKey(null)
    }
  }

  async function runPendingAction() {
    if (!pendingAction) return
    if (pendingAction.kind === 'subscription') {
      await setSubscriptionStatus(pendingAction.id, pendingAction.nextStatus)
      setPendingAction(null)
      return
    }
    await setInvoiceStatus(pendingAction.id, pendingAction.nextStatus)
    setPendingAction(null)
  }

  async function replayWebhook(eventId: string, eventLabel: string) {
    setBusyKey(`replay:${eventId}`)
    try {
      const response = await fetch(`/api/internal/platform-admin/webhooks/paystack/events/${eventId}/replay`, { method: 'POST' })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        status?: string
        previousStatus?: string
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to replay webhook event')

      toast.success(`Webhook ${eventLabel} replayed (${payload.previousStatus ?? 'unknown'} -> ${payload.status ?? 'unknown'})`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to replay webhook event')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Subscription Operations</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-700/80 bg-slate-950/30">
            <Table>
              <TableCaption className="sr-only">Subscription records with status-change operations</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Cycle End</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.slice(0, 25).map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <p className="font-medium">{sub.centre_name ?? sub.ecd_id}</p>
                      <p className="text-xs font-mono text-slate-400">{sub.centre_slug ?? '-'}</p>
                    </TableCell>
                    <TableCell className="uppercase">{sub.tier}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${subStatusClass(sub.status)}`}>
                        {labelForStatus(sub.status)}
                      </span>
                    </TableCell>
                    <TableCell>{currency(sub.monthly_price)}</TableCell>
                    <TableCell>{formatDateTime(sub.current_period_end)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {subActions(sub.status).map((nextStatus) => {
                          const key = `sub:${sub.id}:${nextStatus}`
                          return (
                            <Button
                              key={nextStatus}
                              size="sm"
                              variant={nextStatus === 'canceled' ? 'destructive' : 'outline'}
                              className={nextStatus === 'canceled' ? '' : 'border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800'}
                              disabled={busyKey === key}
                              onClick={() =>
                                setPendingAction({
                                  kind: 'subscription',
                                  id: sub.id,
                                  nextStatus,
                                  entityLabel: sub.centre_name ?? sub.ecd_id,
                                })
                              }
                            >
                              {labelForStatus(nextStatus)}
                            </Button>
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Invoice Operations</CardTitle>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={busyKey === 'generate:invoices'}
            onClick={() => void generateInvoices()}
          >
            Generate Invoices
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-700/80 bg-slate-950/30">
            <Table>
              <TableCaption className="sr-only">Invoice records with status-change operations</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.slice(0, 25).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <p>{invoice.centre_name ?? invoice.ecd_id}</p>
                      <p className="text-xs font-mono text-slate-400">{invoice.centre_slug ?? '-'}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${invoiceStatusClass(invoice.status)}`}>
                        {labelForStatus(invoice.status)}
                      </span>
                    </TableCell>
                    <TableCell>{currency(Number(invoice.total ?? 0))}</TableCell>
                    <TableCell>{formatDateTime(invoice.due_at)}</TableCell>
                    <TableCell>{formatDateTime(invoice.paid_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-primary/10 text-primary hover:bg-primary/20"
                          disabled={busyKey === `collect:${invoice.id}` || invoice.status === 'paid' || invoice.status === 'canceled'}
                          onClick={() => void collectInvoice(invoice.id, invoice.invoice_number)}
                        >
                          Collect
                        </Button>
                        {invoiceActions(invoice.status).map((nextStatus) => {
                          const key = `inv:${invoice.id}:${nextStatus}`
                          return (
                            <Button
                              key={nextStatus}
                              size="sm"
                              variant={nextStatus === 'canceled' ? 'destructive' : 'outline'}
                              className={nextStatus === 'canceled' ? '' : 'border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800'}
                              disabled={busyKey === key}
                              onClick={() =>
                                setPendingAction({
                                  kind: 'invoice',
                                  id: invoice.id,
                                  nextStatus,
                                  entityLabel: invoice.invoice_number,
                                })
                              }
                            >
                              {labelForStatus(nextStatus)}
                            </Button>
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-700/80 bg-slate-950/30">
            <Table>
              <TableCaption className="sr-only">Stored payment webhook events and replay actions</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookEvents.slice(0, 40).map((eventRow) => (
                  <TableRow key={eventRow.id}>
                    <TableCell className="uppercase">{eventRow.provider}</TableCell>
                    <TableCell>
                      <p className="font-medium">{eventRow.event_type}</p>
                      <p className="font-mono text-xs text-slate-400">{eventRow.event_id}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${webhookStatusClass(eventRow.status)}`}>
                        {eventRow.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{eventRow.reference ?? '-'}</TableCell>
                    <TableCell>{eventRow.invoice_number ?? eventRow.invoice_id ?? '-'}</TableCell>
                    <TableCell>{formatDateTime(eventRow.created_at)}</TableCell>
                    <TableCell>{formatDateTime(eventRow.processed_at)}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-rose-300">{eventRow.error_message ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                        disabled={busyKey === `replay:${eventRow.id}` || eventRow.status === 'processed'}
                        onClick={() => void replayWebhook(eventRow.id, eventRow.event_id)}
                      >
                        Replay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {webhookEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-400">
                      No webhook events yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => (!open ? setPendingAction(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm status change</DialogTitle>
            <DialogDescription>
              {pendingAction
                ? `Set ${pendingAction.kind} "${pendingAction.entityLabel}" to "${labelForStatus(pendingAction.nextStatus)}"?`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)} disabled={Boolean(busyKey)}>
              Cancel
            </Button>
            <Button onClick={() => void runPendingAction()} disabled={Boolean(busyKey)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
