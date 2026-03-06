import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { WebhookFailureDashboard } from '@/components/admin/webhook-failure-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Webhook Failures | CC Control Tower',
  description: 'Failed payment webhook events, triage state, and replay actions.',
}

type WebhookStatus = 'received' | 'processed' | 'ignored' | 'failed'
const ACTIVITY_ALERT_LOOKBACK_HOURS = 24

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function AdminWebhookFailuresPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const { data: rows } = await admin
    .from('payment_webhook_events')
    .select('id,event_id,event_type,status,reference,invoice_id,error_message,created_at,processed_at,invoices(invoice_number)')
    .order('created_at', { ascending: false })
    .limit(400)

  const nowMs = Date.now()
  const currentWindowStartMs = nowMs - ACTIVITY_ALERT_LOOKBACK_HOURS * 60 * 60 * 1000
  const previousWindowStartMs = currentWindowStartMs - ACTIVITY_ALERT_LOOKBACK_HOURS * 60 * 60 * 1000
  const currentWindowStartIso = new Date(currentWindowStartMs).toISOString()
  const previousWindowStartIso = new Date(previousWindowStartMs).toISOString()
  const nowIso = new Date(nowMs).toISOString()

  const { data: activityRows } = await admin
    .from('platform_admin_activity_log')
    .select('action,created_at')
    .in('action', ['alert_activity_log_write_failure', 'suppress_activity_log_write_failure'])
    .gte('created_at', previousWindowStartIso)
    .lt('created_at', nowIso)

  const mappedRows = (rows ?? []).map((row) => {
    const invoice = normalizeOne(row.invoices as { invoice_number?: string } | { invoice_number?: string }[] | null)
    return {
      id: row.id as string,
      event_id: row.event_id as string,
      event_type: row.event_type as string,
      status: (row.status as WebhookStatus) ?? 'received',
      reference: (row.reference as string | null) ?? null,
      invoice_id: (row.invoice_id as string | null) ?? null,
      invoice_number: invoice?.invoice_number ?? null,
      error_message: (row.error_message as string | null) ?? null,
      created_at: row.created_at as string,
      processed_at: (row.processed_at as string | null) ?? null,
    }
  })

  const countInWindow = (actionName: string, fromMs: number, toMs: number) =>
    (activityRows ?? []).filter((row) => {
      if (row.action !== actionName) return false
      const createdMs = Date.parse(String(row.created_at))
      if (Number.isNaN(createdMs)) return false
      return createdMs >= fromMs && createdMs < toMs
    }).length

  const sentCountCurrent = countInWindow('alert_activity_log_write_failure', currentWindowStartMs, nowMs)
  const sentCountPrevious = countInWindow('alert_activity_log_write_failure', previousWindowStartMs, currentWindowStartMs)
  const suppressedCountCurrent = countInWindow('suppress_activity_log_write_failure', currentWindowStartMs, nowMs)
  const suppressedCountPrevious = countInWindow('suppress_activity_log_write_failure', previousWindowStartMs, currentWindowStartMs)

  const activityAlertMetrics = {
    windowHours: ACTIVITY_ALERT_LOOKBACK_HOURS,
    sentCount: sentCountCurrent,
    suppressedCount: suppressedCountCurrent,
    sentDelta: sentCountCurrent - sentCountPrevious,
    suppressedDelta: suppressedCountCurrent - suppressedCountPrevious,
  }

  return (
    <AdminPageLayout
      title="Webhook Incident Desk"
      description="Dedicated failed-event queue for fast replay and incident triage."
      roleLabel="Reliability Console"
      wide
      actions={
        <div className="flex gap-2">
          <Link
            href="/admin/audit-trail"
            className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Audit Trail
          </Link>
          <Link
            href="/admin/runbooks/payment-incidents"
            className="inline-flex h-10 items-center rounded-xl bg-cyan-500 px-4 text-xs font-black uppercase tracking-[0.08em] text-slate-900 hover:bg-cyan-400"
          >
            Payment Runbook
          </Link>
        </div>
      }
    >
      <WebhookFailureDashboard rows={mappedRows} activityAlertMetrics={activityAlertMetrics} />
    </AdminPageLayout>
  )
}
