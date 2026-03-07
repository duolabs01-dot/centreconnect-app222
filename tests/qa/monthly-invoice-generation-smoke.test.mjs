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

const generationRoute = read('app/api/internal/platform-admin/invoices/generate/route.ts')
const generationSource = read('lib/payments/subscription-invoices.ts')
const vercelConfig = read('vercel.json')

check('invoice generation route protects cron path with CRON_SECRET bearer token', () => {
  assert.match(generationRoute, /process\.env\.CRON_SECRET/)
  assert.match(generationRoute, /timingSafeEqual\(/)
  assert.match(generationRoute, /authorization/)
})

check('invoice generator applies monthly proration when subscription starts mid-period', () => {
  assert.match(generationSource, /billableDays\s*<\s*periodDays/)
  assert.match(generationSource, /monthlyPrice\s*\*\s*\(billableDays\s*\/\s*periodDays\)/)
  assert.match(generationSource, /proration/)
})

check('invoice generator remains idempotent for repeated runs in the same period', () => {
  assert.match(generationSource, /upsert\(toInsert,\s*\{\s*onConflict:\s*'invoice_number'/)
  assert.match(generationSource, /ignoreDuplicates:\s*true/)
})

check('vercel cron is configured for automated invoice generation', () => {
  assert.match(vercelConfig, /"path"\s*:\s*"\/api\/internal\/platform-admin\/invoices\/generate"/)
  assert.match(vercelConfig, /"schedule"\s*:\s*"0 2 \* \* \*"/)
})

if (hasFailure) {
  process.exit(1)
}
