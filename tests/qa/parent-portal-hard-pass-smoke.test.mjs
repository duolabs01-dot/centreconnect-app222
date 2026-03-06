import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (error) {
    console.error(`FAIL: ${name}`)
    throw error
  }
}

const parentRouteMatrix = [
  'app/(journey)/parent/dashboard/page.tsx',
  'app/(journey)/parent/discover/page.tsx',
  'app/(journey)/parent/discover/discover-client.tsx',
  'app/(journey)/parent/applications/page.tsx',
  'app/(journey)/parent/children/page.tsx',
  'app/(journey)/parent/children/new/page.tsx',
  'app/(journey)/parent/profile/page.tsx',
  'app/(journey)/parent/profile/emergency/page.tsx',
  'app/(journey)/parent/profile/guardians/page.tsx',
  'app/(journey)/parent/profile/documents/page.tsx',
]

const routeActions = [
  {
    file: 'app/(journey)/parent/children/new/page.tsx',
    pattern: /Save Child/,
    label: 'Child create action',
  },
  {
    file: 'components/parent/EmergencyContactsManager.tsx',
    pattern: /(Register Contact|Save contact)/,
    label: 'Emergency contact create action',
  },
  {
    file: 'components/parent/DocumentsVaultManager.tsx',
    pattern: /(Upload & Vault|Upload document)/,
    label: 'Document upload action',
  },
  {
    file: 'components/parent/GuardiansManager.tsx',
    pattern: /\+ Add Co-Parent/,
    label: 'Guardian add action',
  },
  {
    file: 'components/parent/ParentProfileEditor.tsx',
    pattern: /Save changes/,
    label: 'Profile save action',
  },
]

const bootstrapTargets = [
  'app/(journey)/parent/children/new/page.tsx',
  'app/(journey)/parent/onboarding/_components/setup-wizard.tsx',
  'components/parent/EmergencyContactsManager.tsx',
  'components/parent/DocumentsVaultManager.tsx',
  'components/parent/ParentProfileEditor.tsx',
]

test('Parent route matrix files exist', () => {
  for (const file of parentRouteMatrix) {
    assert.equal(exists(file), true, `Missing parent route file: ${file}`)
  }
})

test('Critical parent actions are still present', () => {
  for (const item of routeActions) {
    const source = read(item.file)
    assert.match(source, item.pattern, `${item.label} missing in ${item.file}`)
  }
})

test('Parent write flows use readiness bootstrap', () => {
  for (const file of bootstrapTargets) {
    const source = read(file)
    assert.match(source, /ensureParentReady/, `ensureParentReady missing in ${file}`)
  }
})

test('Parent write flows use friendly error mapping', () => {
  const files = [
    'app/(journey)/parent/children/new/page.tsx',
    'app/(journey)/parent/onboarding/_components/setup-wizard.tsx',
    'components/parent/EmergencyContactsManager.tsx',
    'components/parent/DocumentsVaultManager.tsx',
    'components/parent/ParentProfileEditor.tsx',
    'components/parent/GuardiansManager.tsx',
  ]
  for (const file of files) {
    const source = read(file)
    assert.match(source, /toFriendlyClientError/, `toFriendlyClientError missing in ${file}`)
  }
})

test('Parent submit-failure telemetry is wired for key parent forms', () => {
  assert.equal(exists('app/api/parent/submit-failures/route.ts'), true, 'Missing parent submit-failure telemetry route')
  assert.equal(
    exists('lib/telemetry/parent-submit-failures.client.ts'),
    true,
    'Missing parent submit-failure telemetry client helper'
  )
  assert.equal(
    exists('supabase/migrations/20260306_005_parent_submit_failure_telemetry.sql'),
    true,
    'Missing parent submit-failure telemetry migration'
  )

  const migration = read('supabase/migrations/20260306_005_parent_submit_failure_telemetry.sql')
  assert.match(migration, /create table if not exists public\.parent_form_submit_failures/i)
  assert.match(migration, /route_path/i)
  assert.match(migration, /failure_type/i)

  const wiredFiles = [
    'app/(journey)/parent/children/new/page.tsx',
    'app/(journey)/parent/onboarding/_components/setup-wizard.tsx',
    'components/parent/EmergencyContactsManager.tsx',
    'components/parent/DocumentsVaultManager.tsx',
    'components/parent/ParentProfileEditor.tsx',
    'components/parent/GuardiansManager.tsx',
    'components/parent/PreferencesForm.tsx',
  ]

  for (const file of wiredFiles) {
    const source = read(file)
    assert.match(source, /reportParentSubmitFailure/, `reportParentSubmitFailure missing in ${file}`)
  }

  const preferencesAction = read('lib/actions/parents/update-preferences.ts')
  assert.match(preferencesAction, /parent_form_submit_failures/)
  assert.match(preferencesAction, /route_path:\s*'\/parent\/preferences'/)
})

