"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldAttemptDirectEmailForRecipient = shouldAttemptDirectEmailForRecipient;
exports.sendEmail = sendEmail;
const smtp_1 = require("@/lib/email/smtp");
function toPlainTextEmail(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<a[^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
function shouldAttemptDirectEmailForRecipient(to) {
    var _a, _b, _c;
    const recipient = to.trim().toLowerCase();
    if (!recipient) {
        return { allowed: false, reason: 'Recipient email missing' };
    }
    const hasSmtpConfig = Boolean(((_a = process.env.SMTP_HOST) === null || _a === void 0 ? void 0 : _a.trim()) &&
        ((_b = process.env.SMTP_USER) === null || _b === void 0 ? void 0 : _b.trim()) &&
        process.env.SMTP_PASS &&
        ((_c = process.env.SMTP_FROM) === null || _c === void 0 ? void 0 : _c.trim()));
    if (!hasSmtpConfig) {
        return {
            allowed: false,
            reason: 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
        };
    }
    return { allowed: true, reason: null };
}
async function sendEmail({ to, subject, html, text, }) {
    var _a, _b;
    const eligibility = shouldAttemptDirectEmailForRecipient(to);
    if (!eligibility.allowed) {
        if (eligibility.reason) {
            console.warn('[email] SMTP skipped:', eligibility.reason);
        }
        return {
            success: false,
            error: (_a = eligibility.reason) !== null && _a !== void 0 ? _a : 'SMTP not allowed for this recipient',
            messageId: null,
            provider: null,
        };
    }
    const recipient = to.trim().toLowerCase();
    const result = await (0, smtp_1.sendSmtpMail)({
        to: [recipient],
        subject,
        text: (text === null || text === void 0 ? void 0 : text.trim()) || toPlainTextEmail(html),
        html,
    });
    if (!result.ok) {
        console.error('[email] SMTP error:', result.error);
        return {
            success: false,
            error: (_b = result.error) !== null && _b !== void 0 ? _b : 'SMTP delivery failed',
            messageId: null,
            provider: null,
        };
    }
    return {
        success: true,
        messageId: null,
        provider: 'smtp',
    };
}
