"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePaystackInvoicePayment = initializePaystackInvoicePayment;
exports.initializePaystackPaymentMethodUpdate = initializePaystackPaymentMethodUpdate;
exports.verifyPaystackSignature = verifyPaystackSignature;
require("server-only");
const crypto_1 = require("crypto");
function getPaystackSecretKey() {
    var _a;
    const value = (_a = process.env.PAYSTACK_SECRET_KEY) === null || _a === void 0 ? void 0 : _a.trim();
    if (!value) {
        throw new Error('Missing PAYSTACK_SECRET_KEY');
    }
    return value;
}
function getWebhookSecret() {
    var _a;
    return ((_a = process.env.PAYSTACK_WEBHOOK_SECRET) === null || _a === void 0 ? void 0 : _a.trim()) || getPaystackSecretKey();
}
function buildCallbackUrl(invoiceId) {
    var _a, _b;
    const explicit = (_a = process.env.PAYSTACK_CALLBACK_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (explicit)
        return explicit;
    const appUrl = ((_b = process.env.NEXT_PUBLIC_APP_URL) === null || _b === void 0 ? void 0 : _b.trim()) || 'http://localhost:3010';
    return `${appUrl}/ecd/billing?invoice=${invoiceId}`;
}
function buildPaymentMethodCallbackUrl() {
    var _a, _b;
    const explicit = (_a = process.env.PAYSTACK_PAYMENT_METHOD_CALLBACK_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (explicit)
        return explicit;
    const appUrl = ((_b = process.env.NEXT_PUBLIC_APP_URL) === null || _b === void 0 ? void 0 : _b.trim()) || 'http://localhost:3010';
    return `${appUrl}/ecd/billing?payment_method_update=1`;
}
function generateReference(prefix, seed) {
    const compact = seed.replace(/-/g, '').slice(0, 12).toLowerCase();
    return `${prefix}_${compact}_${Date.now()}`;
}
function toKobo(amountZar) {
    return Math.max(0, Math.round(amountZar * 100));
}
function parseAmountOverride(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return parsed;
}
async function initializePaystackTransaction(input) {
    var _a;
    const secretKey = getPaystackSecretKey();
    const payload = {
        email: input.customerEmail.trim(),
        amount: toKobo(input.amountZar),
        currency: 'ZAR',
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
    };
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const json = (await response.json().catch(() => null));
    if (!response.ok || !(json === null || json === void 0 ? void 0 : json.status) || !((_a = json.data) === null || _a === void 0 ? void 0 : _a.authorization_url)) {
        const message = (json === null || json === void 0 ? void 0 : json.message) || `Paystack initialize failed with status ${response.status}`;
        throw new Error(message);
    }
    return {
        provider: 'paystack',
        reference: json.data.reference || input.reference,
        authorizationUrl: json.data.authorization_url,
        accessCode: json.data.access_code,
        currency: 'ZAR',
    };
}
async function initializePaystackInvoicePayment(input) {
    const reference = generateReference('cc_inv', input.invoiceId);
    return initializePaystackTransaction({
        customerEmail: input.customerEmail,
        amountZar: input.amountZar,
        reference,
        callbackUrl: buildCallbackUrl(input.invoiceId),
        metadata: Object.assign({ invoice_id: input.invoiceId, invoice_number: input.invoiceNumber }, input.metadata),
    });
}
async function initializePaystackPaymentMethodUpdate(input) {
    var _a;
    const defaultAmount = parseAmountOverride(process.env.PAYSTACK_PAYMENT_METHOD_UPDATE_AMOUNT_ZAR, 5);
    const amount = Number.isFinite(Number(input.amountZar)) && Number(input.amountZar) > 0 ? Number(input.amountZar) : defaultAmount;
    const reference = generateReference('cc_pm', input.ecdId);
    return initializePaystackTransaction({
        customerEmail: input.customerEmail,
        amountZar: amount,
        reference,
        callbackUrl: buildPaymentMethodCallbackUrl(),
        metadata: Object.assign({ payment_method_update: true, ecd_id: input.ecdId, initiated_by_user_id: (_a = input.initiatedByUserId) !== null && _a !== void 0 ? _a : null }, input.metadata),
    });
}
function verifyPaystackSignature(rawBody, signatureHeader) {
    if (!signatureHeader)
        return false;
    const secret = getWebhookSecret();
    const computed = (0, crypto_1.createHmac)('sha512', secret).update(rawBody).digest('hex');
    const expected = Buffer.from(computed, 'hex');
    const received = Buffer.from(signatureHeader, 'hex');
    if (expected.length !== received.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(expected, received);
}
