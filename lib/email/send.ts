import { sendSmtpMail } from '@/lib/email/smtp'

export type DirectEmailProvider = 'smtp'
export type DirectEmailEligibility = {
  allowed: boolean
  reason: string | null
}

function toPlainTextEmail(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a[^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function shouldAttemptDirectEmailForRecipient(to: string): DirectEmailEligibility {
  const recipient = to.trim().toLowerCase()
  if (!recipient) {
    return { allowed: false, reason: 'Recipient email missing' }
  }

  const hasSmtpConfig = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM?.trim()
  )

  if (!hasSmtpConfig) {
    return {
      allowed: false,
      reason: 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
    }
  }

  return { allowed: true, reason: null }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ success: boolean; error?: string; messageId?: string | null; provider?: DirectEmailProvider | null }> {
  const eligibility = shouldAttemptDirectEmailForRecipient(to)
  if (!eligibility.allowed) {
    if (eligibility.reason) {
      console.warn('[email] SMTP skipped:', eligibility.reason)
    }
    return {
      success: false,
      error: eligibility.reason ?? 'SMTP not allowed for this recipient',
      messageId: null,
      provider: null,
    }
  }

  const recipient = to.trim().toLowerCase()
  const result = await sendSmtpMail({
    to: [recipient],
    subject,
    text: text?.trim() || toPlainTextEmail(html),
    html,
  })

  if (!result.ok) {
    console.error('[email] SMTP error:', result.error)
    return {
      success: false,
      error: result.error ?? 'SMTP delivery failed',
      messageId: null,
      provider: null,
    }
  }

  return {
    success: true,
    messageId: null,
    provider: 'smtp',
  }
}
