type OwnerInviteTemplateInput = {
  centreName: string
  ownerName: string
  claimUrl: string
  dashboardUrl: string
  whatsappChatLink: string | null
  supportWhatsApp: string
  supportEmail: string
  centreLogoUrl?: string | null
}

const BRAND = {
  bg: '#f0fdfa',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#475569',
  primary: '#0d9488',
}

const CENTRECONNECT_LOGO_URL = 'https://centerconnect.co.za/centreconnect-logo.svg'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isSafeHttpImage(url: string | null | undefined) {
  if (!url) return false
  const value = url.trim()
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function renderOwnerInviteEmail(input: OwnerInviteTemplateInput) {
  const subject = `Start now: ${input.centreName} is ready on CentreConnect`
  const whatsappDigits = input.supportWhatsApp.replace(/[^\d]/g, '')
  const centreLogoBlock = isSafeHttpImage(input.centreLogoUrl)
    ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;">
      <tr>
        <td style="padding:10px 12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="56" valign="middle">
                <img src="${escapeHtml(input.centreLogoUrl ?? '')}" width="46" height="46" alt="${escapeHtml(input.centreName)} logo" style="display:block;border-radius:999px;border:1px solid #e2e8f0;background:#fff;" />
              </td>
              <td valign="middle" style="padding-left:8px;">
                <p style="margin:0;font-size:12px;font-weight:700;color:#0f172a;">${escapeHtml(input.centreName)} brand is ready</p>
                <p style="margin:2px 0 0;font-size:11px;color:#475569;">This logo appears in your welcome pack and parent-facing cards.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
    : ''

  return {
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:Inter,Segoe UI,Arial,sans-serif;color:${BRAND.text};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:${BRAND.card};border-radius:20px;overflow:hidden;border:1px solid #ccfbf1;">
            <tr>
              <td style="padding:28px 28px 16px;background:linear-gradient(135deg,#ccfbf1,#ecfeff);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                  <tr>
                    <td width="44" valign="middle">
                      <img src="${CENTRECONNECT_LOGO_URL}" width="34" height="34" alt="CentreConnect logo" style="display:block;border-radius:8px;background:#fff;padding:4px;" />
                    </td>
                    <td valign="middle">
                      <p style="margin:0;font-size:12px;letter-spacing:0.12em;font-weight:800;color:${BRAND.primary};text-transform:uppercase;">CentreConnect</p>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;color:${BRAND.text};">Sawubona, Dumela, Hello 👋 ${escapeHtml(input.ownerName)}!</h1>
                <p style="margin:0;font-size:15px;color:${BRAND.muted};line-height:1.6;">
                  Great news. <strong>${escapeHtml(input.centreName)}</strong> is now live on CentreConnect.
                  Parents can discover you, so this is the perfect time to activate and review your profile.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 10px;">
                ${centreLogoBlock}
                <div style="border-radius:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <p style="margin:0 0 10px;font-size:14px;color:${BRAND.text};font-weight:700;">Why open it now?</p>
                  <p style="margin:0;font-size:14px;color:${BRAND.muted};line-height:1.6;">
                    Keep your centre details accurate, respond faster to applications, and start converting views into enrolments.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;">
                <a href="${escapeHtml(input.claimUrl)}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:14px;font-weight:800;font-size:14px;">
                  Start now
                </a>
                <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;margin-left:10px;color:${BRAND.primary};text-decoration:none;font-weight:700;font-size:14px;">
                  View dashboard
                </a>
                ${
                  input.whatsappChatLink
                    ? `<div style="margin-top:12px;">
                  <a href="${escapeHtml(input.whatsappChatLink)}" style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:14px;font-weight:900;font-size:14px;">
                    Open WhatsApp Chat
                  </a>
                </div>`
                    : ''
                }
                <p style="margin:18px 0 0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
                  Need help? WhatsApp <a href="https://wa.me/${escapeHtml(whatsappDigits)}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${escapeHtml(input.supportWhatsApp)}</a>
                  or email <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${escapeHtml(input.supportEmail)}</a>.
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
