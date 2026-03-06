import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const suiteStartedAt = Date.now()
const results = []

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function test(name, fn) {
  try {
    fn()
    results.push({
      name,
      status: 'pass',
    })
    console.log(`PASS: ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({
      name,
      status: 'fail',
      message,
    })
    console.error(`FAIL: ${name}`)
    console.error(message)
  }
}

function buildTextReport(report) {
  const lines = [
    `Suite: ${report.suite}`,
    `Status: ${report.status.toUpperCase()}`,
    `Started: ${report.startedAt}`,
    `Finished: ${report.finishedAt}`,
    `DurationMs: ${report.durationMs}`,
    `TotalChecks: ${report.summary.total}`,
    `Passed: ${report.summary.passed}`,
    `Failed: ${report.summary.failed}`,
    '',
    'Checks:',
  ]

  for (const check of report.checks) {
    lines.push(`- [${check.status.toUpperCase()}] ${check.name}`)
    if (check.status === 'fail' && check.message) {
      lines.push(`  ${check.message}`)
    }
  }

  return `${lines.join('\n')}\n`
}

function writeAuditReport() {
  const finishedAtMs = Date.now()
  const failedChecks = results.filter((item) => item.status === 'fail')
  const report = {
    suite: 'parent-portal-hard-pass-smoke',
    status: failedChecks.length === 0 ? 'pass' : 'fail',
    startedAt: new Date(suiteStartedAt).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - suiteStartedAt,
    summary: {
      total: results.length,
      passed: results.length - failedChecks.length,
      failed: failedChecks.length,
    },
    checks: results,
  }

  const reportDir = path.join(root, 'tmp', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })

  const timestamp = report.finishedAt.replace(/[:.]/g, '-')
  const jsonPath = path.join(reportDir, `parent-uat-${timestamp}.json`)
  const latestJsonPath = path.join(reportDir, 'parent-uat-latest.json')
  const latestTxtPath = path.join(reportDir, 'parent-uat-latest.txt')

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2))
  fs.writeFileSync(latestTxtPath, buildTextReport(report))

  console.log(`AUDIT_REPORT_JSON: ${jsonPath}`)
  console.log(`AUDIT_REPORT_LATEST_JSON: ${latestJsonPath}`)
  console.log(`AUDIT_REPORT_LATEST_TXT: ${latestTxtPath}`)

  return report
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

test('Parent dashboard readiness card is wired with completion and CTA links', () => {
  const sectionPath = 'app/(journey)/parent/dashboard/_sections/profile-readiness-card.tsx'
  assert.equal(exists(sectionPath), true, 'Missing profile readiness card section')

  const sectionSource = read(sectionPath)
  assert.match(sectionSource, /evaluateParentIntakeReadiness/)
  assert.match(sectionSource, /completionPct/)
  assert.match(sectionSource, /\/parent\/profile/)
  assert.match(sectionSource, /\/parent\/profile\/emergency/)
  assert.match(sectionSource, /\/parent\/profile\/documents/)
  assert.match(sectionSource, /\/parent\/children\/new/)

  const dashboardSource = read('app/(journey)/parent/dashboard/page.tsx')
  assert.match(dashboardSource, /ProfileReadinessCard/)
  assert.match(dashboardSource, /ProfileReadinessCardSkeleton/)
})

test('Admin parent reliability monitor is platform-admin guarded with trend and recent failure views', () => {
  const pagePath = 'app/admin/parent-reliability/page.tsx'
  assert.equal(exists(pagePath), true, 'Missing admin parent reliability page')

  const pageSource = read(pagePath)
  assert.match(pageSource, /from\('parent_form_submit_failures'\)/)
  assert.match(pageSource, /profile\?\.role !== 'platform_admin'/)
  assert.match(pageSource, /Failure Trend/)
  assert.match(pageSource, /Route Hotspots/)
  assert.match(pageSource, /Failure Types/)
  assert.match(pageSource, /Recent Submit Failures/)
  assert.match(pageSource, /searchParams/)
  assert.match(pageSource, /buildReliabilityHref\('24h'/)
  assert.match(pageSource, /buildReliabilityHref\('7d'/)
  assert.match(pageSource, /clearFiltersHref = buildReliabilityHref\(selectedWindow\)/)
  assert.match(pageSource, /name=\"window\"/)
  assert.match(pageSource, /name=\"route\"/)
  assert.match(pageSource, /name=\"failureType\"/)
  assert.match(pageSource, /Clear filters/)
  assert.match(pageSource, /ilike\('route_path'/)
  assert.match(pageSource, /searchParams\?\.failureType/)
  assert.match(pageSource, /ilike\('failure_type'/)
  assert.match(pageSource, /trendDeltaFromSeries/)
  assert.match(pageSource, /Delta vs previous half/)
  assert.match(pageSource, /First half:/)
  assert.match(pageSource, /Second half:/)
  assert.match(pageSource, /firstHalfTotal === 0/)
  assert.match(pageSource, /secondHalfTotal > 0 \? 100 : 0/)
  assert.match(pageSource, /UP/)
  assert.match(pageSource, /DOWN/)
  assert.match(pageSource, /FLAT/)
  assert.match(pageSource, /Incident Handoff Summary/)
  assert.match(pageSource, /Copy-ready snippet/)
  assert.match(pageSource, /Top route/)
  assert.match(pageSource, /Top failure type/)
  assert.match(pageSource, /Focus Top Route/)
  assert.match(pageSource, /Focus Top Failure Type/)
  assert.match(pageSource, /topRouteHref/)
  assert.match(pageSource, /topFailureTypeHref/)
  assert.match(pageSource, /latestIncidentRouteFilter/)
  assert.match(pageSource, /latestIncidentFailureTypeFilter/)
  assert.match(pageSource, /latestIncidentHref/)
  assert.match(pageSource, /routeFilter:\s*latestIncidentRouteFilter/)
  assert.match(pageSource, /failureTypeFilter:\s*latestIncidentFailureTypeFilter/)
  assert.match(pageSource, /Focus Latest Pair/)
  assert.match(pageSource, /buildReliabilityHref\(selectedWindow,\s*\{/)
  assert.match(pageSource, /routeFilter:\s*item\.route/)
  assert.match(pageSource, /failureTypeFilter:\s*item\.failureType/)
  assert.match(pageSource, /Focus Pair/)
  assert.match(pageSource, /IncidentHandoffActions/)
  assert.match(pageSource, /wa\.me\/\?text=/)

  const handoffActionsPath = 'app/admin/parent-reliability/_components/incident-handoff-actions.tsx'
  assert.equal(exists(handoffActionsPath), true, 'Missing incident handoff actions component')
  const handoffActionsSource = read(handoffActionsPath)
  assert.match(handoffActionsSource, /navigator\.clipboard\.writeText/)
  assert.match(handoffActionsSource, /Copy summary/)
  assert.match(handoffActionsSource, /Copied/)
  assert.match(handoffActionsSource, /Share on WhatsApp/)

  const navSource = read('components/admin/admin-nav.ts')
  const sidebarSource = read('components/admin/admin-sidebar.tsx')
  assert.match(navSource, /\/admin\/parent-reliability/)
  assert.match(sidebarSource, /\/admin\/parent-reliability/)
})

test('Admin dashboard parent audience surfaces reliability severity card with deep-link', () => {
  const dashboardSource = read('app/admin/dashboard/page.tsx')
  assert.match(dashboardSource, /from\('parent_form_submit_failures'\)/)
  assert.match(dashboardSource, /Parent Reliability \(24h\)/)
  assert.match(dashboardSource, /HEALTHY/)
  assert.match(dashboardSource, /WARNING/)
  assert.match(dashboardSource, /CRITICAL/)
  assert.match(dashboardSource, /\/admin\/parent-reliability\?window=24h/)
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
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-011`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-012`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-013`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-014`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-015`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-016`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-017`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-018`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-019`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-020`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-021`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-022`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-023`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-024`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-025`/)
  assert.match(scoreboard, /\[(READY|DONE|ACTIVE)\]\s+`BL-PARENT-026`/)
  assert.match(scoreboard, /\[ACTIVE\]\s+`BL-PARENT-0(09|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26)`/)
})

test('Parent live smoke command and script are wired', () => {
  const pkgRaw = read('package.json')
  const pkg = JSON.parse(pkgRaw)
  assert.ok(pkg.scripts?.['uat:parent:create:live'], 'Missing uat:parent:create:live script')
  assert.ok(pkg.scripts?.['uat:parent:create:dry'], 'Missing uat:parent:create:dry script')
  assert.ok(pkg.scripts?.['test:parent-live'], 'Missing test:parent-live script')
  assert.equal(exists('scripts/run-parent-create-live-smoke.mjs'), true)
})

const report = writeAuditReport()
if (report.summary.failed > 0) {
  process.exitCode = 1
  throw new Error(`Parent portal hard-pass smoke checks failed (${report.summary.failed}/${report.summary.total}).`)
}

console.log('Parent portal hard-pass smoke checks passed.')
