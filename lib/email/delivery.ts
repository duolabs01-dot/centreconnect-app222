import 'server-only'

import { queueEmail } from '@/lib/communications/emails'
import { sendEmail, shouldAttemptDirectEmailForRecipient } from '@/lib/email/send'

export type EmailDeliveryStatus = 'sent' | 'queued' | 'failed'
export type EmailDirectProvider = 'smtp' | null

export type DeliverTransactionalEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
  requireDirectDelivery?: boolean
}

export type DeliverTransactionalEmailResult = {
  status: EmailDeliveryStatus
  directSent: boolean
  directProvider: EmailDirectProvider
  directMessageId: string | null
  directErrors: string[]
  directNotes: string[]
  queueSuccess: boolean
  queueError: string | null
  queueMessageId: string | null
  deliveryMessage: string
}

export function toPlainTextEmail(html: string) {
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

export async function deliverTransactionalEmail(
  input: DeliverTransactionalEmailInput
): Promise<DeliverTransactionalEmailResult> {
  const recipient = input.to.trim().toLowerCase()
  const subject = input.subject.trim()
  const html = input.html

  let directSent = false
  let directProvider: EmailDirectProvider = null
  let directMessageId: string | null = null
  const directErrors: string[] = []
  const directNotes: string[] = []

  const directEligibility = shouldAttemptDirectEmailForRecipient(recipient)
  if (directEligibility.allowed) {
    const directResult = await sendEmail({
      to: recipient,
      subject,
      html,
      text: input.text ?? toPlainTextEmail(html),
    })
    if (directResult.success) {
      directSent = true
      directProvider = directResult.provider ?? 'smtp'
      directMessageId = directResult.messageId ?? null
    } else if (directResult.error) {
      directErrors.push(`SMTP: ${directResult.error}`)
    }
  } else if (directEligibility.reason) {
    directNotes.push(`Direct email skipped: ${directEligibility.reason}`)
  }

  const queueAllowed = !input.requireDirectDelivery
  const queueResult = directSent
    ? { success: true, skipped: true }
    : queueAllowed
      ? await queueEmail(recipient, subject, html)
      : { success: false, skipped: true, error: 'Direct delivery required for this email.' }
  const queueMessageId =
    !directSent &&
    queueResult.success &&
    'data' in queueResult &&
    Array.isArray(queueResult.data)
      ? String(queueResult.data[0]?.id ?? '').trim() || null
      : null

  const diagnostics = [...directNotes, ...directErrors].join(' | ')
  const queueError = !queueResult.success && 'error' in queueResult ? queueResult.error ?? 'unknown' : null
  const status = directSent ? 'sent' : queueAllowed && queueResult.success ? 'queued' : 'failed'
  const deliveryMessage =
    status === 'sent'
      ? `Email sent via ${directProvider ?? 'direct provider'}.`
      : status === 'queued'
        ? `Email queued only. ${
            diagnostics.length > 0 ? diagnostics : 'No direct email provider succeeded.'
          } Queueing does not confirm delivery.`
        : `Email delivery failed. ${
            diagnostics.length > 0 ? diagnostics : 'No direct email provider succeeded.'
          }${
            queueAllowed
              ? queueError
                ? ` Queue error: ${queueError}`
                : ''
              : ' Direct delivery is required for this email.'
          }`

  return {
    status,
    directSent,
    directProvider,
    directMessageId,
    directErrors,
    directNotes,
    queueSuccess: queueResult.success,
    queueError: queueError ?? 'Queue unavailable.',
    queueMessageId,
    deliveryMessage,
  }
}
