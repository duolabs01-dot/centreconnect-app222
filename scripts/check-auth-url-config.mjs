import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const canonicalHost = 'centerconnect.co.za'
const allowedHosts = new Set([canonicalHost, `www.${canonicalHost}`, 'localhost', '127.0.0.1'])

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
    const rawValue = line.slice(idx + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    parsed[key] = value
  }
  return parsed
}

function normalizeUrl(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    return new URL(withProtocol)
  } catch {
    return null
  }
}

function hasBadHost(value) {
  const lower = String(value ?? '').toLowerCase()
  return lower.includes('.vercel.app') || lower.includes('.supabase.co')
}

function checkUrlField(label, value, issues, warnings) {
  if (!value) {
    warnings.push(`${label}: not set (using code fallback)`)
    return null
  }

  if (hasBadHost(value)) {
    issues.push(`${label}: points to non-canonical host (${value})`)
  }

  const parsed = normalizeUrl(value)
  if (!parsed) {
    issues.push(`${label}: invalid URL (${value})`)
    return null
  }

  if (!allowedHosts.has(parsed.hostname)) {
    issues.push(`${label}: host must be ${canonicalHost} (got ${parsed.hostname})`)
  }

  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    issues.push(`${label}: must use https in non-local environments (${parsed.protocol})`)
  }

  return parsed
}

const envFiles = ['.env.local', '.env.production', '.env']
const mergedFileEnv = {}
for (const file of envFiles) {
  Object.assign(mergedFileEnv, parseEnvFile(path.join(root, file)))
}

const env = {
  ...mergedFileEnv,
  ...process.env,
}

const issues = []
const warnings = []

const appUrlRaw = env.NEXT_PUBLIC_APP_URL ?? ''
const emailAppUrlRaw = env.NEXT_PUBLIC_EMAIL_APP_URL ?? ''
const rootDomainRaw = env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''
const siteUrlRaw =
  env.SUPABASE_SITE_URL ??
  env.GOTRUE_SITE_URL ??
  env.SITE_URL ??
  env.AUTH_SITE_URL ??
  ''

const appUrl = checkUrlField('NEXT_PUBLIC_APP_URL', appUrlRaw, issues, warnings)
const emailAppUrl = checkUrlField('NEXT_PUBLIC_EMAIL_APP_URL', emailAppUrlRaw, issues, warnings)
const siteUrl = checkUrlField('SUPABASE/GOTRUE SITE_URL', siteUrlRaw, issues, warnings)

if (!rootDomainRaw) {
  warnings.push('NEXT_PUBLIC_ROOT_DOMAIN: not set (using code fallback centerconnect.co.za)')
} else {
  const normalized = rootDomainRaw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
  if (normalized !== canonicalHost && normalized !== `www.${canonicalHost}`) {
    issues.push(`NEXT_PUBLIC_ROOT_DOMAIN: expected ${canonicalHost}, received ${rootDomainRaw}`)
  }
}

if (appUrl && emailAppUrl && appUrl.hostname !== emailAppUrl.hostname) {
  issues.push(
    `NEXT_PUBLIC_APP_URL (${appUrl.hostname}) and NEXT_PUBLIC_EMAIL_APP_URL (${emailAppUrl.hostname}) must match`
  )
}

if (appUrl && siteUrl && appUrl.hostname !== siteUrl.hostname) {
  issues.push(
    `APP URL (${appUrl.hostname}) and Supabase SITE_URL (${siteUrl.hostname}) should match to avoid bad redirect links`
  )
}

if (issues.length > 0) {
  console.error('Auth URL config check failed:')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  if (warnings.length > 0) {
    console.error('Warnings:')
    for (const warning of warnings) {
      console.error(`- ${warning}`)
    }
  }
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn('Auth URL config warnings:')
  for (const warning of warnings) {
    console.warn(`- ${warning}`)
  }
}

console.log('Auth URL config check passed.')
