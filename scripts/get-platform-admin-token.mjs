import fs from 'node:fs'
import path from 'node:path'

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

function requireValue(env, keys) {
  for (const key of keys) {
    const value = String(env[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function upsertEnvKey(filePath, key, value) {
  const initial = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedKey}=.*$`, 'm')
  const line = `${key}=${value}`

  let next = initial
  if (regex.test(next)) {
    next = next.replace(regex, line)
  } else {
    if (next.length > 0 && !next.endsWith('\n')) next += '\n'
    next += `${line}\n`
  }

  fs.writeFileSync(filePath, next, 'utf8')
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const write = args.has('--write')
  const env = loadMergedEnv()

  const supabaseUrl = requireValue(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'])
  const anonKey = requireValue(env, ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'])
  const email = requireValue(env, ['UAT_PLATFORM_ADMIN_EMAIL', 'PLATFORM_ADMIN_EMAIL'])
  const password = requireValue(env, ['UAT_PLATFORM_ADMIN_PASSWORD', 'PLATFORM_ADMIN_PASSWORD'])

  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)')
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)')
  if (!email) missing.push('UAT_PLATFORM_ADMIN_EMAIL')
  if (!password) missing.push('UAT_PLATFORM_ADMIN_PASSWORD')

  if (missing.length > 0) {
    console.error('Missing required values for platform-admin token fetch:')
    for (const key of missing) console.error(`- ${key}`)
    process.exit(1)
    return
  }

  const tokenUrl = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ email, password }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.access_token) {
    const reason = payload?.error_description || payload?.msg || payload?.error || `HTTP ${response.status}`
    console.error(`Failed to fetch platform admin token: ${reason}`)
    process.exit(1)
    return
  }

  const token = String(payload.access_token)
  const expiresIn = Number(payload.expires_in ?? 0)
  const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : 'unknown'

  console.log('Platform admin token fetched successfully.')
  console.log(`Email: ${email}`)
  console.log(`Expires at: ${expiresAt}`)
  console.log('')
  console.log(`UAT_PLATFORM_ADMIN_TOKEN=${token}`)

  if (write) {
    const envLocalPath = path.join(process.cwd(), '.env.local')
    upsertEnvKey(envLocalPath, 'UAT_PLATFORM_ADMIN_TOKEN', token)
    console.log('')
    console.log(`Updated ${envLocalPath} with UAT_PLATFORM_ADMIN_TOKEN`)
  } else {
    console.log('')
    console.log('Tip: run with --write to store token in .env.local automatically.')
  }
}

main().catch((error) => {
  console.error('Token helper failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
