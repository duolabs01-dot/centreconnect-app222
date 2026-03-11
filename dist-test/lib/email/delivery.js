"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlainTextEmail = toPlainTextEmail;
exports.deliverTransactionalEmail = deliverTransactionalEmail;
require("server-only");
const emails_1 = require("@/lib/communications/emails");
const send_1 = require("@/lib/email/send");
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
async function deliverTransactionalEmail(input) {
    var _a, _b, _c, _d, _e, _f;
    const recipient = input.to.trim().toLowerCase();
    const subject = input.subject.trim();
    const html = input.html;
    let directSent = false;
    let directProvider = null;
    let directMessageId = null;
    const directErrors = [];
    const directNotes = [];
    const directEligibility = (0, send_1.shouldAttemptDirectEmailForRecipient)(recipient);
    if (directEligibility.allowed) {
        const directResult = await (0, send_1.sendEmail)({
            to: recipient,
            subject,
            html,
            text: (_a = input.text) !== null && _a !== void 0 ? _a : toPlainTextEmail(html),
        });
        if (directResult.success) {
            directSent = true;
            directProvider = (_b = directResult.provider) !== null && _b !== void 0 ? _b : 'smtp';
            directMessageId = (_c = directResult.messageId) !== null && _c !== void 0 ? _c : null;
        }
        else if (directResult.error) {
            directErrors.push(`SMTP: ${directResult.error}`);
        }
    }
    else if (directEligibility.reason) {
        directNotes.push(`Direct email skipped: ${directEligibility.reason}`);
    }
    const queueResult = directSent
        ? { success: true, skipped: true }
        : await (0, emails_1.queueEmail)(recipient, subject, html);
    const queueMessageId = !directSent &&
        queueResult.success &&
        'data' in queueResult &&
        Array.isArray(queueResult.data)
        ? String((_e = (_d = queueResult.data[0]) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : '').trim() || null
        : null;
    const diagnostics = [...directNotes, ...directErrors].join(' | ');
    const queueError = !queueResult.success && 'error' in queueResult ? (_f = queueResult.error) !== null && _f !== void 0 ? _f : 'unknown' : null;
    const status = directSent ? 'sent' : queueResult.success ? 'queued' : 'failed';
    const deliveryMessage = status === 'sent'
        ? `Email sent via ${directProvider !== null && directProvider !== void 0 ? directProvider : 'direct provider'}.`
        : status === 'queued'
            ? `Email queued only. ${diagnostics.length > 0 ? diagnostics : 'No direct email provider succeeded.'} Queueing does not confirm delivery.`
            : `Email delivery failed. ${diagnostics.length > 0 ? diagnostics : 'No direct email provider succeeded.'}${queueError ? ` Queue error: ${queueError}` : ''}`;
    return {
        status,
        directSent,
        directProvider,
        directMessageId,
        directErrors,
        directNotes,
        queueSuccess: queueResult.success,
        queueError: queueError !== null && queueError !== void 0 ? queueError : 'Queue unavailable.',
        queueMessageId,
        deliveryMessage,
    };
}
