import 'server-only'
import { sendSmtpMail } from '@/lib/email/smtp'
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
  const body = [
    'A new ECD service application was submitted on CentreConnect.',
    '',
    `Application ID: ${input.applicationId}`,
    `Submitted At: ${input.submittedAt}`,
    '',
    'Applicant',
    `- Name: ${display(input.applicantFullName)}`,
    `- Email: ${display(input.applicantEmail)}`,
    `- Phone: ${display(input.applicantPhone)}`,
    '',
    'Centre',
    `- Name: ${display(input.centreName)}`,
    `- Phone: ${display(input.centrePhone)}`,
    `- Address: ${display(input.centreAddress)}`,
    `- Suburb: ${display(input.centreSuburb)}`,
    `- City: ${display(input.centreCity)}`,
    `- Province: ${display(input.centreProvince)}`,
    '',
    'Commercial',
    `- Requested plan: ${display(input.requestedPlan ?? input.selectedTier)}`,
    `- Selected tier: ${input.selectedTier}`,
    `- Recommended tier: ${input.recommendedTier}`,
    `- Monthly budget: ${display(input.monthlyBudget)}`,
    `- Expected children: ${display(input.expectedChildren)}`,
  ].join('\n')

  return await sendSmtpMail({
    to: [PRIMARY_RECIPIENT],
    cc: [CC_RECIPIENT],
    subject,
    text: body,
  })
}
