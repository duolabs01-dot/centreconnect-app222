type OwnerInviteTemplateInput = {
  centreName: string
  ownerName: string
  claimUrl: string
  dashboardUrl: string
  whatsappChatLink: string | null
  supportWhatsApp: string
  supportEmail: string
}

const BRAND = {
  bg: '#f0fdfa',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#475569',
  primary: '#0d9488',
  accent: '#14b8a6',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderOwnerInviteEmail(input: OwnerInviteTemplateInput) {
  const subject = `Start now: ${input.centreName} is ready on CentreConnect`
  const whatsappDigits = input.supportWhatsApp.replace(/[^\d]/g, '')

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
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;font-weight:800;color:${BRAND.primary};text-transform:uppercase;">CentreConnect</p>
                <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;color:${BRAND.text};">Hi ${escapeHtml(input.ownerName)}!</h1>
                <p style="margin:0;font-size:15px;color:${BRAND.muted};line-height:1.6;">
                  Great news. <strong>${escapeHtml(input.centreName)}</strong> is now live on CentreConnect.
                  Parents can discover you, so this is the perfect time to activate and review your profile.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 10px;">
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
