"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGE_GROUP_PRICE_BANDS = void 0;
exports.normalizeAgeGroupPricing = normalizeAgeGroupPricing;
exports.buildAgeGroupPricingFromRandInput = buildAgeGroupPricingFromRandInput;
exports.resolveAgeGroupFeeForDateOfBirth = resolveAgeGroupFeeForDateOfBirth;
exports.getAgeGroupPricingSummary = getAgeGroupPricingSummary;
const utils_1 = require("@/lib/utils");
exports.AGE_GROUP_PRICE_BANDS = [
    { key: '0-2', label: '0-2 years', minAge: 0, maxAgeExclusive: 2 },
    { key: '2-4', label: '2-4 years', minAge: 2, maxAgeExclusive: 4 },
    { key: '4-6', label: '4-6 years', minAge: 4, maxAgeExclusive: 6 },
    { key: '6+', label: 'Aftercare (6+)', minAge: 6, maxAgeExclusive: null },
];
const MAX_MONTHLY_FEE_CENTS = 10000000; // R100,000 cap for sanity.
function sanitizeMonthlyFeeCents(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric))
        return fallback;
    const rounded = Math.round(numeric);
    if (rounded <= 0)
        return 0;
    if (rounded > MAX_MONTHLY_FEE_CENTS)
        return MAX_MONTHLY_FEE_CENTS;
    return rounded;
}
function fallbackFeeCentsFromRand(fallbackMonthlyFeeRand) {
    if (typeof fallbackMonthlyFeeRand !== 'number' || !Number.isFinite(fallbackMonthlyFeeRand))
        return 0;
    return sanitizeMonthlyFeeCents(Math.round(fallbackMonthlyFeeRand * 100));
}
function emptyPricingMap(baseFeeCents = 0) {
    return exports.AGE_GROUP_PRICE_BANDS.reduce((acc, band) => {
        acc[band.key] = {
            label: band.label,
            monthly_fee_cents: baseFeeCents,
        };
        return acc;
    }, {});
}
function toBandKeyForAge(ageYears) {
    if (typeof ageYears !== 'number' || !Number.isFinite(ageYears) || ageYears < 0)
        return '2-4';
    if (ageYears < 2)
        return '0-2';
    if (ageYears < 4)
        return '2-4';
    if (ageYears < 6)
        return '4-6';
    return '6+';
}
function normalizeAgeGroupPricing(raw, fallbackMonthlyFeeRand) {
    var _a;
    const fallbackCents = fallbackFeeCentsFromRand(fallbackMonthlyFeeRand);
    const normalized = emptyPricingMap(fallbackCents);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return normalized;
    }
    for (const band of exports.AGE_GROUP_PRICE_BANDS) {
        const entry = raw[band.key];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
            continue;
        const label = String((_a = entry.label) !== null && _a !== void 0 ? _a : '').trim() || band.label;
        const monthlyFeeCents = sanitizeMonthlyFeeCents(entry.monthly_fee_cents, fallbackCents);
        normalized[band.key] = {
            label,
            monthly_fee_cents: monthlyFeeCents,
        };
    }
    return normalized;
}
function buildAgeGroupPricingFromRandInput(input, fallbackMonthlyFeeRand) {
    var _a;
    const fallbackCents = fallbackFeeCentsFromRand(fallbackMonthlyFeeRand);
    const normalized = emptyPricingMap(fallbackCents);
    for (const band of exports.AGE_GROUP_PRICE_BANDS) {
        const rawRand = Number((_a = input[band.key]) !== null && _a !== void 0 ? _a : '');
        if (!Number.isFinite(rawRand) || rawRand < 0) {
            normalized[band.key] = { label: band.label, monthly_fee_cents: 0 };
            continue;
        }
        normalized[band.key] = {
            label: band.label,
            monthly_fee_cents: sanitizeMonthlyFeeCents(Math.round(rawRand * 100)),
        };
    }
    return normalized;
}
function resolveAgeGroupFeeForDateOfBirth(params) {
    const normalized = normalizeAgeGroupPricing(params.ageGroupPricing, params.fallbackMonthlyFeeRand);
    const age = params.dateOfBirth ? (0, utils_1.calculateAge)(params.dateOfBirth) : null;
    const ageGroupKey = toBandKeyForAge(age);
    const selected = normalized[ageGroupKey];
    if (!selected || selected.monthly_fee_cents <= 0)
        return null;
    return {
        ageGroupKey,
        ageGroupLabel: selected.label,
        monthlyFeeCents: selected.monthly_fee_cents,
    };
}
function getAgeGroupPricingSummary(pricing) {
    const values = Object.values(pricing)
        .map((entry) => entry.monthly_fee_cents)
        .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0)
        return { minFeeRand: null, maxFeeRand: null };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
        minFeeRand: min / 100,
        maxFeeRand: max / 100,
    };
}
