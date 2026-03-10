"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPlatformAdminActionNotification = sendPlatformAdminActionNotification;
require("server-only");
const config_1 = require("@/lib/config");
const delivery_1 = require("@/lib/email/delivery");
const email_layout_1 = require("@/lib/email/email-layout");
const PRIMARY_RECIPIENT = `admin@${config_1.ROOT_DOMAIN}`;
const CC_RECIPIENT = 'mandlakevin@gmail.com';
function display(value) {
    if (value === null || value === undefined)
        return '-';
    const text = String(value).trim();
    return text.length > 0 ? text : '-';
}
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function formatLine(line) {
    return `<li style="margin:0 0 10px;line-height:1.6;color:#334155;">${escapeHtml(line)}</li>`;
}
function formatDetailRow(key, value) {
    const renderedValue = Array.isArray(value) ? value.join(', ') : display(value);
    return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">${escapeHtml(key)}</td>
      <td style="padding:8px 0 8px 16px;color:#0f172a;font-size:13px;font-weight:700;vertical-align:top;">${escapeHtml(renderedValue)}</td>
    </tr>
  `;
}
function buildHtml(input) {
    var _a, _b;
    const lines = (_a = input.lines) !== null && _a !== void 0 ? _a : [];
    const details = (_b = input.details) !== null && _b !== void 0 ? _b : {};
    const detailsRows = Object.entries(details)
        .map(([key, value]) => formatDetailRow(key, value))
        .join('');
    const content = `
    <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:#0f172a;">
      ${escapeHtml(input.heading)}
    </p>
    ${lines.length > 0
        ? `<ul style="margin:0 0 22px;padding-left:20px;">${lines.map(formatLine).join('')}</ul>`
        : ''}
    ${detailsRows
        ? `
          <div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:20px;background:#f8fafc;padding:18px 20px;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">
              Details
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${detailsRows}
            </table>
          </div>
        `
        : ''}
    <p style="margin:22px 0 0;font-size:13px;line-height:1.65;color:#64748b;">
      You are receiving this because founder visibility is enabled for CentreConnect admin and growth milestones.
    </p>
  `;
    return (0, email_layout_1.renderBaseEmailLayout)({
        theme: 'admin',
        recipientName: 'Platform Admin',
        previewText: input.heading,
        children: content,
    });
}
async function deliverNotification(recipient, subject, html) {
    var _a;
    const result = await (0, delivery_1.deliverTransactionalEmail)({
        to: recipient,
        subject,
        html,
    });
    if (result.directSent) {
        return {
            ok: true,
            channel: (_a = result.directProvider) !== null && _a !== void 0 ? _a : 'direct',
            error: null,
        };
    }
    return {
        ok: false,
        channel: result.status === 'queued' ? 'queued' : 'failed',
        error: result.deliveryMessage,
    };
}
async function sendPlatformAdminActionNotification(input) {
    var _a;
    const recipients = Array.from(new Set([(_a = input.recipientEmail) !== null && _a !== void 0 ? _a : PRIMARY_RECIPIENT, PRIMARY_RECIPIENT, CC_RECIPIENT].filter(Boolean)));
    const subject = `[CentreConnect Admin] ${input.subject}`;
    const { html } = buildHtml(input);
    const results = [];
    for (const recipient of recipients) {
        results.push(Object.assign({ recipient }, (await deliverNotification(recipient, subject, html))));
    }
    const failed = results.filter((result) => !result.ok);
    return {
        ok: failed.length === 0,
        results,
        error: failed.length > 0 ? failed.map((result) => `${result.recipient}: ${result.error}`).join(' | ') : null,
    };
}
