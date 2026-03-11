"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REJECTION_REASON_OPTIONS = void 0;
exports.getRejectionReasonLabel = getRejectionReasonLabel;
exports.getRejectionReasonMessage = getRejectionReasonMessage;
exports.buildParentFacingRejectionReason = buildParentFacingRejectionReason;
exports.REJECTION_REASON_OPTIONS = [
    {
        code: 'age_not_supported',
        label: 'Age group not supported',
        parentMessage: 'This crèche cannot currently place this age group.',
    },
    {
        code: 'no_space_available',
        label: 'No space available',
        parentMessage: 'There is currently no open space for the requested intake period.',
    },
    {
        code: 'outside_service_area',
        label: 'Outside service area',
        parentMessage: 'This crèche currently serves a different catchment area.',
    },
    {
        code: 'missing_critical_documents',
        label: 'Critical documents missing',
        parentMessage: 'Required documents were still missing for final admissions review.',
    },
    {
        code: 'fees_not_accepted',
        label: 'Fees not accepted',
        parentMessage: 'The fee terms were not accepted for this placement.',
    },
    {
        code: 'other',
        label: 'Other',
        parentMessage: 'A centre-specific admissions reason was provided.',
    },
];
const optionByCode = new Map(exports.REJECTION_REASON_OPTIONS.map((item) => [item.code, item]));
function getRejectionReasonLabel(code) {
    var _a, _b;
    if (!code)
        return 'Not provided';
    return (_b = (_a = optionByCode.get(code)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : code.replaceAll('_', ' ');
}
function getRejectionReasonMessage(code) {
    var _a, _b;
    if (!code)
        return 'No reason was supplied by the centre.';
    return (_b = (_a = optionByCode.get(code)) === null || _a === void 0 ? void 0 : _a.parentMessage) !== null && _b !== void 0 ? _b : 'No reason was supplied by the centre.';
}
function buildParentFacingRejectionReason({ code, note, }) {
    const base = getRejectionReasonMessage(code);
    const extra = note === null || note === void 0 ? void 0 : note.trim();
    if (!extra)
        return base;
    return `${base} Note: ${extra}`;
}
