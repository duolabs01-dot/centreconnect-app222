import { renderBaseEmailLayout } from '../email-layout'

type RoleDowngradeActivationEmailInput = {
  firstName: string
  loginLink: string
  activationLink: string
  supportEmail: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderRoleDowngradeActivationEmail(input: RoleDowngradeActivationEmailInput) {
  const subject = 'Activate your CentreConnect account'
  const firstName = (input.firstName || '').trim() || 'Friend'

  const { html, text } = renderBaseEmailLayout({
    theme: 'ecd',
    recipientName: firstName,
    previewText: 'Activate your CentreConnect account to continue.',
    supportEmail: input.supportEmail,
    heading: `Hi ${firstName},`,
    subheading: 'Your CentreConnect account details are ready. Activate access to continue.',
    children: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">
        Use this secure button to activate your account and continue in CentreConnect.
      </p>
      <a href="${escapeHtml(input.activationLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:800;font-size:15px;">
        Open and activate account
      </a>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
        After activation, sign in here:
        <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(input.loginLink)}</a>
      </p>
      <div style="margin:18px 0 0;padding:16px 18px;border-radius:18px;background:#fff7ed;border:1px solid #fdba74;">
        <p style="margin:0;font-size:13px;line-height:1.7;color:#7c2d12;">
          This secure activation link is time-limited for your safety. If it expires, ask CentreConnect admin to resend a fresh link.
        </p>
      </div>
    `,
  })

  return { subject, html, text }
}
