import { renderBaseEmailLayout } from '../email-layout'

type PasswordActivationReminderInput = {
  ownerName: string
  centreName: string
  setupLink: string
  loginUrl: string
  reminderLabel: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderPasswordActivationReminderEmail(input: PasswordActivationReminderInput) {
  const subject = `${input.centreName} is still waiting for you on CentreConnect`

  const htmlContent = `
    <p style="margin: 0 0 18px; font-size: 16px; font-weight: 500; color: #334155;">
      Hi ${escapeHtml(input.ownerName)},
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: #475569; line-height: 1.7;">
      Your CentreConnect workspace for <strong>${escapeHtml(input.centreName)}</strong> is ready, but your account still needs one final step.
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.7;">
      Set your password, then your workspace will open normally. We generated a fresh secure link for this reminder so you are not blocked by an expired link.
    </p>

    <div style="margin-bottom: 28px;">
      <a href="${escapeHtml(input.setupLink)}" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; padding: 16px 28px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.2);">
        Set password and open workspace
      </a>
    </div>

    <div style="margin-bottom: 28px; padding: 20px; background: #ecfeff; border-radius: 20px; border: 1px solid #a5f3fc;">
      <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.08em;">Reminder stage</p>
      <p style="margin: 0; font-size: 14px; color: #155e75; line-height: 1.6;">
        ${escapeHtml(input.reminderLabel)}. This reminder will stop automatically once your password has been set.
      </p>
    </div>

    <div style="padding: 24px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 18px;">
      <p style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">What happens next</p>
      <ol style="margin: 12px 0 0; padding: 0 0 0 20px; font-size: 14px; color: #475569; line-height: 1.7;">
        <li style="margin-bottom: 8px;">Open the secure setup link.</li>
        <li style="margin-bottom: 8px;">Choose your password.</li>
        <li>CentreConnect opens your workspace so you can start using the app.</li>
      </ol>
    </div>

    <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.65; color: #64748b;">
      Sign-in page for later: <a href="${escapeHtml(input.loginUrl)}" style="color: #0d9488; text-decoration: none; font-weight: 700;">${escapeHtml(input.loginUrl)}</a>
    </p>

    <p style="margin: 0; font-size: 12px; line-height: 1.65; color: #94a3b8;">
      If the button does not open, copy this secure link into your browser:<br />
      <span style="word-break: break-all; color: #475569;">${escapeHtml(input.setupLink)}</span>
    </p>
  `

  const { html, text } = renderBaseEmailLayout({
    theme: 'ecd',
    recipientName: input.ownerName,
    previewText: `${input.centreName} is ready. Set your password to open the workspace.`,
    heading: 'Your workspace is still waiting',
    subheading: 'One secure step and you are inside CentreConnect.',
    children: htmlContent,
  })

  return {
    subject,
    html,
    text,
  }
}
