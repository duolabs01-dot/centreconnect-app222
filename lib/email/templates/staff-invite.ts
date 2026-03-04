type StaffInviteTemplateInput = {
  centreName: string
  recipientName: string
  role: 'ecd_admin' | 'ecd_staff'
  accessLink: string
  loginLink: string
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

function roleLabel(role: 'ecd_admin' | 'ecd_staff') {
  return role === 'ecd_admin' ? 'ECD Admin' : 'ECD Staff'
}

export function renderStaffInviteEmail(input: StaffInviteTemplateInput) {
  const subject = `You have been invited to ${input.centreName} on CentreConnect`

  return {
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:28px 28px 16px;background:linear-gradient(135deg,#ecfeff,#f0fdfa);">
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;font-weight:800;color:#0d9488;text-transform:uppercase;">CentreConnect Invite</p>
                <h1 style="margin:12px 0 8px;font-size:26px;line-height:1.2;color:#0f172a;">Hi ${escapeHtml(input.recipientName)},</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">
                  You have been invited to join <strong>${escapeHtml(input.centreName)}</strong> as <strong>${escapeHtml(
                    roleLabel(input.role)
                  )}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 26px;">
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569;">
                  Use the secure link below to access your workspace:
                </p>
                <a href="${escapeHtml(input.accessLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:800;font-size:14px;">
                  Open My ECD Workspace
                </a>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button does not work, sign in here: <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(
                    input.loginLink
                  )}</a>
                </p>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  Need help? Contact <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(
                    input.supportEmail
                  )}</a>.
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

