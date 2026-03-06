import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
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

const revenuePage = read('app/admin/revenue/page.tsx')
const revenueOps = read('components/admin/revenue-operations.tsx')
const resendRoute = read('app/api/internal/platform-admin/invoices/[id]/resend-payment-link/route.ts')
const generateRoute = read('app/api/internal/platform-admin/invoices/generate/route.ts')
const collectRoute = read('app/api/internal/platform-admin/invoices/[id]/collect/route.ts')
const webhookRoute = read('app/api/webhooks/paystack/route.ts')
const automationRoute = read('app/api/internal/platform-admin/billing/automation/route.ts')
const webhookAlerts = read('lib/payments/webhook-alerts.ts')

check('admin revenue summary retains deep-links, badges, and payment reference state', () => {
  assert.match(revenuePage, /Payment Ref/)
  assert.match(revenuePage, /Checkout/)
  assert.match(revenuePage, /payment_reference/)
  assert.match(revenuePage, /payment_url/)
  assert.match(revenuePage, /Revenue Ops Triage Shortcuts/)
  assert.match(revenuePage, /Webhook failures \(24h\)/)
  assert.match(revenuePage, /Alert suppressed \(24h\)/)
  assert.match(revenuePage, /Reconciliation lagged/)
  assert.match(revenuePage, /Escalation note:/)
  assert.match(revenuePage, /Last refreshed:/)
  assert.match(revenuePage, /Counter data age:/)
  assert.match(revenuePage, /Counter data stale warning:/)
  assert.match(revenuePage, /Freshness status:/)
  assert.match(revenuePage, /Refresh counters/)
  assert.match(revenuePage, /\/admin\/runbooks\/payment-incidents/)
  assert.match(revenuePage, /\/admin\/webhook-failures/)
  assert.match(revenuePage, /\/admin\/audit-trail/)
})

check('revenue operations keep resend payment link control and event-driven status guidance', () => {
  assert.match(revenueOps, /Resend Link/)
  assert.match(revenueOps, /resendPaymentLink\(/)
  assert.match(revenueOps, /Event-Driven Billing Guidance/)
  assert.match(revenueOps, /Billing State Glossary/)
  assert.match(revenueOps, /draft:|sent:|overdue:|paid:|canceled:/)
  assert.match(revenueOps, /Open Webhook Incident Desk/)
  assert.match(revenueOps, /Open Payment Runbook/)
  assert.doesNotMatch(revenueOps, /Confirm status change/)
})

check('resend payment link route reuses paystack initialization and email delivery', () => {
  assert.match(resendRoute, /initializePaystackInvoicePayment\(/)
  assert.match(resendRoute, /sendEmail\(/)
  assert.match(resendRoute, /resend_payment_link/)
})

check('structured billing logs are present across invoice and webhook pipelines', () => {
  assert.match(generateRoute, /logBillingEvent\(/)
  assert.match(collectRoute, /logBillingEvent\(/)
  assert.match(webhookRoute, /logBillingEvent\(/)
  assert.match(automationRoute, /logBillingEvent\(/)
})

check('billing automation checks webhook health and triggers alerting path', () => {
  assert.match(automationRoute, /checkAndAlertWebhookHealth\(/)
  assert.match(webhookAlerts, /sendPlatformAdminActionNotification\(/)
  assert.match(webhookAlerts, /alert_webhook_pipeline/)
})

if (hasFailure) {
  process.exit(1)
}
