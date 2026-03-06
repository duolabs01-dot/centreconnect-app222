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

  return {
    subject,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(125deg,#ecfeff 0%,#f0fdfa 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                  <tr>
                    <td width="40" valign="middle">
                      <img src="https://centerconnect.co.za/centreconnect-logo.svg" width="32" height="32" alt="CentreConnect" style="display:block;border-radius:8px;" />
                    </td>
                    <td valign="middle">
                      <p style="margin:0;font-size:11px;letter-spacing:0.12em;font-weight:800;text-transform:uppercase;color:#0d9488;">CentreConnect</p>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:#0f172a;">Hi ${escapeHtml(firstName)},</h1>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
                  Your account details are ready. Please activate your account to continue on CentreConnect.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px;">
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569;">
                  Use this secure button to open your details and activate access:
                </p>
                <a href="${escapeHtml(input.activationLink)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:800;border-radius:12px;">
                  Open and Activate Account
                </a>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  After activation, sign in here:
                  <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(
      input.loginLink
    )}</a>
                </p>
                <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  Need help? Contact
                  <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(
      input.supportEmail
    )}</a>.
                </p>
                <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  This link is time-limited. If it expires, ask CentreConnect admin to resend a new activation link.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  }
}
