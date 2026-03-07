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

const collectRoute = read('app/api/internal/platform-admin/invoices/[id]/collect/route.ts')
const webhookRoute = read('app/api/webhooks/paystack/route.ts')
const reconcileSource = read('lib/payments/webhook-reconcile.ts')
const automationSource = read('lib/payments/billing-automation.ts')
const ecdBillingActions = read('app/ecd/(portal)/billing/actions.ts')

check('collect route stores provider reference and payment URL when initializing payment', () => {
  assert.match(collectRoute, /initializePaystackInvoicePayment\(/)
  assert.match(collectRoute, /payment_reference:\s*payment\.reference/)
  assert.match(collectRoute, /payment_url:\s*payment\.authorizationUrl/)
})

check('webhook path reconciles charge.success events through the shared reconcile service', () => {
  assert.match(webhookRoute, /verifyPaystackSignature\(/)
  assert.match(webhookRoute, /reconcilePaystackWebhookEvent\(/)
  assert.match(webhookRoute, /payment_webhook_events/)
})

check('reconciliation marks invoices paid, activates subscriptions, and triggers receipt delivery', () => {
  assert.match(reconcileSource, /status:\s*'paid'/)
  assert.match(reconcileSource, /from\('subscriptions'\)\s*\.update\(\{\s*status:\s*'active'\s*\}\)/)
  assert.match(reconcileSource, /deliverInvoiceReceipt\(/)
})

check('billing automation enforces reminder cadence and dunning suspension', () => {
  assert.match(automationSource, /resolveReminderStage/)
  assert.match(automationSource, /d_minus_7/)
  assert.match(automationSource, /overdue_7/)
  assert.match(automationSource, /status:\s*'suspended'/)
})

check('ECD billing exposes self-serve payment-method update flow', () => {
  assert.match(ecdBillingActions, /initializePaystackPaymentMethodUpdate\(/)
  assert.match(ecdBillingActions, /billing_payment_method_updates/)
  assert.match(ecdBillingActions, /redirect\(payment\.authorizationUrl\)/)
})

if (hasFailure) {
  process.exit(1)
}
