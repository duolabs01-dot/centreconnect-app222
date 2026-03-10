"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toStatusLabel = toStatusLabel;
exports.renderTemplate = renderTemplate;
exports.buildWarmApplicationUpdateMessage = buildWarmApplicationUpdateMessage;
function toStatusLabel(status) {
    if (!status)
        return 'updated';
    return status.replaceAll('_', ' ');
}
function renderTemplate(templateBody, variables) {
    var _a, _b, _c, _d;
    return templateBody
        .replaceAll('{{centre_name}}', (_a = variables.centreName) !== null && _a !== void 0 ? _a : 'our centre')
        .replaceAll('{{child_name}}', (_b = variables.childName) !== null && _b !== void 0 ? _b : 'your child')
        .replaceAll('{{parent_name}}', (_c = variables.parentName) !== null && _c !== void 0 ? _c : 'parent')
        .replaceAll('{{application_number}}', (_d = variables.applicationNumber) !== null && _d !== void 0 ? _d : 'your application')
        .replaceAll('{{status}}', toStatusLabel(variables.status));
}
function buildWarmApplicationUpdateMessage({ centreName, childName, parentName, applicationNumber, status, }) {
    const name = parentName !== null && parentName !== void 0 ? parentName : 'there';
    const centre = centreName !== null && centreName !== void 0 ? centreName : 'your creche';
    const child = childName !== null && childName !== void 0 ? childName : 'your child';
    const appNo = applicationNumber !== null && applicationNumber !== void 0 ? applicationNumber : 'your application';
    if (status === 'approved') {
        return `Hello ${name}, great news from ${centre}. ${child}'s application (${appNo}) has been approved. Please open your Application Journey to confirm enrollment when ready.`;
    }
    if (status === 'enrolled') {
        return `Hello ${name}, ${child} is now enrolled at ${centre}. We are excited to welcome your family.`;
    }
    if (status === 'in_review') {
        return `Hello ${name}, ${centre} has started reviewing ${child}'s application (${appNo}). We will keep you informed at each step.`;
    }
    if (status === 'partial') {
        return `Hello ${name}, ${child}'s application (${appNo}) at ${centre} is saved as partial. Please upload the remaining documents so our admissions team can continue.`;
    }
    if (status === 'waitlisted') {
        return `Hello ${name}, ${child}'s application (${appNo}) is currently on the waitlist at ${centre}. We will contact you as soon as a place opens.`;
    }
    if (status === 'rejected') {
        return `Hello ${name}, thank you for applying to ${centre}. ${child}'s application (${appNo}) was not successful this time.`;
    }
    if (status === 'withdrawn') {
        return `Hello ${name}, ${child}'s application (${appNo}) was marked as withdrawn. If this was not expected, please contact ${centre}.`;
    }
    return `Hello ${name}, ${child}'s application (${appNo}) at ${centre} has been updated to ${toStatusLabel(status)}.`;
}
