"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverInvoiceReceipt = deliverInvoiceReceipt;
require("server-only");
const send_1 = require("@/lib/email/send");
const notification_logs_1 = require("@/lib/admin/notification-logs");
function normalizeOne(value) {
    var _a;
    if (!value)
        return null;
    return Array.isArray(value) ? (_a = value[0]) !== null && _a !== void 0 ? _a : null : value;
}
function receiptNumberFor(invoiceNumber) {
    const now = new Date();
    const tag = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const compact = invoiceNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase();
    return `RCPT-${tag}-${compact}`;
}
function currency(amount) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}
function buildReceiptHtml(input) {
    var _a;
    const paidDate = input.paidAt ? new Date(input.paidAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Payment receipt</h2>
      <p>Hi ${input.centreName},</p>
      <p>We received your payment. Here is your receipt summary:</p>
      <ul>
        <li><strong>Receipt number:</strong> ${input.receiptNumber}</li>
        <li><strong>Invoice:</strong> ${input.invoiceNumber}</li>
        <li><strong>Amount paid:</strong> ${currency(input.amount)}</li>
        <li><strong>Paid at:</strong> ${paidDate}</li>
        <li><strong>Payment reference:</strong> ${(_a = input.paymentReference) !== null && _a !== void 0 ? _a : '-'}</li>
      </ul>
      <p>Thank you for using CentreConnect.</p>
    </div>
  `;
}
async function deliverInvoiceReceipt(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const { data: invoice, error: readError } = await input.admin
        .from('invoices')
        .select('id,ecd_id,invoice_number,total,status,paid_at,receipt_number,receipt_sent_at,payment_reference,paystack_reference,ecd_centres(name,email)')
        .eq('id', input.invoiceId)
        .maybeSingle();
    if (readError || !invoice) {
        return { sent: false, skipped: true, reason: (_a = readError === null || readError === void 0 ? void 0 : readError.message) !== null && _a !== void 0 ? _a : 'Invoice not found for receipt delivery' };
    }
    const row = invoice;
    if (row.status !== 'paid' || !row.paid_at) {
        return { sent: false, skipped: true, reason: 'Invoice is not paid yet' };
    }
    if (row.receipt_sent_at) {
        return { sent: false, skipped: true, reason: 'Receipt already sent' };
    }
    const centre = normalizeOne(row.ecd_centres);
    const recipient = (_b = centre === null || centre === void 0 ? void 0 : centre.email) === null || _b === void 0 ? void 0 : _b.trim();
    if (!recipient) {
        await input.admin.from('invoices').update({ receipt_last_error: 'Centre email missing for receipt delivery' }).eq('id', row.id);
        return { sent: false, skipped: true, reason: 'Centre email missing' };
    }
    const receiptNumber = (_c = row.receipt_number) !== null && _c !== void 0 ? _c : receiptNumberFor(row.invoice_number);
    const paidAmount = Number((_d = row.total) !== null && _d !== void 0 ? _d : 0);
    const paymentReference = (_e = row.paystack_reference) !== null && _e !== void 0 ? _e : row.payment_reference;
    const result = await (0, send_1.sendEmail)({
        to: recipient,
        subject: `Receipt ${receiptNumber} for ${row.invoice_number}`,
        html: buildReceiptHtml({
            centreName: ((_f = centre === null || centre === void 0 ? void 0 : centre.name) === null || _f === void 0 ? void 0 : _f.trim()) || 'there',
            invoiceNumber: row.invoice_number,
            receiptNumber,
            amount: paidAmount,
            paidAt: row.paid_at,
            paymentReference,
        }),
    });
    if (!result.success) {
        await input.admin
            .from('invoices')
            .update({
            receipt_number: receiptNumber,
            receipt_last_error: (_g = result.error) !== null && _g !== void 0 ? _g : 'Receipt delivery failed',
        })
            .eq('id', row.id);
        await (0, notification_logs_1.upsertNotificationLog)(input.admin, {
            centreId: row.ecd_id,
            eventKey: `billing_receipt:${row.id}`,
            eventType: 'billing_receipt',
            channel: 'email',
            recipient,
            status: 'failed',
            provider: (_h = result.provider) !== null && _h !== void 0 ? _h : 'smtp',
            errorMessage: (_j = result.error) !== null && _j !== void 0 ? _j : 'Receipt delivery failed',
            payload: {
                invoiceId: row.id,
                invoiceNumber: row.invoice_number,
                receiptNumber,
            },
        });
        return { sent: false, skipped: false, reason: (_k = result.error) !== null && _k !== void 0 ? _k : 'Receipt delivery failed' };
    }
    const sentAt = new Date().toISOString();
    await input.admin
        .from('invoices')
        .update({
        receipt_number: receiptNumber,
        receipt_sent_at: sentAt,
        receipt_last_error: null,
    })
        .eq('id', row.id);
    await (0, notification_logs_1.upsertNotificationLog)(input.admin, {
        centreId: row.ecd_id,
        eventKey: `billing_receipt:${row.id}`,
        eventType: 'billing_receipt',
        channel: 'email',
        recipient,
        status: 'sent',
        provider: (_l = result.provider) !== null && _l !== void 0 ? _l : 'smtp',
        providerMessageId: (_m = result.messageId) !== null && _m !== void 0 ? _m : null,
        payload: {
            invoiceId: row.id,
            invoiceNumber: row.invoice_number,
            receiptNumber,
            paidAt: row.paid_at,
            paymentReference,
        },
        createdAt: sentAt,
    });
    return { sent: true, skipped: false };
}
