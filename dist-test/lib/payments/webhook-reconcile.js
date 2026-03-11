"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePaystackWebhookEvent = reconcilePaystackWebhookEvent;
const receipts_1 = require("@/lib/payments/receipts");
const structured_logs_1 = require("@/lib/payments/structured-logs");
function asString(value) {
    return typeof value === 'string' ? value : null;
}
function asBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string')
        return value.toLowerCase() === 'true';
    if (typeof value === 'number')
        return value === 1;
    return false;
}
function asRecord(value) {
    return value && typeof value === 'object' ? value : null;
}
async function reconcilePaystackWebhookEvent(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const metadata = ((_b = (_a = input.payload.data) === null || _a === void 0 ? void 0 : _a.metadata) !== null && _b !== void 0 ? _b : {});
    const metadataInvoiceId = asString(metadata.invoice_id);
    const metadataEcdId = asString(metadata.ecd_id);
    const isPaymentMethodUpdate = asBoolean(metadata.payment_method_update);
    const authorization = asRecord((_c = input.payload.data) === null || _c === void 0 ? void 0 : _c.authorization);
    const customer = asRecord((_d = input.payload.data) === null || _d === void 0 ? void 0 : _d.customer);
    let invoiceId = metadataInvoiceId;
    if (!invoiceId && input.reference) {
        const lookup = await input.admin.from('invoices').select('id').eq('payment_reference', input.reference).maybeSingle();
        invoiceId = (_f = (_e = lookup.data) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : null;
    }
    if (input.eventType === 'charge.success') {
        if (isPaymentMethodUpdate && metadataEcdId) {
            const authorizationCode = asString(authorization === null || authorization === void 0 ? void 0 : authorization.authorization_code);
            if (!authorizationCode) {
                if (input.reference) {
                    await input.admin
                        .from('billing_payment_method_updates')
                        .update({
                        status: 'failed',
                        failed_at: new Date().toISOString(),
                        error_message: 'Authorization code missing in webhook payload',
                    })
                        .eq('paystack_reference', input.reference);
                }
                throw new Error('Authorization code missing in payment method update webhook payload');
            }
            const { error: methodUpsertError } = await input.admin.from('ecd_billing_payment_methods').upsert({
                ecd_id: metadataEcdId,
                provider: 'paystack',
                authorization_code: authorizationCode,
                authorization_signature: asString(authorization === null || authorization === void 0 ? void 0 : authorization.signature),
                card_type: asString(authorization === null || authorization === void 0 ? void 0 : authorization.card_type),
                last4: asString(authorization === null || authorization === void 0 ? void 0 : authorization.last4),
                exp_month: asString(authorization === null || authorization === void 0 ? void 0 : authorization.exp_month),
                exp_year: asString(authorization === null || authorization === void 0 ? void 0 : authorization.exp_year),
                bank: asString(authorization === null || authorization === void 0 ? void 0 : authorization.bank),
                account_name: asString(authorization === null || authorization === void 0 ? void 0 : authorization.account_name),
                customer_code: asString(customer === null || customer === void 0 ? void 0 : customer.customer_code),
                customer_email: asString(customer === null || customer === void 0 ? void 0 : customer.email),
                reusable: true,
            }, { onConflict: 'ecd_id' });
            if (methodUpsertError) {
                throw new Error(methodUpsertError.message);
            }
            if (input.reference) {
                await input.admin
                    .from('billing_payment_method_updates')
                    .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    failed_at: null,
                    error_message: null,
                })
                    .eq('paystack_reference', input.reference);
            }
            (0, structured_logs_1.logBillingEvent)('payment_method_update_processed', {
                ecdId: metadataEcdId,
                reference: input.reference,
            });
        }
        if (invoiceId) {
            const { data: invoice, error: invoiceReadError } = await input.admin
                .from('invoices')
                .select('id,ecd_id,status,dunning_state')
                .eq('id', invoiceId)
                .maybeSingle();
            if (invoiceReadError || !invoice) {
                throw new Error((invoiceReadError === null || invoiceReadError === void 0 ? void 0 : invoiceReadError.message) || 'Invoice not found for webhook event');
            }
            if (invoice.status !== 'paid') {
                const patch = {
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    payment_last_event: input.eventType,
                    payment_currency: (_h = asString((_g = input.payload.data) === null || _g === void 0 ? void 0 : _g.currency)) !== null && _h !== void 0 ? _h : 'ZAR',
                    paystack_reference: input.reference,
                    paystack_event_processed_at: new Date().toISOString(),
                };
                if (invoice.dunning_state === 'grace' || invoice.dunning_state === 'suspended') {
                    patch.dunning_state = 'reactivated';
                }
                const { error: invoiceUpdateError } = await input.admin.from('invoices').update(patch).eq('id', invoice.id);
                if (invoiceUpdateError)
                    throw new Error(invoiceUpdateError.message);
            }
            const { error: subscriptionUpdateError } = await input.admin
                .from('subscriptions')
                .update({ status: 'active' })
                .eq('ecd_id', invoice.ecd_id)
                .in('status', ['trial', 'past_due', 'suspended']);
            if (subscriptionUpdateError)
                throw new Error(subscriptionUpdateError.message);
            await (0, receipts_1.deliverInvoiceReceipt)({
                admin: input.admin,
                invoiceId: invoice.id,
            });
            (0, structured_logs_1.logBillingEvent)('invoice_payment_reconciled', {
                invoiceId: invoice.id,
                ecdId: invoice.ecd_id,
                reference: input.reference,
            });
        }
        const { error: eventUpdateError } = await input.admin
            .from('payment_webhook_events')
            .update({
            invoice_id: invoiceId,
            status: 'processed',
            processed_at: new Date().toISOString(),
            error_message: null,
        })
            .eq('id', input.eventRowId);
        if (eventUpdateError)
            throw new Error(eventUpdateError.message);
        return { processed: true, status: 'processed', invoiceId };
    }
    const { error: ignoredUpdateError } = await input.admin
        .from('payment_webhook_events')
        .update({
        invoice_id: invoiceId,
        status: 'ignored',
        processed_at: new Date().toISOString(),
        error_message: null,
    })
        .eq('id', input.eventRowId);
    if (ignoredUpdateError)
        throw new Error(ignoredUpdateError.message);
    (0, structured_logs_1.logBillingEvent)('paystack_webhook_ignored', {
        eventType: input.eventType,
        reference: input.reference,
        invoiceId,
    });
    return { processed: false, status: 'ignored', invoiceId };
}
