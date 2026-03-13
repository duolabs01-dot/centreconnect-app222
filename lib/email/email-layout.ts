/**
 * Centralized Email Styling and Layout for CentreConnect.
 * One branded shell for transactional mail across parent, ECD, and admin flows.
 */

export type EmailTheme = 'ecd' | 'parent' | 'admin'

type BaseEmailInput = {
  theme: EmailTheme
  recipientName: string
  previewText: string
  logoUrl?: string
  appBaseUrl?: string
  supportEmail?: string
  heading?: string
  subheading?: string
  children: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function resolveFirstName(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] ?? 'there'
}

export function renderBaseEmailLayout(input: BaseEmailInput) {
  const appUrl = (input.appBaseUrl ?? 'https://centerconnect.co.za').replace(/\/$/, '')
  const logoUrl = input.logoUrl?.trim() || `${appUrl}/centreconnect-logo-email.png`
  const supportEmail = (input.supportEmail ?? 'admin@centerconnect.co.za').trim() || 'admin@centerconnect.co.za'
  const firstName = resolveFirstName(input.recipientName)

  const themes = {
    ecd: {
      primary: '#0d9488',
      bg: 'linear-gradient(180deg, #faf8f4 0%, #ffffff 100%)',
      header: 'linear-gradient(135deg, #1a2e1f 0%, #0d9488 100%)',
      chipBg: 'rgba(255,255,255,0.18)',
      chipText: '#ecfeff',
      label: 'CRECHE PORTAL',
    },
    parent: {
      primary: '#0d9488',
      bg: 'linear-gradient(180deg, #faf8f4 0%, #ffffff 100%)',
      header: 'linear-gradient(135deg, #1a2e1f 0%, #0d9488 100%)',
      chipBg: 'rgba(255,255,255,0.18)',
      chipText: '#ecfeff',
      label: 'PARENT PORTAL',
    },
    admin: {
      primary: '#1a2e1f',
      bg: 'linear-gradient(180deg, #faf8f4 0%, #ffffff 100%)',
      header: 'linear-gradient(135deg, #1a2e1f 0%, #0d9488 100%)',
      chipBg: 'rgba(255,255,255,0.14)',
      chipText: '#e2e8f0',
      label: 'PLATFORM ADMIN',
    },
  }

  const activeTheme = themes[input.theme]
  const heading = input.heading?.trim() || `Hey ${firstName}!`
  const subheading =
    input.subheading?.trim() ||
    (input.theme === 'parent'
      ? 'CentreConnect keeps your family organised, informed, and closer to your creche.'
      : input.theme === 'ecd'
        ? 'CentreConnect helps your creche stay organised, trusted, and easier to run.'
        : 'CentreConnect keeps your live operations clear and under control.')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>CentreConnect</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .content-table { max-width: 600px; margin: 0 auto; width: 100%; }
    @media only screen and (max-width: 620px) {
      body { padding: 0 !important; }
      .content-table { width: 100% !important; border-radius: 0 !important; }
      .main-card { border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .content-pad { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="background:${activeTheme.bg};padding:20px 0;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.previewText)}</div>

  <table role="presentation" class="content-table" cellspacing="0" cellpadding="0" align="center">
    <tr>
      <td style="padding:20px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="main-card" style="background-color:#ffffff;border-radius:32px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 24px 48px -18px rgba(15,23,42,0.18);">
          <tr>
            <td style="padding:36px 32px;background:${activeTheme.header};text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:56px;vertical-align:top;">
                    <img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="CentreConnect" style="display:block;background:#ffffff;border-radius:14px;padding:4px;box-shadow:0 10px 20px rgba(15,23,42,0.18);" />
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0;font-size:19px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">CentreConnect</p>
                    <p style="margin:4px 0 0;display:inline-block;padding:6px 10px;border-radius:999px;background:${activeTheme.chipBg};font-size:10px;font-weight:800;color:${activeTheme.chipText};letter-spacing:0.16em;text-transform:uppercase;">${activeTheme.label}</p>
                  </td>
                </tr>
              </table>
              <h1 style="margin:28px 0 8px;font-size:30px;font-weight:900;color:#ffffff;line-height:1.08;letter-spacing:-0.04em;">${escapeHtml(heading)}</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.92);max-width:480px;">${escapeHtml(subheading)}</p>
            </td>
          </tr>

          <tr>
            <td class="content-pad" style="padding:36px 32px 24px;">
              <div style="font-size:16px;line-height:1.7;color:#334155;">
                ${input.children}
              </div>

              <div style="margin-top:32px;padding:18px 18px 0;border-top:1px solid #e2e8f0;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);border-radius:20px;">
                <p style="margin:0 0 10px;font-size:11px;font-weight:800;color:#64748b;letter-spacing:0.14em;text-transform:uppercase;">Need help?</p>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#475569;">
                  Questions? Reply to this email or WhatsApp us. You can also reach the CentreConnect team at
                  <a href="mailto:${escapeHtml(supportEmail)}" style="color:${activeTheme.primary};text-decoration:none;font-weight:800;">${escapeHtml(supportEmail)}</a>.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  This is a transactional CentreConnect email. By using CentreConnect, you agree to our
                  <a href="${escapeHtml(appUrl)}/terms" style="color:${activeTheme.primary};text-decoration:none;">Terms</a>,
                  <a href="${escapeHtml(appUrl)}/privacy" style="color:${activeTheme.primary};text-decoration:none;">Privacy Policy</a>, and
                  <a href="${escapeHtml(appUrl)}/popia-security" style="color:${activeTheme.primary};text-decoration:none;">POPIA & Security approach</a>.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td class="content-pad" style="padding:0 32px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                CentreConnect — serving Alexandra and Johannesburg.<br/>
                &copy; 2026 CentreConnect.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
${heading}

${input.previewText}

Need help? Contact us at ${supportEmail}
Terms: ${appUrl}/terms
Privacy: ${appUrl}/privacy
POPIA & Security: ${appUrl}/popia-security

Built with care in South Africa for families, creches, and communities.
(c) 2026 CentreConnect
  `.trim()

  return { html, text }
}
