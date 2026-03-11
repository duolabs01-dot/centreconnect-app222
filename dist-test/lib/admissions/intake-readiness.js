"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateParentIntakeReadiness = evaluateParentIntakeReadiness;
exports.evaluateApplicationIntakeReadiness = evaluateApplicationIntakeReadiness;
exports.formatMissingRequirementsList = formatMissingRequirementsList;
function clean(value) {
    return String(value !== null && value !== void 0 ? value : '').trim();
}
function hasText(value) {
    return clean(value).length > 0;
}
function includesAny(value, needles) {
    return needles.some((needle) => value.includes(needle));
}
function normalizeDocTypes(docTypes) {
    return docTypes
        .map((docType) => clean(docType).toLowerCase())
        .filter((docType) => docType.length > 0);
}
function hasIdentityDoc(docTypes, idVerificationStatus) {
    const status = clean(idVerificationStatus).toLowerCase();
    if (status === 'verified')
        return true;
    return docTypes.some((docType) => includesAny(docType, ['id', 'identity', 'passport']));
}
function hasChildReadinessDoc(docTypes) {
    return docTypes.some((docType) => includesAny(docType, ['birth', 'immun', 'vaccine', 'medical', 'clinic', 'road_to_health']));
}
function toResult(checks) {
    const done = checks.filter((check) => check.ok).length;
    const completionPct = Math.round((done / checks.length) * 100);
    const missingChecks = checks.filter((check) => !check.ok);
    return {
        ready: missingChecks.length === 0,
        missing: missingChecks.map((check) => check.label),
        missingCodes: missingChecks.map((check) => check.code),
        completionPct,
    };
}
function evaluateParentIntakeReadiness(input) {
    const docTypes = normalizeDocTypes(input.docTypes);
    const checks = [
        { code: 'parent_name', label: 'Full name', ok: hasText(input.parent.fullName) },
        { code: 'parent_phone', label: 'Phone number', ok: hasText(input.parent.phone) },
        {
            code: 'guardian_relationship',
            label: 'Guardian role (for example: mother, father, aunt)',
            ok: hasText(input.parent.guardianRelationship),
        },
        {
            code: 'emergency_contact_name',
            label: 'Emergency contact name',
            ok: hasText(input.parent.emergencyContactName),
        },
        {
            code: 'emergency_contact_phone',
            label: 'Emergency contact phone',
            ok: hasText(input.parent.emergencyContactPhone),
        },
        {
            code: 'id_document',
            label: 'Parent ID document',
            ok: hasIdentityDoc(docTypes, input.parent.idVerificationStatus),
        },
        {
            code: 'child_document',
            label: 'Child supporting document (birth certificate or immunization record)',
            ok: hasChildReadinessDoc(docTypes),
        },
    ];
    if (input.hasAtLeastOneChild === false) {
        checks.push({
            code: 'child_profile',
            label: 'At least one child profile',
            ok: false,
        });
    }
    return toResult(checks);
}
function evaluateApplicationIntakeReadiness(input) {
    const docTypes = normalizeDocTypes(input.docTypes);
    const checks = [
        { code: 'parent_name', label: 'Full name', ok: hasText(input.parent.fullName) },
        { code: 'parent_phone', label: 'Phone number', ok: hasText(input.parent.phone) },
        {
            code: 'guardian_relationship',
            label: 'Guardian role',
            ok: hasText(input.parent.guardianRelationship),
        },
        {
            code: 'emergency_contact_name',
            label: 'Emergency contact name',
            ok: hasText(input.parent.emergencyContactName),
        },
        {
            code: 'emergency_contact_phone',
            label: 'Emergency contact phone',
            ok: hasText(input.parent.emergencyContactPhone),
        },
        {
            code: 'child_name',
            label: 'Child first and last name',
            ok: hasText(input.child.firstName) && hasText(input.child.lastName),
        },
        {
            code: 'child_dob',
            label: 'Child date of birth',
            ok: hasText(input.child.dateOfBirth),
        },
        {
            code: 'child_gender',
            label: 'Child gender',
            ok: hasText(input.child.gender),
        },
        {
            code: 'id_document',
            label: 'Parent ID document',
            ok: hasIdentityDoc(docTypes, input.parent.idVerificationStatus),
        },
        {
            code: 'child_document',
            label: 'Child supporting document (birth certificate or immunization record)',
            ok: hasChildReadinessDoc(docTypes),
        },
    ];
    return toResult(checks);
}
function formatMissingRequirementsList(missing) {
    return missing.map((item) => `- ${item}`).join('\n');
}
