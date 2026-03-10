"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitFullName = splitFullName;
exports.combineName = combineName;
exports.resolveFirstName = resolveFirstName;
function clean(value) {
    return (value !== null && value !== void 0 ? value : '').trim().replace(/\s+/g, ' ');
}
function splitFullName(value) {
    const normalized = clean(value);
    if (!normalized) {
        return { firstName: '', surname: '' };
    }
    const tokens = normalized.split(' ');
    if (tokens.length === 1) {
        return { firstName: tokens[0], surname: '' };
    }
    return {
        firstName: tokens[0],
        surname: tokens.slice(1).join(' '),
    };
}
function combineName(firstName, surname) {
    return clean([clean(firstName), clean(surname)].filter(Boolean).join(' '));
}
function resolveFirstName(input) {
    var _a, _b, _c;
    const firstName = clean(input.firstName);
    if (firstName)
        return firstName;
    const fromFullName = splitFullName(input.fullName).firstName;
    if (fromFullName)
        return fromFullName;
    const localPart = clean((_b = (_a = input.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]) !== null && _b !== void 0 ? _b : '');
    if (localPart) {
        return localPart.replace(/[._-]+/g, ' ').trim();
    }
    return clean((_c = input.fallback) !== null && _c !== void 0 ? _c : 'Friend') || 'Friend';
}
