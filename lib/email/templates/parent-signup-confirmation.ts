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
  const logoUrl = input.logoUrl?.trim() || `${appBaseUrl}/centreconnect-logo-email.png`
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
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Confirm your CentreConnect email to activate your parent account.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:24px;background:linear-gradient(130deg,#ecfeff 0%,#f0fdfa 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:44px;">
                      <img src="${escapeHtml(logoUrl)}" width="36" height="36" alt="CentreConnect" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;" />
                    </td>
                    <td>
                      <p style="margin:0;font-size:16px;line-height:1.2;font-weight:800;color:#0f172a;">CentreConnect</p>
                      <p style="margin:2px 0 0;font-size:11px;line-height:1.2;letter-spacing:0.08em;font-weight:700;color:#0d9488;text-transform:uppercase;">Parent account setup</p>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.2;color:#0f172a;">Welcome, ${escapeHtml(firstName)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">
                  Confirm your email to activate your profile and start applying to creches.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#475569;">
                  Tap the secure button below to confirm your account:
                </p>
                <a href="${escapeHtml(input.confirmationLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:800;font-size:14px;">
                  Confirm email
                </a>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                  <tr>
                    <td style="padding:12px 14px;">
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#475569;">
                        <strong style="color:#0f172a;">What happens next:</strong><br />
                        1. Confirm your email.<br />
                        2. Sign in and complete your child profile.<br />
                        3. Start applying to centres.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  After confirming, sign in here:
                  <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;"> ${escapeHtml(
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
                  Need help? Contact
                  <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0d9488;text-decoration:none;font-weight:700;"> ${escapeHtml(
                    input.supportEmail
                  )}</a>.
                </p>

                <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  By using CentreConnect you agree to our
                  <a href="${escapeHtml(appBaseUrl)}/terms" style="color:#0d9488;text-decoration:none;"> Terms</a>,
                  <a href="${escapeHtml(appBaseUrl)}/privacy" style="color:#0d9488;text-decoration:none;"> Privacy Policy</a>,
                  and
                  <a href="${escapeHtml(appBaseUrl)}/popia-security" style="color:#0d9488;text-decoration:none;"> POPIA and Security approach</a>.
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
