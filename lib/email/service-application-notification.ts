import 'server-only'
import { sendSmtpMail } from '@/lib/email/smtp'
import { renderBaseEmailLayout } from '@/lib/email/email-layout'
import { ROOT_DOMAIN } from '@/lib/config'

const PRIMARY_RECIPIENT = `admin@${ROOT_DOMAIN}`
const CC_RECIPIENT = 'mandlakevin@gmail.com'

type ServiceApplicationNotificationInput = {
  applicationId: string
  submittedAt: string
  applicantFullName: string
  applicantEmail: string
  applicantPhone?: string | null
  centreName: string
  centrePhone?: string | null
  centreAddress?: string | null
  centreSuburb?: string | null
  centreCity?: string | null
  centreProvince?: string | null
  selectedTier: 'basic' | 'standard' | 'premium'
  recommendedTier: 'basic' | 'standard' | 'premium'
  requestedPlan?: 'pilot' | 'basic' | 'standard' | 'premium'
  monthlyBudget?: number | null
  expectedChildren?: number | null
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text.length > 0 ? text : '-'
}

export async function sendServiceApplicationNotification(input: ServiceApplicationNotificationInput) {
  const subject = `[CentreConnect] New ECD service application - ${input.centreName}`

  const { html, text } = renderBaseEmailLayout({
    theme: 'admin',
    recipientName: 'Mandla',
    previewText: `New service application received from ${input.centreName}.`,
    heading: 'New ECD service application',
    subheading: 'A centre has asked for CentreConnect setup or support.',
    children: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">
        <strong>${display(input.centreName)}</strong> submitted a new service application.
      </p>
      <table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;background:#ffffff;margin:0 0 16px;">
        <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;"><strong>Application ID:</strong> ${display(input.applicationId)}</td></tr>
        <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;"><strong>Submitted at:</strong> ${display(input.submittedAt)}</td></tr>
        <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;"><strong>Applicant:</strong> ${display(input.applicantFullName)} · ${display(input.applicantEmail)} · ${display(input.applicantPhone)}</td></tr>
        <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;"><strong>Centre:</strong> ${display(input.centreName)} · ${display(input.centrePhone)}</td></tr>
        <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;"><strong>Location:</strong> ${display(input.centreAddress)}, ${display(input.centreSuburb)}, ${display(input.centreCity)}, ${display(input.centreProvince)}</td></tr>
        <tr><td style="padding:12px 14px;font-size:13px;color:#0f172a;"><strong>Commercial:</strong> Requested ${display(input.requestedPlan ?? input.selectedTier)} · Selected ${display(input.selectedTier)} · Recommended ${display(input.recommendedTier)} · Budget ${display(input.monthlyBudget)} · Expected children ${display(input.expectedChildren)}</td></tr>
      </table>
    `,
  })

  return await sendSmtpMail({
    to: [PRIMARY_RECIPIENT],
    cc: [CC_RECIPIENT],
    subject,
    text,
    html,
  })
}
