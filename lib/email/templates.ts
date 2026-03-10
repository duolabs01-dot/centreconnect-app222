import { renderBaseEmailLayout, resolveFirstName } from '@/lib/email/email-layout'

export function applicationStatusEmail({
  parentName,
  childName,
  centreName,
  newStatus,
  appUrl,
}: {
  parentName: string
  childName: string
  centreName: string
  newStatus: string
  appUrl: string
}): { subject: string; html: string; text: string } {
  const statusLabels: Record<string, string> = {
    in_review: 'is now in review',
    approved: 'has been approved',
    enrolled: 'is now enrolled',
    waitlisted: 'is currently on the waitlist',
    rejected: 'was not successful this time',
  }
  const label = statusLabels[newStatus] ?? `has been updated to: ${newStatus}`

  const subject =
    newStatus === 'approved'
      ? `${centreName}: ${childName}'s application was approved`
      : newStatus === 'enrolled'
        ? `${childName} is enrolled at ${centreName}`
        : `${centreName} shared an update about ${childName}`

  const { html, text } = renderBaseEmailLayout({
    theme: 'parent',
    recipientName: parentName,
    previewText: `${centreName} shared an update about ${childName}.`,
    appBaseUrl: appUrl,
    heading: `${childName}'s application update`,
    subheading: `Your family now gets important centre updates in one calm, trusted place.`,
    children: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">
        Hi ${resolveFirstName(parentName)},
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
        <strong>${childName}</strong>'s application <strong>${label}</strong> at <strong>${centreName}</strong>.
      </p>
      <div style="margin:0 0 18px;padding:16px 18px;border-radius:18px;background:#f0f9ff;border:1px solid #dbeafe;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#0f172a;">
          Open CentreConnect to see the latest details, next steps, and any message from the creche.
        </p>
      </div>
      <a href="${appUrl}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:800;font-size:15px;">
        View application
      </a>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
        You received this because you have an application on CentreConnect.
      </p>
    `,
  })

  return { subject, html, text }
}

type ParentWelcomeBackEmailInput = {
  recipientName: string
  inviteLink: string
  supportEmail: string
  appBaseUrl?: string
  logoUrl?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderParentWelcomeBackEmail(input: ParentWelcomeBackEmailInput) {
  const subject = 'Welcome back to CentreConnect!'
  const appBaseUrl = (input.appBaseUrl ?? 'https://centerconnect.co.za').replace(/\/$/, '')

  const { html, text } = renderBaseEmailLayout({
    theme: 'parent',
    recipientName: input.recipientName,
    previewText: 'CentreConnect is ready again. Confirm your account and come back in one tap.',
    appBaseUrl,
    logoUrl: input.logoUrl,
    supportEmail: input.supportEmail,
    heading: `Welcome back, ${resolveFirstName(input.recipientName)}!`,
    subheading: 'Your family profile, documents, and creche applications are ready for you again.',
    children: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
        We are glad to have you back. CentreConnect helps you keep your child's documents, applications,
        updates, and parent communication in one place.
      </p>
      <div style="margin:0 0 18px;padding:16px 18px;border-radius:18px;background:#f0f9ff;border:1px solid #dbeafe;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:800;color:#0369a1;letter-spacing:0.08em;text-transform:uppercase;">What is better for parents now</p>
        <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#334155;">
          <li>Keep one digital parent profile for multiple CentreConnect creches.</li>
          <li>Reuse documents instead of uploading the same paperwork again.</li>
          <li>Get updates, reminders, and application progress from your phone.</li>
        </ul>
      </div>
      <a href="${escapeHtml(input.inviteLink)}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:800;font-size:15px;">
        Confirm and open my account
      </a>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
        If the button does not work, copy this link into your browser:<br/>
        <a href="${escapeHtml(input.inviteLink)}" style="color:#0891b2;word-break:break-all;text-decoration:none;">${escapeHtml(input.inviteLink)}</a>
      </p>
    `,
  })

  return { subject, html, text }
}
