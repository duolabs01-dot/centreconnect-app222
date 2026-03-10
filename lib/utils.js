"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOHANNESBURG_TIME_ZONE = void 0;
exports.cn = cn;
exports.getJohannesburgNowParts = getJohannesburgNowParts;
exports.getJohannesburgGreeting = getJohannesburgGreeting;
exports.getDisplayNameFromEmail = getDisplayNameFromEmail;
exports.getJohannesburgDateKey = getJohannesburgDateKey;
exports.isSameJohannesburgDay = isSameJohannesburgDay;
exports.calculateAge = calculateAge;
exports.formatDate = formatDate;
exports.formatLongDate = formatLongDate;
exports.assertNonNull = assertNonNull;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
exports.JOHANNESBURG_TIME_ZONE = "Africa/Johannesburg";
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function safeDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function getJohannesburgNowParts() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: exports.JOHANNESBURG_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const getPart = (type) => { var _a, _b; return Number((_b = (_a = parts.find((part) => part.type === type)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "0"); };
    return {
        year: getPart("year"),
        month: getPart("month"),
        day: getPart("day"),
        hour: getPart("hour"),
    };
}
function getJohannesburgGreeting() {
    const { hour } = getJohannesburgNowParts();
    if (hour >= 5 && hour < 12)
        return 'Good morning';
    if (hour >= 12 && hour < 18)
        return 'Good afternoon';
    return 'Good evening';
}
function getDisplayNameFromEmail(email // Updated type signature
) {
    var _a, _b;
    if (!email || typeof email !== 'string')
        return 'Parent'; // Null/undefined check
    const local = (_a = email.split('@')[0]) !== null && _a !== void 0 ? _a : '';
    const token = ((_b = local.split(/[._-]+/).find(Boolean)) !== null && _b !== void 0 ? _b : local).trim();
    if (!token)
        return 'Parent';
    return token.charAt(0).toUpperCase() + token.slice(1);
}
function getJohannesburgDateKey(value) {
    var _a, _b, _c, _d, _e, _f;
    const date = safeDate(value);
    if (!date)
        return "";
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: exports.JOHANNESBURG_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = (_b = (_a = parts.find((part) => part.type === "year")) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "0000";
    const month = (_d = (_c = parts.find((part) => part.type === "month")) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : "00";
    const day = (_f = (_e = parts.find((part) => part.type === "day")) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : "00";
    return `${year}-${month}-${day}`;
}
function isSameJohannesburgDay(a, b = new Date()) {
    return getJohannesburgDateKey(a) === getJohannesburgDateKey(b);
}
function calculateAge(dateOfBirth) {
    const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map((value) => Number(value));
    if (!birthYear || !birthMonth || !birthDay)
        return 0;
    const now = getJohannesburgNowParts();
    let age = now.year - birthYear;
    const monthDiff = now.month - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && now.day < birthDay)) {
        age--;
    }
    return age;
}
function formatDate(value) {
    const date = safeDate(value);
    if (!date)
        return '';
    return new Intl.DateTimeFormat("en-ZA", {
        timeZone: exports.JOHANNESBURG_TIME_ZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}
function formatLongDate(value) {
    const date = safeDate(value);
    if (!date)
        return '';
    return new Intl.DateTimeFormat("en-ZA", {
        timeZone: exports.JOHANNESBURG_TIME_ZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}
// Add runtime validation for non-null checks
function assertNonNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message);
    }
}