test('Child create path normalizes list fields for array DB columns', () => {
  const source = read('app/(journey)/parent/children/new/page.tsx')
  assert.match(source, /parseListField\(/)
  assert.match(source, /\.split\(','\)/)
  assert.match(source, /allergies:\s*parseListField/)
  assert.match(source, /medical_conditions:\s*parseListField/)
})

test('Parent layout guardrails ensure parent bootstrap on entry', () => {
  const parentLayout = read('app/(journey)/parent/layout.tsx')
  const journeyLayout = read('app/(journey)/layout.tsx')

  assert.match(parentLayout, /\.from\('parents'\)\s*\.upsert\(/)
  assert.match(journeyLayout, /\.from\('parents'\)\s*\.upsert\(/)
})

test('Browser Supabase client remains singleton', () => {
  const source = read('lib/supabase/client.ts')
  assert.match(source, /let browserClient/)
  assert.match(source, /if \(browserClient\)/)
  assert.match(source, /browserClient = createBrowserClient/)
})

test('Bottom nav parent IA remains de-crowded', () => {
  const navSource = read('lib/navigation-config.ts')
  const parentStart = navSource.indexOf('export const PARENT_NAV_ITEMS')
  const parentEnd = navSource.indexOf('export const ECD_MOBILE_NAV_ITEMS')
  assert.notEqual(parentStart, -1, 'Could not locate PARENT_NAV_ITEMS block start')
  assert.notEqual(parentEnd, -1, 'Could not locate ECD_MOBILE_NAV_ITEMS block start')

  const parentBlock = navSource.slice(parentStart, parentEnd)
  const hrefCount = (parentBlock.match(/href:\s*'/g) ?? []).length
  assert.equal(hrefCount, 4, 'Parent nav must keep exactly 4 mobile tabs')
  assert.doesNotMatch(parentBlock, /My Applications/)
  assert.match(parentBlock, /label:\s*'Apply'/)
})

test('Landing journey strip is non-overlapping and public shell keeps brand header', () => {
  const landingSource = read('app/(journey)/page.client.tsx')
  const shellSource = read('components/layout/public-shell.tsx')
  assert.doesNotMatch(landingSource, /absolute top-8 left-2/)
  assert.match(shellSource, /BrandMark/)
  assert.match(shellSource, /<BrandMark href="\/" \/>/)
})

test('Parent signup confirmation email template keeps inline-safe styling', () => {
  const templateSource = read('lib/email/templates/parent-signup-confirmation.ts')
  assert.match(templateSource, /centreconnect-logo-email\.png/)
  assert.match(templateSource, /Confirm email/)
  assert.match(templateSource, /table role="presentation"/)
  assert.match(templateSource, /What happens next:/)
})

test('Scoreboard tracks parent UAT matrix/live-smoke progression and next active task', () => {
  const scoreboard = read('docs/BACKLOG_EXECUTION_SCOREBOARD.md')
  assert.match(scoreboard, /\[DONE\]\s+`BL-PARENT-007`/)
  assert.match(scoreboard, /\[DONE\]\s+`BL-PARENT-008`/)
  assert.match(scoreboard, /\[(DONE|ACTIVE)\]\s+`BL-PARENT-009`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-010`/)
  assert.match(scoreboard, /\[ACTIVE\]\s+`BL-PARENT-0(09|10|11)`/)
})

test('Parent live smoke command and script are wired', () => {
  const pkgRaw = read('package.json')
  const pkg = JSON.parse(pkgRaw)
  assert.ok(pkg.scripts?.['uat:parent:create:live'], 'Missing uat:parent:create:live script')
  assert.ok(pkg.scripts?.['uat:parent:create:dry'], 'Missing uat:parent:create:dry script')
  assert.ok(pkg.scripts?.['test:parent-live'], 'Missing test:parent-live script')
  assert.equal(exists('scripts/run-parent-create-live-smoke.mjs'), true)
})

console.log('Parent portal hard-pass smoke checks passed.')
