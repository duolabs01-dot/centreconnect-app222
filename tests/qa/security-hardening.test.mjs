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

if (hasFailure) {
  process.exit(1)
}
