import 'server-only'

import { ROOT_DOMAIN } from '@/lib/config'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { renderBaseEmailLayout } from '@/lib/email/email-layout'

const PRIMARY_RECIPIENT = `admin@${ROOT_DOMAIN}`
const CC_RECIPIENT = 'mandlakevin@gmail.com'

type PlatformAdminActionNotificationInput = {
  subject: string
  heading: string
  lines?: string[]
  details?: Record<string, unknown>
  recipientEmail?: string
}

function display(value: unknown) {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text.length > 0 ? text : '-'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatLine(line: string) {
  return `<li style="margin:0 0 10px;line-height:1.6;color:#334155;">${escapeHtml(line)}</li>`
}

function formatDetailRow(key: string, value: unknown) {
  const renderedValue = Array.isArray(value) ? value.join(', ') : display(value)
  return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">${escapeHtml(key)}</td>
      <td style="padding:8px 0 8px 16px;color:#0f172a;font-size:13px;font-weight:700;vertical-align:top;">${escapeHtml(renderedValue)}</td>
    </tr>
  `
}

function buildHtml(input: PlatformAdminActionNotificationInput) {
  const lines = input.lines ?? []
  const details = input.details ?? {}
  const detailsRows = Object.entries(details)
    .map(([key, value]) => formatDetailRow(key, value))
    .join('')

  const content = `
    <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:#0f172a;">
      ${escapeHtml(input.heading)}
    </p>
    ${
      lines.length > 0
        ? `<ul style="margin:0 0 22px;padding-left:20px;">${lines.map(formatLine).join('')}</ul>`
        : ''
    }
    ${
      detailsRows
        ? `
          <div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:20px;background:#f8fafc;padding:18px 20px;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">
              Details
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${detailsRows}
            </table>
          </div>
        `
        : ''
    }
    <p style="margin:22px 0 0;font-size:13px;line-height:1.65;color:#64748b;">
      You are receiving this because founder visibility is enabled for CentreConnect admin and growth milestones.
    </p>
  `

  return renderBaseEmailLayout({
    theme: 'admin',
    recipientName: 'Platform Admin',
    previewText: input.heading,
    children: content,
  })
}

async function deliverNotification(recipient: string, subject: string, html: string) {
  const result = await deliverTransactionalEmail({
    to: recipient,
    subject,
    html,
  })

  if (result.directSent) {
    return {
      ok: true as const,
      channel: result.directProvider ?? 'direct',
      error: null as string | null,
    }
  }

  return {
    ok: false as const,
    channel: result.status === 'queued' ? 'queued' : 'failed',
    error: result.deliveryMessage,
  }
}

type NotificationResult = {
  recipient: string
  ok: boolean
  channel: string
  error: string | null
}

export async function sendPlatformAdminActionNotification(input: PlatformAdminActionNotificationInput) {
  const recipients = Array.from(
    new Set([input.recipientEmail ?? PRIMARY_RECIPIENT, PRIMARY_RECIPIENT, CC_RECIPIENT].filter(Boolean))
  )
  const subject = `[CentreConnect Admin] ${input.subject}`
  const { html } = buildHtml(input)

  const results: NotificationResult[] = []
  for (const recipient of recipients) {
    results.push({
      recipient,
      ...(await deliverNotification(recipient, subject, html)),
    })
  }

  const failed = results.filter((result) => !result.ok)
  return {
    ok: failed.length === 0,
    results,
    error: failed.length > 0 ? failed.map((result) => `${result.recipient}: ${result.error}`).join(' | ') : null,
  }
}
