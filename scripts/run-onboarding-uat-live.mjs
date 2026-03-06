import fs from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run') || String(process.env.UAT_DRY_RUN ?? '').trim() === '1'

const BASE_URL = String(
  process.env.UAT_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://centerconnect.co.za'
).replace(/\/+$/, '')
const ADMIN_TOKEN = String(
  process.env.UAT_PLATFORM_ADMIN_TOKEN ??
    process.env.PLATFORM_ADMIN_BEARER_TOKEN ??
    ''
).trim()
const ECD_ID = String(process.env.UAT_ECD_ID ?? '').trim()

const matrix = [
  {
    key: 'new_email_as_ecd_admin',
    email: String(process.env.UAT_NEW_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_admin',
  },
  {
    key: 'existing_parent_as_ecd_staff',
    email: String(process.env.UAT_EXISTING_PARENT_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_staff',
  },
  {
    key: 'existing_parent_as_ecd_admin',
    email: String(process.env.UAT_EXISTING_PARENT_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_admin',
  },
  {
    key: 'existing_ecd_as_ecd_admin',
    email: String(process.env.UAT_EXISTING_ECD_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_admin',
  },
]

function requiredEnvCheck() {
  const missing = []
  if (!ECD_ID) missing.push('UAT_ECD_ID')
  if (!ADMIN_TOKEN) missing.push('UAT_PLATFORM_ADMIN_TOKEN')
  if (!matrix[0].email) missing.push('UAT_NEW_EMAIL')
  if (!matrix[1].email) missing.push('UAT_EXISTING_PARENT_EMAIL')
  if (!matrix[3].email) missing.push('UAT_EXISTING_ECD_EMAIL')
  return missing
}

function toSummary(result) {
  if (!result) return 'skipped'
  return `${result.httpStatus} ${result.ok ? 'OK' : 'FAILED'} | ${result.emailDeliveryStatus ?? 'n/a'}`
}

async function postInvite({ email, role }) {
  const url = `${BASE_URL}/api/internal/platform-admin/invitations`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({
      ecdId: ECD_ID,
      email,
      role,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  return {
    ok: response.ok,
    httpStatus: response.status,
    payload,
    emailDeliveryStatus: payload?.emailDeliveryStatus ?? null,
    linkedExistingUser: Boolean(payload?.linkedExistingUser),
    pendingLinkOnNextLogin: Boolean(payload?.pendingLinkOnNextLogin),
    parentAccessRevoked: Boolean(payload?.parentAccessRevoked),
    error: payload?.error ?? null,
  }
}

async function run() {
  const startedAt = new Date().toISOString()
  const missing = requiredEnvCheck()

  if (missing.length > 0) {
    const channel = dryRun ? console.warn : console.error
    channel('Missing required env vars for onboarding UAT matrix:')
    for (const key of missing) channel(`- ${key}`)
    if (!dryRun) {
      process.exitCode = 1
    } else {
      console.log('Dry-run mode: no network calls were made.')
    }
    return
  }

  const report = {
    startedAt,
    mode: dryRun ? 'dry-run' : 'live',
    baseUrl: BASE_URL,
    ecdId: ECD_ID,
    scenarios: [],
    summary: {
      total: matrix.length,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
  }

  for (const scenario of matrix) {
    if (!scenario.email) {
      report.scenarios.push({
        key: scenario.key,
        role: scenario.role,
        email: '',
        skipped: true,
        reason: 'email_not_provided',
      })
      report.summary.skipped += 1
      continue
    }

    if (dryRun) {
      report.scenarios.push({
        key: scenario.key,
        role: scenario.role,
        email: scenario.email,
        skipped: true,
        reason: 'dry_run',
      })
      report.summary.skipped += 1
      continue
    }

    const result = await postInvite(scenario)
    report.scenarios.push({
      key: scenario.key,
      role: scenario.role,
      email: scenario.email,
      ...result,
    })

    if (result.ok) report.summary.passed += 1
    else report.summary.failed += 1
  }

  const endedAt = new Date().toISOString()
  report.endedAt = endedAt
  report.durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime()

  const outDir = path.join(process.cwd(), 'tmp')
  fs.mkdirSync(outDir, { recursive: true })
  const fileName = `onboarding-uat-report-${Date.now()}.json`
  const outPath = path.join(outDir, fileName)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')

  console.log(`Onboarding UAT ${report.mode} completed.`)
  console.log(`Report: ${outPath}`)
  for (const scenario of report.scenarios) {
    const summary = scenario.skipped ? `SKIPPED (${scenario.reason})` : toSummary(scenario)
    console.log(`- ${scenario.key}: ${summary}`)
  }

  if (!dryRun && report.summary.failed > 0) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error('Onboarding UAT runner failed:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
