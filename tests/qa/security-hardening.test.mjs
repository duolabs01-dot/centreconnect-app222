import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

let hasFailure = false

function check(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    hasFailure = true
    const message = error instanceof Error ? error.message : String(error)
    console.error(`FAIL ${name}: ${message}`)
  }
}

check('support ticket server action enforces platform admin authorization', () => {
  const source = read('lib/actions/support-tickets.ts')
  assert.match(source, /requirePlatformAdmin\(/)
  assert.match(source, /updateTicketStatusSchema/)
})

check('centre provisioning route uses cryptographic temp password and rollback on subscription failure', () => {
  const source = read('app/api/internal/platform-admin/centres/route.ts')
  assert.match(source, /randomBytes\(/)
  assert.doesNotMatch(source, /Math\.random\(\)\.toString\(36\)\.slice\(-10\)/)
  assert.match(source, /rolled back tenant provisioning/)
})

check('transport driver RLS hardening migration removes permissive policy', () => {
  const source = read('supabase/migrations/20260225_002_transport_driver_policy_hardening.sql')
  assert.match(source, /DROP POLICY IF EXISTS "driver_token_self_read"/)
  assert.match(source, /CREATE POLICY "ecd_team_read_drivers"/)
})

check('middleware timeout paths enforce protected-route redirects', () => {
  const source = read('lib/supabase/middleware.ts')
  assert.match(source, /user-timeout-protected-redirect/)
  assert.match(source, /role-timeout-protected-redirect/)
})

check('admin audit trail route remains immutable and platform-admin protected', () => {
  const source = read('app/admin/audit-trail/page.tsx')
  assert.match(source, /profile\?\.role !== 'platform_admin'/)
  assert.match(source, /from\('platform_admin_activity_log'\)/)
  assert.doesNotMatch(source, /\.update\(/)
  assert.doesNotMatch(source, /\.delete\(/)
})

check('webhook failures dashboard route exposes replay-focused incident surface', () => {
  const pageSource = read('app/admin/webhook-failures/page.tsx')
  const dashboardSource = read('components/admin/webhook-failure-dashboard.tsx')
  assert.match(pageSource, /profile\?\.role !== 'platform_admin'/)
  assert.match(pageSource, /from\('payment_webhook_events'\)/)
  assert.match(pageSource, /alert_activity_log_write_failure/)
  assert.match(pageSource, /suppress_activity_log_write_failure/)
  assert.match(pageSource, /sentDelta/)
  assert.match(pageSource, /suppressedDelta/)
  assert.match(pageSource, /sentTrend/)
  assert.match(pageSource, /suppressedTrend/)
  assert.match(pageSource, /trendBucketHours/)
  assert.match(dashboardSource, /\/api\/internal\/platform-admin\/webhooks\/paystack\/events\/\$\{row\.id\}\/replay/)
  assert.match(dashboardSource, /Failed Event Queue/)
  assert.match(dashboardSource, /Activity-Log Alerts Sent/)
  assert.match(dashboardSource, /Activity-Log Alerts Suppressed/)
  assert.match(dashboardSource, /vs previous window/)
  assert.match(dashboardSource, /Alert Trend Sparkline/)
  assert.match(dashboardSource, /Bucket window:/)
  assert.match(dashboardSource, /max scale/i)
})

check('revenue operations UI avoids stale manual status mutation controls', () => {
  const source = read('components/admin/revenue-operations.tsx')
  assert.match(source, /Status transitions are event-driven/)
  assert.doesNotMatch(source, /setSubscriptionStatus\(/)
  assert.doesNotMatch(source, /setInvoiceStatus\(/)
  assert.doesNotMatch(source, /Confirm status change/)
})

check('activity log failure alerts use persistence-backed throttle markers', () => {
  const source = read('lib/admin/activity-log.ts')
  assert.match(source, /ACTIVITY_LOG_ALERT_MARKER_ACTION/)
  assert.match(source, /alert_activity_log_write_failure/)
  assert.match(source, /ACTIVITY_LOG_ALERT_SUPPRESSED_ACTION/)
  assert.match(source, /suppress_activity_log_write_failure/)
  assert.match(source, /shouldSendFailureAlert\(/)
  assert.match(source, /persistFailureAlertMarker\(/)
  assert.match(source, /persistFailureSuppressionMarker\(/)
})

check('activity log forced-failure simulation is documented and non-production guarded', () => {
  const source = read('lib/admin/activity-log.ts')
  const runbook = read('docs/PAYMENT_INCIDENT_MANUAL_RECOVERY_RUNBOOK.md')
  assert.match(source, /CC_ACTIVITY_LOG_FORCE_FAIL/)
  assert.match(source, /process\.env\.NODE_ENV !== 'production'/)
  assert.match(runbook, /CC_ACTIVITY_LOG_FORCE_FAIL=1/)
})

check('admin invoice status route blocks manual event-owned transitions with 409 responses', () => {
  const source = read('app/api/internal/platform-admin/invoices/[id]/route.ts')
  assert.match(source, /if \(nextStatus !== 'canceled'\)/)
  assert.match(source, /event-driven and cannot be set manually/)
  assert.match(source, /\{ status: 409 \}/)
  assert.match(source, /Paid invoices cannot be manually canceled/)
})

check('admin subscription status route blocks manual event-owned transitions with 409 responses', () => {
  const source = read('app/api/internal/platform-admin/subscriptions/[id]/route.ts')
  assert.match(source, /nextStatus === 'trial' \|\| nextStatus === 'active' \|\| nextStatus === 'past_due'/)
  assert.match(source, /event-driven and cannot be set manually/)
  assert.match(source, /\{ status: 409 \}/)
})

check('revenue summary escalation note and badge thresholds stay intact', () => {
  const source = read('app/admin/revenue/page.tsx')
  assert.match(source, /Escalation note:/)
  assert.match(source, /failedWebhookCount24h <= 3/)
  assert.match(source, /suppressedAlertCount24h <= sentAlertCount24h \* 2/)
  assert.match(source, /laggedWebhookCount <= 5/)
  assert.match(source, /maxIncidentLevel/)
})

check('revenue stale-data warning threshold behavior remains configured and explicit', () => {
  const source = read('app/admin/revenue/page.tsx')
  assert.match(source, /BILLING_COUNTER_STALE_WARNING_MINUTES/)
  assert.match(source, /isCounterStale/)
  assert.match(source, /Counter data stale warning:/)
  assert.match(source, /Freshness status:/)
  assert.match(source, /StaleWarningAckButton/)
})

check('stale-warning acknowledgement endpoint is admin-guarded and auditable', () => {
  const routeSource = read('app/api/internal/platform-admin/revenue/stale-warning-ack/route.ts')
  const buttonSource = read('components/admin/stale-warning-ack-button.tsx')
  assert.match(routeSource, /requirePlatformAdmin\(/)
  assert.match(routeSource, /writePlatformActivity\(/)
  assert.match(routeSource, /ack_revenue_stale_warning/)
  assert.match(buttonSource, /Acknowledge warning/)
  assert.match(buttonSource, /\/api\/internal\/platform-admin\/revenue\/stale-warning-ack/)
})

if (hasFailure) {
  process.exit(1)
}
