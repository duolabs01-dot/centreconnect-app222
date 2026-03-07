import { renderBaseEmailLayout } from '../email-layout'

type OwnerInviteTemplateInput = {
  centreName: string
  ownerName: string
  claimUrl: string
  dashboardUrl: string
  whatsappChatLink: string | null
  supportWhatsApp: string
  supportEmail: string
  centreLogoUrl?: string | null
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

export function renderOwnerInviteEmail(input: OwnerInviteTemplateInput) {
  const subject = `Start now: ${input.centreName} is ready on CentreConnect 🚀`
  
  const htmlContent = `
    <p style="margin: 0 0 24px; font-size: 16px; font-weight: 500; color: #334155;">
      Great news! <strong>${escapeHtml(input.centreName)}</strong> is now ready for you on CentreConnect.
    </p>
    
    <p style="margin: 0 0 32px; font-size: 15px; color: #475569; line-height: 1.6;">
      Parents can now discover your creche online. This is the perfect time to activate your profile, review your details, and start managing admissions from your phone.
    </p>

    <div style="margin-bottom: 32px; display: flex; gap: 12px;">
      <a href="${escapeHtml(input.claimUrl)}" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; padding: 16px 28px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.2);">
        Claim My Centre
      </a>
      <a href="${escapeHtml(input.dashboardUrl)}" style="display: inline-block; margin-left: 8px; color: #0d9488; text-decoration: none; padding: 16px 0; font-weight: 800; font-size: 15px;">
        View Dashboard &rarr;
      </a>
    </div>

    ${input.whatsappChatLink ? `
      <div style="margin-bottom: 32px; padding: 20px; background: #f0fdf4; border-radius: 20px; border: 1px solid #bbf7d0;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">Community Support</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #166534;">
          Want a hand setting up? Join our community WhatsApp group for ECD owners.
        </p>
        <a href="${escapeHtml(input.whatsappChatLink)}" style="display: inline-block; background: #22c55e; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 14px;">
          Open WhatsApp Chat
        </a>
      </div>
    ` : ''}

    <div style="padding: 24px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Why activate now?</p>
      <ul style="margin: 12px 0 0; padding: 0 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Appear in local parent searches instantly.</li>
        <li style="margin-bottom: 8px;">Accept digital applications (no more paper!).</li>
        <li>Manage your DSD attendance register on your phone.</li>
      </ul>
    </div>
  `

  const { html, text } = renderBaseEmailLayout({
    theme: 'ecd',
    recipientName: input.ownerName,
    previewText: `${input.centreName} is ready for you on CentreConnect.`,
    appBaseUrl: input.appBaseUrl,
    logoUrl: input.centreLogoUrl || undefined,
    children: htmlContent
  })

  return {
    subject,
    html,
    text,
  }
}
