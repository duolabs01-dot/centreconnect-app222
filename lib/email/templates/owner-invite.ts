import { renderBaseEmailLayout } from '../email-layout'

type OwnerInviteTemplateInput = {
  centreName: string
  ownerName: string
  claimUrl: string
  dashboardUrl: string
  primaryActionLabel?: string
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
  const subject = 'Your CentreConnect account is ready'
  const primaryActionLabel = input.primaryActionLabel?.trim() || 'Open my workspace'

  const htmlContent = `
    <p style="margin: 0 0 18px; font-size: 16px; font-weight: 500; color: #334155;">
      Hi ${escapeHtml(input.ownerName)},
    </p>

    <p style="margin: 0 0 28px; font-size: 15px; color: #475569; line-height: 1.6;">
      <strong>${escapeHtml(input.centreName)}</strong> is ready on CentreConnect.
      We kept this simple so you can start without confusion.
    </p>

    <div style="margin-bottom: 28px;">
      <a href="${escapeHtml(input.claimUrl)}" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; padding: 16px 28px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.2);">
        ${escapeHtml(primaryActionLabel)}
      </a>
    </div>

    <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.65;">
      After you open your account, CentreConnect will guide you step by step.
      You do not need to learn everything today.
    </p>

    ${input.whatsappChatLink ? `
      <div style="margin-bottom: 28px; padding: 20px; background: #f0fdf4; border-radius: 20px; border: 1px solid #bbf7d0;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">Need help?</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #166534; line-height: 1.6;">
          If anything feels unclear, reply on WhatsApp and we will help you personally.
        </p>
        <a href="${escapeHtml(input.whatsappChatLink)}" style="display: inline-block; background: #22c55e; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 14px;">
          Open WhatsApp Chat
        </a>
      </div>
    ` : ''}

    <div style="padding: 24px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">What happens next</p>
      <ol style="margin: 12px 0 0; padding: 0 0 0 20px; font-size: 14px; color: #475569; line-height: 1.7;">
        <li style="margin-bottom: 8px;">Open your account.</li>
        <li style="margin-bottom: 8px;">Add your first child.</li>
        <li>Start using attendance from your phone.</li>
      </ol>
    </div>

    <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.65; color: #64748b;">
      Login link: <a href="${escapeHtml(input.dashboardUrl)}" style="color: #0d9488; text-decoration: none; font-weight: 700;">${escapeHtml(input.dashboardUrl)}</a>
    </p>
    <p style="margin: 6px 0 0; font-size: 13px; line-height: 1.65; color: #64748b;">
      Support: <a href="mailto:${escapeHtml(input.supportEmail)}" style="color: #0d9488; text-decoration: none; font-weight: 700;">${escapeHtml(input.supportEmail)}</a>
    </p>
  `

  const { html, text } = renderBaseEmailLayout({
    theme: 'ecd',
    recipientName: input.ownerName,
    previewText: `${input.centreName} is ready. Open your account in one simple step.`,
    appBaseUrl: input.appBaseUrl,
    logoUrl: input.centreLogoUrl || undefined,
    children: htmlContent,
  })

  return {
    subject,
    html,
    text,
  }
}
