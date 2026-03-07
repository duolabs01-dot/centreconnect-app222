export function applicationStatusEmail({
  parentName,
  childName,
  centreName,
  newStatus,
  appUrl,
}: {
  parentName: string
  childName: string
  centreName: string
  newStatus: string
  appUrl: string
}): { subject: string; html: string } {
  const statusLabels: Record<string, string> = {
    in_review: 'is now in review',
    approved: 'has been approved',
    enrolled: 'is now enrolled',
    waitlisted: 'is currently on the waitlist',
    rejected: 'was not successful this time',
  }
  const label = statusLabels[newStatus] ?? `has been updated to: ${newStatus}`

  const subject =
    newStatus === 'approved'
      ? `${centreName}: ${childName}'s application was approved`
      : newStatus === 'enrolled'
        ? `${childName} is enrolled at ${centreName}`
        : `${centreName} shared an update about ${childName}`

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: #0891b2; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <p style="color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">CentreConnect Family Update</p>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 8px;">Hi ${parentName},</p>
        <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px; line-height: 1.3;">
          ${childName}'s application ${label}
        </h1>
        <p style="color: #475569; font-size: 14px; margin: 0 0 12px;">Centre: <strong>${centreName}</strong></p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          We know this journey is important for your family. Open your application to view the latest details and next steps.
        </p>
        <a href="${appUrl}" style="display: inline-block; background: #0891b2; color: white; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          View Application ->
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
          You received this because you have an application on CentreConnect.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

type ParentWelcomeBackEmailInput = {
  recipientName: string
  inviteLink: string
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

export function renderParentWelcomeBackEmail(input: ParentWelcomeBackEmailInput) {
  const subject = 'Welcome back to CentreConnect! 🌟'
  const appBaseUrl = (input.appBaseUrl ?? 'https://centerconnect.co.za').replace(/\/$/, '')
  const logoUrl = input.logoUrl?.trim() || `${appBaseUrl}/centreconnect-logo-email.png`
  const firstName = resolveFirstName(input.recipientName)

  const text = [
    `Hi ${firstName},`,
    '',
    'We missed you! CentreConnect is back with improved features to help you find the best care for your child.',
    '',
    'What’s new for parents:',
    '- 🔍 Improved Search Engine: Find creches near you faster.',
    '- 📂 Digital Document Vault: Securely store and reuse application docs.',
    '- ⚡ Real-time Updates: Get instant feedback on your applications.',
    '- 🛡️ Secure Gate Codes: Enhanced safety for child pickups.',
    '',
    'Confirm your account and set your new password here:',
    input.inviteLink,
    '',
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
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding:32px;background:linear-gradient(135deg,#06b6d4 0%,#0d9488 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:48px;">
                      <img src="${escapeHtml(logoUrl)}" width="40" height="40" alt="CentreConnect" style="display:block;border:0;outline:none;text-decoration:none;border-radius:10px;background:white;padding:4px;" />
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0;font-size:18px;line-height:1.2;font-weight:800;color:#ffffff;">CentreConnect</p>
                      <p style="margin:2px 0 0;font-size:11px;line-height:1.2;letter-spacing:0.1em;font-weight:700;color:#ccfbf1;text-transform:uppercase;">Parent Re-Welcome</p>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:24px 0 8px;font-size:32px;line-height:1.1;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">Welcome back, ${escapeHtml(firstName)}! 🌟</h1>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#ccfbf1;font-weight:500;">
                  We’ve improved our platform to make finding and applying to creches even easier for you.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a;">What’s new for you:</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px;background:#f0fdfa;border-radius:16px;border:1px solid #ccfbf1;">
                      <p style="margin:0;font-size:14px;font-weight:800;color:#0d9488;">🔍 Improved Search Engine</p>
                      <p style="margin:4px 0 8px;font-size:13px;color:#334155;">Find trusted local creches in Alexandra and Soweto with better filters.</p>
                      <p style="margin:0;font-size:14px;font-weight:800;color:#0d9488;">📂 Digital Record Vault</p>
                      <p style="margin:4px 0 8px;font-size:13px;color:#334155;">Upload your documents once and apply to multiple centres instantly.</p>
                      <p style="margin:0;font-size:14px;font-weight:800;color:#0d9488;">🛡️ Secure Gate Access</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#334155;">Unique QR codes for safer, faster child pick-ups.</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                  Ready to see the changes? Tap the button below to confirm your account and set your new password.
                </p>
                <a href="${escapeHtml(input.inviteLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:16px;font-weight:900;font-size:16px;box-shadow:0 4px 6px -1px rgba(13,148,136,0.2);">
                  Confirm & Access My Account
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  Need help? Contact Mandla directly via 
                  <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0d9488;text-decoration:none;font-weight:700;"> ${escapeHtml(input.supportEmail)}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  return { subject, html, text }
}
