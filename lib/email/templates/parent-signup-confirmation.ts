import { renderBaseEmailLayout } from '../email-layout'

type ParentSignupConfirmationEmailInput = {
  recipientName: string
  confirmationLink: string
  loginLink: string
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

export function renderParentSignupConfirmationEmail(input: ParentSignupConfirmationEmailInput) {
  const subject = 'Confirm your CentreConnect account 🚀'
  const appBaseUrl = (input.appBaseUrl ?? 'https://centerconnect.co.za').replace(/\/$/, '')
  
  const htmlContent = `
    <p style="margin: 0 0 24px; font-size: 16px; font-weight: 500; color: #334155;">
      Thanks for joining CentreConnect! We're excited to help you find the best care for your little one.
    </p>
    
    <p style="margin: 0 0 32px; font-size: 15px; color: #475569;">
      Please tap the button below to confirm your email and activate your parent profile:
    </p>

    <a href="${escapeHtml(input.confirmationLink)}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 16px; font-weight: 900; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(8, 145, 178, 0.2);">
      Confirm Email & Activate
    </a>

    <div style="margin-top: 40px; padding: 24px; background: #f0f9ff; border-radius: 20px; border: 1px solid #e0f2fe;">
      <p style="margin: 0; font-size: 14px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em;">What happens next:</p>
      <ul style="margin: 12px 0 0; padding: 0 0 0 20px; font-size: 14px; color: #334155; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Complete your child's digital profile.</li>
        <li style="margin-bottom: 8px;">Explore trusted creches in your area.</li>
        <li>Apply to any centre with a single tap.</li>
      </ul>
    </div>

    <p style="margin: 32px 0 0; font-size: 13px; color: #64748b;">
      If the button above doesn't work, copy and paste this link into your browser:<br/>
      <a href="${escapeHtml(input.confirmationLink)}" style="color: #0891b2; word-break: break-all;">${escapeHtml(input.confirmationLink)}</a>
    </p>
  `

  const { html, text } = renderBaseEmailLayout({
    theme: 'parent',
    recipientName: input.recipientName,
    previewText: 'Confirm your CentreConnect email to activate your parent account.',
    appBaseUrl: input.appBaseUrl,
    logoUrl: input.logoUrl,
    children: htmlContent
  })

  return {
    subject,
    html,
    text,
  }
}
