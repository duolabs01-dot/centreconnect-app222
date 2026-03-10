"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStaffInviteEmail = renderStaffInviteEmail;
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function roleLabel(role) {
    if (role === 'ecd_admin')
        return 'ECD Admin';
    if (role === 'ecd_supervisor')
        return 'ECD Supervisor';
    return 'ECD Staff';
}
function renderStaffInviteEmail(input) {
    var _a, _b;
    const subject = `You have been invited to ${input.centreName} on CentreConnect`;
    const appBaseUrl = ((_a = input.appBaseUrl) !== null && _a !== void 0 ? _a : 'https://centerconnect.co.za').replace(/\/$/, '');
    const logoUrl = ((_b = input.logoUrl) === null || _b === void 0 ? void 0 : _b.trim()) || `${appBaseUrl}/centreconnect-logo.svg`;
    const accessLabel = input.accessMode === 'magiclink' ? 'Sign In Securely' : 'Open Invite Link';
    const passwordSetupHint = input.passwordSetupLink
        ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
         Prefer setting a password first? <a href="${escapeHtml(input.passwordSetupLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">Create / reset your password</a>.
       </p>`
        : '';
    return {
        subject,
        html: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:28px 28px 16px;background:linear-gradient(135deg,#ecfeff,#f0fdfa);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                  <tr>
                    <td valign="middle">
                      <img src="${escapeHtml(logoUrl)}" width="36" height="36" alt="CentreConnect" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;" />
                    </td>
                    <td valign="middle" style="padding-left:10px;">
                      <p style="margin:0;font-size:16px;line-height:1.2;font-weight:800;color:#0f172a;">CentreConnect</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;font-weight:800;color:#0d9488;text-transform:uppercase;">CentreConnect Invite</p>
                <h1 style="margin:12px 0 8px;font-size:26px;line-height:1.2;color:#0f172a;">Hi ${escapeHtml(input.recipientName)},</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">
                  You have been invited to join <strong>${escapeHtml(input.centreName)}</strong> as <strong>${escapeHtml(roleLabel(input.role))}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 26px;">
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569;">
                  Use this one-time secure link to activate access:
                </p>
                <a href="${escapeHtml(input.accessLink)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:800;font-size:14px;">
                  ${accessLabel}
                </a>
                ${passwordSetupHint}
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  After setup, sign in any time here: <a href="${escapeHtml(input.loginLink)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(input.loginLink)}</a>
                </p>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  Need help? Contact <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0d9488;text-decoration:none;font-weight:700;">${escapeHtml(input.supportEmail)}</a>.
                </p>
                <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  By using CentreConnect you agree to our <a href="${escapeHtml(appBaseUrl)}/terms" style="color:#0d9488;text-decoration:none;">Terms</a>,
                  <a href="${escapeHtml(appBaseUrl)}/privacy" style="color:#0d9488;text-decoration:none;">Privacy Policy</a>,
                  and <a href="${escapeHtml(appBaseUrl)}/popia-security" style="color:#0d9488;text-decoration:none;">POPIA & Security approach</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    };
}
