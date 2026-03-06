export type ResendEligibility = {
  allowed: boolean
  reason: string | null
}

function parseAllowList(value: string | undefined) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function shouldAttemptResendForRecipient(to: string): ResendEligibility {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { allowed: false, reason: 'RESEND_API_KEY not set' }
  }

  const from = (process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev').toLowerCase()
  if (!from.endsWith('@resend.dev')) {
    return { allowed: true, reason: null }
  }

  const recipient = to.trim().toLowerCase()
  const allowedRecipients = parseAllowList(process.env.RESEND_TEST_RECIPIENTS)
  if (allowedRecipients.length > 0 && allowedRecipients.includes(recipient)) {
    return { allowed: true, reason: null }
  }

  return {
    allowed: false,
    reason:
      'RESEND_FROM uses @resend.dev test mode; set RESEND_TEST_RECIPIENTS or verify your sender domain in Resend.',
  }
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string; messageId?: string | null }> {
  const eligibility = shouldAttemptResendForRecipient(to)
  if (!eligibility.allowed) {
    if (eligibility.reason) {
      console.warn('[email] Resend skipped:', eligibility.reason)
    }
    return {
      success: false,
      error: eligibility.reason ?? 'Resend not allowed for this recipient',
      messageId: null,
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev'
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[email] Resend error:', error)
    return { success: false, error, messageId: null }
  }

  const payload = (await response.json().catch(() => ({}))) as { id?: string }
  return { success: true, messageId: payload.id ?? null }
}
