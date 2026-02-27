import 'server-only'
import { sendSmtpMail } from '@/lib/email/smtp'
import { ROOT_DOMAIN } from '@/lib/config'

const PRIMARY_RECIPIENT = `admin@${ROOT_DOMAIN}`
const CC_RECIPIENT = 'mandlakevin@gmail.com'

type PlatformAdminActionNotificationInput = {
  subject: string
  heading: string
  lines?: string[]
  details?: Record<string, unknown>
  recipientEmail?: string // Added recipientEmail
}

function display(value: unknown) {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text.length > 0 ? text : '-'
}

function formatDetails(details?: Record<string, unknown>) {
  if (!details || Object.keys(details).length === 0) return []
  const rows = Object.entries(details).map(([key, value]) => `- ${key}: ${display(Array.isArray(value) ? value.join(', ') : value)}`)
  return ['Details', ...rows]
}

export async function sendPlatformAdminActionNotification(input: PlatformAdminActionNotificationInput) {
  const body = [input.heading, '', ...(input.lines ?? []), ...(input.lines?.length ? [''] : []), ...formatDetails(input.details)].join('\n')

  return await sendSmtpMail({
    to: input.recipientEmail ? [input.recipientEmail] : [PRIMARY_RECIPIENT], // Use recipientEmail if provided, otherwise default
    cc: input.recipientEmail ? [PRIMARY_RECIPIENT, CC_RECIPIENT] : [CC_RECIPIENT], // Adjust CC logic
    subject: `[CentreConnect Admin] ${input.subject}`,
    text: body,
  })
}
