import { renderBaseEmailLayout } from '../email-layout'

type StaffInviteTemplateInput = {
  centreName: string
  recipientName: string
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
  accessLink: string
  loginLink: string
  supportEmail: string
  passwordSetupLink?: string | null
  accessMode?: 'invite' | 'magiclink'
  logoUrl?: string
  appBaseUrl?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function roleLabel(role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff') {
  if (role === 'ecd_admin') return 'ECD Admin'
  if (role === 'ecd_supervisor') return 'ECD Supervisor'
  return 'ECD Staff'
}

export function renderStaffInviteEmail(input: StaffInviteTemplateInput) {
  const subject = `You have been invited to ${input.centreName} on CentreConnect`
  const appBaseUrl = (input.appBaseUrl ?? 'https://centerconnect.co.za').replace(/\/$/, '')
  const accessLabel = input.accessMode === 'magiclink' ? 'Sign in securely' : 'Open invite link'

  const { html, text } = renderBaseEmailLayout({
    theme: 'ecd',
    recipientName: input.recipientName,
    previewText: `You have been invited to join ${input.centreName} on CentreConnect.`,
    appBaseUrl,
    logoUrl: input.logoUrl,
    supportEmail: input.supportEmail,
    heading: `You have been invited to ${input.centreName}`,
    subheading: 'Use this secure link to activate your creche workspace access.',
    children: `
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">
        You have been invited to join <strong>${escapeHtml(input.centreName)}</strong> as <strong>${escapeHtml(
          roleLabel(input.role)
        )}</strong>.
      </p>
      <div style="margin:0 0 18px;padding:16px 18px;border-radius:18px;background:#f0fdfa;border:1px solid #ccfbf1;">
        <p style="margin:0;font-size:14px;line-height:1.7;color:#134e4a;">
          CentreConnect helps your creche manage child records, parent communication, attendance, and daily work in one calm place.
        </p>
      </div>
      <a href="${escapeHtml(input.accessLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:800;font-size:15px;">
        ${accessLabel}
      </a>
      ${
        input.passwordSetupLink
          ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
               Prefer to set a password first? <a href="${escapeHtml(input.passwordSetupLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">Create or reset your password</a>.
             </p>`
          : ''
      }
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
        After setup, sign in any time here:
        <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(input.loginLink)}</a>
      </p>
    `,
  })

  return { subject, html, text }
}
