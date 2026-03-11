'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payInvoiceAction = payInvoiceAction;
const navigation_1 = require("next/navigation");
const portal_session_1 = require("@/lib/ecd/portal-session");
const paystack_1 = require("@/lib/payments/paystack");
async function payInvoiceAction(invoiceId) {
    var _a, _b;
    const { supabase, user, ecdId } = await (0, portal_session_1.requireEcdPortalSession)();
    const { data: invoice } = await supabase
        .from('invoices')
        .select('id,invoice_number,total,status')
        .eq('id', invoiceId)
        .eq('ecd_id', ecdId)
        .maybeSingle();
    if (!invoice)
        return { error: 'Invoice not found' };
    if (invoice.status === 'paid')
        return { error: 'Invoice already paid' };
    const { data: centre } = await supabase
        .from('ecd_centres')
        .select('email,name')
        .eq('id', ecdId)
        .maybeSingle();
    const email = (_b = (_a = centre === null || centre === void 0 ? void 0 : centre.email) !== null && _a !== void 0 ? _a : user.email) !== null && _b !== void 0 ? _b : '';
    if (!email)
        return { error: 'No email on file to process payment' };
    try {
        const result = await (0, paystack_1.initializePaystackInvoicePayment)({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amountZar: invoice.total,
            customerEmail: email,
            metadata: { ecd_id: ecdId },
        });
        (0, navigation_1.redirect)(result.authorizationUrl);
    }
    catch (err) {
        // Re-throw redirect (Next.js uses throw for redirects)
        if (err && typeof err === 'object' && 'digest' in err)
            throw err;
        return { error: 'Failed to initialize payment. Please try again.' };
    }
}
