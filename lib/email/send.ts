export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set')
    return { success: false, error: 'RESEND_API_KEY not set' }
  }

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
    return { success: false, error }
  }

  return { success: true }
}
