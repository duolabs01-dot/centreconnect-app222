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

function resolveFirstName(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] ?? 'there'
}

export function renderParentSignupConfirmationEmail(input: ParentSignupConfirmationEmailInput) {
  const subject = 'Confirm your CentreConnect account'
  const appBaseUrl = (input.appBaseUrl ?? 'https://centerconnect.co.za').replace(/\/$/, '')
  const logoUrl = input.logoUrl?.trim() || `${appBaseUrl}/centreconnect-logo.svg`
  const firstName = resolveFirstName(input.recipientName)

  const text = [
    `Hi ${firstName},`,
    '',
    'Thanks for creating your CentreConnect parent account.',
    'Confirm your email to activate your profile and start applying to ECD centres:',
    input.confirmationLink,
    '',
    `After confirmation, sign in here: ${input.loginLink}`,
    `Need help? ${input.supportEmail}`,
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:28px 28px 16px;background:linear-gradient(135deg,#ecfeff,#f0fdfa);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                  <tr>
                    <td valign="middle">
                      <img src="${escapeHtml(logoUrl)}" width="36" height="36" alt="CentreConnect" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;" />
                    </td>
                    <td valign="middle" style="padding-left:10px;">
                      <p style="margin:0;font-size:16px;line-height:1.2;font-weight:800;color:#0f172a;">CentreConnect</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;font-weight:800;color:#0d9488;text-transform:uppercase;">Parent Account Setup</p>
                <h1 style="margin:12px 0 8px;font-size:26px;line-height:1.2;color:#0f172a;">Welcome, ${escapeHtml(firstName)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">
                  Confirm your email to activate your CentreConnect profile and start applying to centres.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 26px;">
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569;">
                  Use this secure link to confirm your account:
                </p>
                <a href="${escapeHtml(input.confirmationLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:800;font-size:14px;">
                  Confirm Email
                </a>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  After confirming, sign in here: <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(
                    input.loginLink
                  )}</a>
                </p>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button does not open, copy this link into your browser:<br />
                  <a href="${escapeHtml(input.confirmationLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;word-break:break-all;">${escapeHtml(
                    input.confirmationLink
                  )}</a>
                </p>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  Need help? Contact <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(
                    input.supportEmail
                  )}</a>.
                </p>
                <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  By using CentreConnect you agree to our <a href="${escapeHtml(appBaseUrl)}/terms" style="color:#0d9488;text-decoration:none;">Terms</a>,
                  <a href="${escapeHtml(appBaseUrl)}/privacy" style="color:#0d9488;text-decoration:none;">Privacy Policy</a>,
                  and <a href="${escapeHtml(appBaseUrl)}/popia-security" style="color:#0d9488;text-decoration:none;">POPIA & Security approach</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return {
    subject,
    html,
    text,
  }
}
