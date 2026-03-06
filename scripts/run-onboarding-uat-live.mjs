import fs from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run') || String(process.env.UAT_DRY_RUN ?? '').trim() === '1'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    parsed[key] = value
  }
  return parsed
}

function loadMergedEnv() {
  const root = process.cwd()
  const fileEnv = {
    ...parseEnvFile(path.join(root, '.env')),
    ...parseEnvFile(path.join(root, '.env.local')),
  }
  return {
    ...fileEnv,
    ...process.env,
  }
}

const env = loadMergedEnv()

const BASE_URL = String(
  env.UAT_BASE_URL ??
    env.NEXT_PUBLIC_APP_URL ??
    'https://centerconnect.co.za'
).replace(/\/+$/, '')
let adminToken = String(
  env.UAT_PLATFORM_ADMIN_TOKEN ??
    env.PLATFORM_ADMIN_BEARER_TOKEN ??
    ''
).trim()
const ECD_ID = String(env.UAT_ECD_ID ?? '').trim()
const SUPABASE_URL = String(env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? '').trim()
const SUPABASE_ANON_KEY = String(env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? '').trim()
const PLATFORM_ADMIN_EMAIL = String(env.UAT_PLATFORM_ADMIN_EMAIL ?? env.PLATFORM_ADMIN_EMAIL ?? '').trim()
const PLATFORM_ADMIN_PASSWORD = String(env.UAT_PLATFORM_ADMIN_PASSWORD ?? env.PLATFORM_ADMIN_PASSWORD ?? '').trim()

const matrix = [
  {
    key: 'new_email_as_ecd_admin',
    email: String(env.UAT_NEW_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_admin',
  },
  {
    key: 'existing_parent_as_ecd_staff',
    email: String(env.UAT_EXISTING_PARENT_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_staff',
  },
  {
    key: 'existing_parent_as_ecd_admin',
    email: String(env.UAT_EXISTING_PARENT_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_admin',
  },
  {
    key: 'existing_ecd_as_ecd_admin',
    email: String(env.UAT_EXISTING_ECD_EMAIL ?? '').trim().toLowerCase(),
    role: 'ecd_admin',
  },
]

function requiredEnvCheck() {
  const missing = []
  if (!ECD_ID) missing.push('UAT_ECD_ID')
  if (
    !adminToken &&
    (!SUPABASE_URL || !SUPABASE_ANON_KEY || !PLATFORM_ADMIN_EMAIL || !PLATFORM_ADMIN_PASSWORD)
  ) {
    missing.push('UAT_PLATFORM_ADMIN_TOKEN (or UAT_PLATFORM_ADMIN_EMAIL/UAT_PLATFORM_ADMIN_PASSWORD with Supabase URL+anon key)')
  }
  if (!matrix[0].email) missing.push('UAT_NEW_EMAIL')
  if (!matrix[1].email) missing.push('UAT_EXISTING_PARENT_EMAIL')
  if (!matrix[3].email) missing.push('UAT_EXISTING_ECD_EMAIL')
  return missing
}

function toSummary(result) {
  if (!result) return 'skipped'
  return `${result.httpStatus} ${result.ok ? 'OK' : 'FAILED'} | ${result.emailDeliveryStatus ?? 'n/a'}`
}

function canRefreshAdminToken() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && PLATFORM_ADMIN_EMAIL && PLATFORM_ADMIN_PASSWORD)
}

async function fetchAdminToken() {
  if (!canRefreshAdminToken()) {
    return { ok: false, error: 'Missing Supabase auth credentials for token refresh.' }
  }

  const tokenUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.access_token) {
    return {
      ok: false,
      error:
        payload?.error_description ??
        payload?.error ??
        payload?.msg ??
        `Token refresh failed with HTTP ${response.status}`,
    }
  }

  return {
    ok: true,
    token: String(payload.access_token),
  }
}

async function postInvite({ email, role, token }) {
  const url = `${BASE_URL}/api/internal/platform-admin/invitations`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  let refreshedTokenDuringRun = false

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

  if (!dryRun && !adminToken && canRefreshAdminToken()) {
    const refreshed = await fetchAdminToken()
    if (refreshed.ok) {
      adminToken = refreshed.token
      refreshedTokenDuringRun = true
    }
  }

  const report = {
    startedAt,
    mode: dryRun ? 'dry-run' : 'live',
    baseUrl: BASE_URL,
    ecdId: ECD_ID,
    tokenRefresh: {
      attempted: false,
      succeeded: refreshedTokenDuringRun,
    },
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

    let result = await postInvite({
      ...scenario,
      token: adminToken,
    })

    if ((result.httpStatus === 401 || result.httpStatus === 403) && canRefreshAdminToken()) {
      report.tokenRefresh.attempted = true
      const refreshed = await fetchAdminToken()
      if (refreshed.ok) {
        adminToken = refreshed.token
        refreshedTokenDuringRun = true
        report.tokenRefresh.succeeded = true
        result = await postInvite({
          ...scenario,
          token: adminToken,
        })
      }
    }

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
