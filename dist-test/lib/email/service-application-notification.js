"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendServiceApplicationNotification = sendServiceApplicationNotification;
require("server-only");
const smtp_1 = require("@/lib/email/smtp");
const config_1 = require("@/lib/config");
const PRIMARY_RECIPIENT = `admin@${config_1.ROOT_DOMAIN}`;
const CC_RECIPIENT = 'mandlakevin@gmail.com';
function display(value) {
    if (value === null || value === undefined)
        return '-';
    const text = String(value).trim();
    return text.length > 0 ? text : '-';
}
async function sendServiceApplicationNotification(input) {
    var _a;
    const subject = `[CentreConnect] New ECD service application - ${input.centreName}`;
    const body = [
        'A new ECD service application was submitted on CentreConnect.',
        '',
        `Application ID: ${input.applicationId}`,
        `Submitted At: ${input.submittedAt}`,
        '',
        'Applicant',
        `- Name: ${display(input.applicantFullName)}`,
        `- Email: ${display(input.applicantEmail)}`,
        `- Phone: ${display(input.applicantPhone)}`,
        '',
        'Centre',
        `- Name: ${display(input.centreName)}`,
        `- Phone: ${display(input.centrePhone)}`,
        `- Address: ${display(input.centreAddress)}`,
        `- Suburb: ${display(input.centreSuburb)}`,
        `- City: ${display(input.centreCity)}`,
        `- Province: ${display(input.centreProvince)}`,
        '',
        'Commercial',
        `- Requested plan: ${display((_a = input.requestedPlan) !== null && _a !== void 0 ? _a : input.selectedTier)}`,
        `- Selected tier: ${input.selectedTier}`,
        `- Recommended tier: ${input.recommendedTier}`,
        `- Monthly budget: ${display(input.monthlyBudget)}`,
        `- Expected children: ${display(input.expectedChildren)}`,
    ].join('\n');
    return await (0, smtp_1.sendSmtpMail)({
        to: [PRIMARY_RECIPIENT],
        cc: [CC_RECIPIENT],
        subject,
        text: body,
    });
}
