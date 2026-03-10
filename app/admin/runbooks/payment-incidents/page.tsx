import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Payment Incident Runbook | Platform Admin',
  description: 'Operator quick guide for payment and webhook incidents.',
}

const firstTenMinutes = [
  'Confirm incident type and scope in Webhook Incident Desk.',
  'Freeze high-risk manual edits while triage is active.',
  'Capture representative event IDs and top errors.',
  'Record incident owner and start time in audit trail context.',
]

const replayFlow = [
  'Open /admin/webhook-failures and filter to failed events.',
  'Replay one representative event first.',
  'Verify invoice/subscription reconciliation in Revenue Ops.',
  'Replay in small batches and pause on repeated root-cause errors.',
]

const auditDegradationFlow = [
  'Check logs for platform_activity_log_write_failed events.',
  'Confirm Activity Log Write Failure alert email was sent.',
  'Use reduced-risk mode and keep manual notes for critical changes.',
  'Use non-production simulation with CC_ACTIVITY_LOG_FORCE_FAIL=1 when testing alert path.',
]

export default async function PaymentIncidentRunbookPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  return (
    <AdminPageLayout
      title="Payment Incident Runbook"
      description="Fast-response checklist for webhook failures, reconciliation drift, and audit-log degradation."
      roleLabel="Ops Runbook"
      wide
      actions={
        <div className="flex gap-2">
          <Link
            href="/admin/webhook-failures"
            className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Webhook Incident Desk
          </Link>
          <Link
            href="/admin/audit-trail"
            className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Audit Trail
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>First 10 Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-200">
              {firstTenMinutes.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replay Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-200">
              {replayFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Log Degradation</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-200">
              {auditDegradationFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  )
}

