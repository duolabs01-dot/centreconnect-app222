/**
 * Centralized Email Styling and Layout for CentreConnect
 * Follows the "Stitch" design standard: Soft gradients, rounded-2xl, high trust.
 */

export type EmailTheme = 'ecd' | 'parent' | 'admin'

type BaseEmailInput = {
  theme: EmailTheme
  recipientName: string
  previewText: string
  logoUrl?: string
  appBaseUrl?: string
  children: string // HTML content
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
  const firstName = resolveFirstName(input.recipientName)
  
  // Theme-based colors
  const themes = {
    ecd: {
      primary: '#0d9488', // Teal 600
      bg: 'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%)',
      header: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
      label: 'ECD PORTAL'
    },
    parent: {
      primary: '#0891b2', // Cyan 600
      bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      header: 'linear-gradient(135deg, #0891b2 0%, #0ea5e9 100%)',
      label: 'PARENT PORTAL'
    },
    admin: {
      primary: '#0f172a', // Slate 900
      bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      header: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      label: 'PLATFORM ADMIN'
    }
  }

  const activeTheme = themes[input.theme]

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>CentreConnect</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .content-table { max-width: 600px; margin: 0 auto; width: 100%; }
    @media only screen and (max-width: 620px) {
      .content-table { width: 100% !important; border-radius: 0 !important; }
      .main-card { border-radius: 0 !important; border: none !important; }
    }
  </style>
</head>
<body style="background-color: #f8fafc; padding: 20px 0;">
  <div style="display:none; max-height:0; overflow:hidden;">${escapeHtml(input.previewText)}</div>
  
  <table role="presentation" class="content-table" cellspacing="0" cellpadding="0" align="center">
    <tr>
      <td style="padding: 20px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="main-card" style="background-color: #ffffff; border-radius: 32px; overflow:hidden; border: 1px solid #e2e8f0; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 32px; background: ${activeTheme.header}; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 52px;">
                    <img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="CC" style="display:block; background: #ffffff; border-radius: 12px; padding: 4px;" />
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0; font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: -0.01em;">CentreConnect</p>
                    <p style="margin: 2px 0 0; font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.8); letter-spacing: 0.15em; text-transform: uppercase;">${activeTheme.label}</p>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 32px 0 0; font-size: 28px; font-weight: 900; color: #ffffff; line-height: 1.1; letter-spacing: -0.03em;">Hey ${escapeHtml(firstName)}!</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <div style="font-size: 16px; line-height: 1.6; color: #334155;">
                ${input.children}
              </div>
              
              <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #64748b;">
                  Need help? Just reply to this email or <a href="mailto:admin@centerconnect.co.za" style="color: ${activeTheme.primary}; text-decoration: none;">contact Mandla directly</a>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Built with ❤️ in South Africa for our communities.<br/>
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
Hey ${firstName}!

${input.previewText}

---

Need help? Contact us at admin@centerconnect.co.za

Built with love in South Africa for our communities.
(c) 2026 CentreConnect
  `.trim()

  return { html, text }
}
