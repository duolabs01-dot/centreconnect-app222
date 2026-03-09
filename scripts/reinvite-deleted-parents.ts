import fs from 'node:fs'
import path from 'node:path'
import { deliverTransactionalEmail } from '../lib/email/delivery'
import { renderParentRejoinEmail } from '../lib/email/templates/parent-rejoin'

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    const value = rest.join('=')
    if (!key || process.env[key]) continue
    process.env[key] = value.replace(/^"|"$/g, '')
  }
}

loadDotEnvLocal()

const supportEmail = process.env.PARENT_SUPPORT_EMAIL ?? 'admin@centerconnect.co.za'
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centerconnect.co.za'

const fileArg = process.env.REJOIN_PARENT_EMAILS_FILE ?? 'tmp/rejoin-parents.json'
const filePath = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(filePath)) {
  console.error(`Missing rejoin list: ${filePath}`)
  process.exit(1)
}

const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))
if (!Array.isArray(rows) || rows.length === 0) {
  console.error('The rejoin list must be a non-empty array of { email, name }.')
  process.exit(1)
}

async function send() {
  for (const entry of rows) {
    if (!entry?.email) continue
    const name = typeof entry.name === 'string' && entry.name.trim().length > 0 ? entry.name : 'Parent'
    const inviteLink = entry.inviteLink || `${appBaseUrl}/register`
    const loginLink = entry.loginLink || `${appBaseUrl}/login`
    const emailData = renderParentRejoinEmail({
      recipientName: name,
      inviteLink,
      loginLink,
      supportEmail,
      appBaseUrl,
    })

    const result = await deliverTransactionalEmail({
      to: entry.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    console.log(`${entry.email}: ${result.deliveryMessage}`)
  }
}

send().catch((error) => {
  console.error('Failed to send rejoin invites:', error)
  process.exit(1)
})
