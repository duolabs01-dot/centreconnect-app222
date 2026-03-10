"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSaParentOfferAgreement = buildSaParentOfferAgreement;
const utils_1 = require("@/lib/utils");
function formatRand(cents) {
    return `R${(Math.max(0, cents) / 100).toFixed(2)}`;
}
function sumByFrequency(items, frequency) {
    return items
        .filter((item) => item.frequency === frequency)
        .reduce((sum, item) => sum + Math.max(0, item.amount_cents), 0);
}
function buildSaParentOfferAgreement(params) {
    const monthlyTotal = sumByFrequency(params.breakdown, 'monthly');
    const onceOffTotal = sumByFrequency(params.breakdown, 'once');
    const lines = params.breakdown
        .filter((item) => item.amount_cents > 0)
        .map((item) => `- ${item.label}: ${formatRand(item.amount_cents)} (${item.frequency === 'monthly' ? 'monthly' : 'once-off'})`)
        .join('\n');
    const startDateLabel = params.startDate ? (0, utils_1.formatDate)(params.startDate) : 'To be confirmed by centre';
    const expiryLabel = params.offerExpiresAt ? (0, utils_1.formatDate)(params.offerExpiresAt) : 'No fixed expiry';
    return [
        'CENTRECONNECT PARENT OFFER AGREEMENT (SA TEMPLATE)',
        '',
        '1. PARTIES',
        `- Early Childhood Development Centre: ${params.centreName}`,
        `- Parent/Guardian: ${params.parentName}`,
        `- Child: ${params.childName}`,
        `- Application Number: ${params.applicationNumber}`,
        '',
        '2. OFFER SUMMARY',
        `- Proposed start date: ${startDateLabel}`,
        `- Offer valid until: ${expiryLabel}`,
        `- Monthly recurring total: ${formatRand(monthlyTotal)}`,
        `- Once-off total: ${formatRand(onceOffTotal)}`,
        '',
        '3. PRICING BREAKDOWN',
        lines || '- No priced items supplied',
        '',
        '4. CONDITIONS OF ACCEPTANCE',
        params.customConditions.trim() || '- Parent confirms child profile information is accurate and complete before enrollment is finalized.',
        "- If the creche accepts/enrols a child with incomplete profile, it is the creche's responsibility to follow up.",
        '',
        '5. PENALTIES, LATE FEES, AND NOTICE',
        params.customPenalties.trim() ||
            '- Late payment fees, suspension terms, and notice period for withdrawal are governed by centre policy and applicable South African law.',
        '',
        '6. LEGAL AND PRIVACY',
        '- This agreement is issued by the centre through CentreConnect for enrollment administration.',
        '- POPIA applies to personal information processing for admissions and billing operations.',
        '- Fee, notice, and cancellation terms must comply with the Consumer Protection Act 68 of 2008 and applicable South African law.',
        '- The centre remains responsible for admission due diligence, document follow-up, and child safety compliance before attendance starts.',
        '- Any disputes should first be handled directly with the centre in writing.',
        '',
        '7. ACCEPTANCE',
        '- Parent acceptance in the Application Journey confirms intent to enroll under the terms above.',
        '- If the parent does not accept by the expiry date, the centre may release the spot.',
        '',
        'Template version: sa-parent-v1',
        `Generated at: ${new Date().toISOString()}`,
    ].join('\n');
}
