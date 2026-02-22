import 'server-only'
import { sendSmtpMail } from '@/lib/email/smtp'

const PRIMARY_RECIPIENT = 'admin@centreconnect.co.za'
const CC_RECIPIENT = 'mandlakevin@gmail.com'

type PlatformAdminActionNotificationInput = {
  subject: string
  heading: string
  lines?: string[]
  details?: Record<string, unknown>
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
    to: [PRIMARY_RECIPIENT],
    cc: [CC_RECIPIENT],
    subject: `[CentreConnect Admin] ${input.subject}`,
    text: body,
  })
}
