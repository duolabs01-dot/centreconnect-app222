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

const webhookRoute = read('app/api/webhooks/paystack/route.ts')
const reconcileSource = read('lib/payments/webhook-reconcile.ts')

check('paystack webhook verifies signature and rejects invalid payloads', () => {
  assert.match(webhookRoute, /verifyPaystackSignature\(/)
  assert.match(webhookRoute, /Invalid signature/)
  assert.match(webhookRoute, /\{\s*status:\s*401\s*\}/)
})

check('paystack webhook enforces idempotency for duplicate events', () => {
  assert.match(webhookRoute, /existing\?\.status === "paid"/)
  assert.match(webhookRoute, /duplicate:\s*true/)
  assert.match(webhookRoute, /insertError\.code === '23505'/)
})

check('webhook reconciliation drives invoice and subscription state from events', () => {
  assert.match(reconcileSource, /eventType === 'charge\.success'/)
  assert.match(reconcileSource, /from\('invoices'\)\s*\.update\((\s*\{|\s*patch)/)
  assert.match(reconcileSource, /from\('subscriptions'\)\s*\.update\(\{\s*status:\s*'active'\s*\}\)/)
})

if (hasFailure) {
  process.exit(1)
}
