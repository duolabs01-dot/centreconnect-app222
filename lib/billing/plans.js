"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_PLAN_OPTIONS = void 0;
exports.toPublicPlan = toPublicPlan;
exports.isKnownPlanAlias = isKnownPlanAlias;
exports.toInternalTier = toInternalTier;
exports.toPublicPlanFromInternal = toPublicPlanFromInternal;
exports.getPublicPlanDefinition = getPublicPlanDefinition;
exports.getInternalTierDefinition = getInternalTierDefinition;
exports.getPublicPlanLabel = getPublicPlanLabel;
exports.getInternalTierLabel = getInternalTierLabel;
exports.getPublicPlanPrice = getPublicPlanPrice;
exports.getInternalTierPrice = getInternalTierPrice;
exports.getWebsiteGuideByTier = getWebsiteGuideByTier;
exports.normalizeSubscriptionStatus = normalizeSubscriptionStatus;
const PLAN_DEFINITIONS = {
    starter: {
        label: 'Starter',
        monthlyPrice: 199,
        description: 'A simple, professional starting point for centres that want parents to find them and apply properly.',
        includes: [
            'Professional centre listing',
            'Parent applications in one dashboard',
            'Announcements and direct parent messages',
            'Structured child profile intake',
        ],
        outcomes: [
            'Help parents trust your centre faster online',
            'Reduce manual admission follow-up',
            'Keep parent communication clear from day one',
        ],
        website: {
            includes: ['Centre profile page', 'Contact details + map', 'Hero, About and Programs sections'],
            suggestedAddOns: ['Gallery expansion', 'Design polish support'],
        },
    },
    growth: {
        label: 'Growth',
        monthlyPrice: 299,
        description: 'The everyday package for centres ready to handle admissions and daily operations in one flow.',
        includes: [
            'Attendance register',
            'Calendar and routine planning',
            'Faster admissions follow-up and reminders',
            'Daily operational tracking',
        ],
        outcomes: [
            'Make daily admin feel calmer and more consistent',
            'Improve conversion from application to enrollment',
            'Keep the team aligned on attendance and child updates',
        ],
        website: {
            includes: ['Attendance and daily operations layer', 'Gallery + events + jobs sections', 'Richer public presentation'],
            suggestedAddOns: ['Domain setup help', 'Premium design pass'],
        },
    },
    pro: {
        label: 'Pro',
        monthlyPrice: 499,
        description: 'The full CentreConnect setup with website tools, premium support, and a faster rollout.',
        includes: [
            'Website and growth tools',
            'Priority onboarding and support',
            'Advanced configuration support',
            'Highest visibility and rollout support',
        ],
        outcomes: [
            'Operate admissions and visibility from one system',
            'Present a stronger public brand to parents',
            'Move faster with high-touch support when you launch',
        ],
        website: {
            includes: ['Full public + operations stack support', 'Highest website support priority', 'Full growth stack compatibility'],
            suggestedAddOns: ['Seasonal campaign design', 'Advanced integrations'],
        },
    },
};
const PUBLIC_TO_INTERNAL_TIER = {
    starter: 'basic',
    growth: 'standard',
    pro: 'premium',
};
const INTERNAL_TO_PUBLIC_PLAN = {
    basic: 'starter',
    standard: 'growth',
    premium: 'pro',
};
const PLAN_ALIAS_TO_PUBLIC_PLAN = {
    starter: 'starter',
    basic: 'starter',
    pilot: 'starter',
    growth: 'growth',
    standard: 'growth',
    pro: 'pro',
    premium: 'pro',
};
exports.PUBLIC_PLAN_OPTIONS = ['starter', 'growth', 'pro'];
function toPublicPlan(input, fallback = 'growth') {
    var _a;
    const key = (input !== null && input !== void 0 ? input : '').trim().toLowerCase();
    return (_a = PLAN_ALIAS_TO_PUBLIC_PLAN[key]) !== null && _a !== void 0 ? _a : fallback;
}
function isKnownPlanAlias(input) {
    const key = (input !== null && input !== void 0 ? input : '').trim().toLowerCase();
    if (!key)
        return false;
    return key in PLAN_ALIAS_TO_PUBLIC_PLAN;
}
function toInternalTier(input, fallback = 'basic') {
    const publicPlan = toPublicPlan(input, INTERNAL_TO_PUBLIC_PLAN[fallback]);
    return PUBLIC_TO_INTERNAL_TIER[publicPlan];
}
function toPublicPlanFromInternal(tier) {
    return INTERNAL_TO_PUBLIC_PLAN[tier];
}
function getPublicPlanDefinition(plan) {
    return PLAN_DEFINITIONS[plan];
}
function getInternalTierDefinition(tier) {
    return PLAN_DEFINITIONS[INTERNAL_TO_PUBLIC_PLAN[tier]];
}
function getPublicPlanLabel(plan) {
    return PLAN_DEFINITIONS[plan].label;
}
function getInternalTierLabel(tier) {
    return PLAN_DEFINITIONS[INTERNAL_TO_PUBLIC_PLAN[tier]].label;
}
function getPublicPlanPrice(plan) {
    return PLAN_DEFINITIONS[plan].monthlyPrice;
}
function getInternalTierPrice(tier) {
    return PLAN_DEFINITIONS[INTERNAL_TO_PUBLIC_PLAN[tier]].monthlyPrice;
}
function getWebsiteGuideByTier(tier) {
    const plan = INTERNAL_TO_PUBLIC_PLAN[tier];
    const definition = PLAN_DEFINITIONS[plan];
    return {
        label: definition.label,
        includes: definition.website.includes,
        suggestedAddOns: definition.website.suggestedAddOns,
    };
}
function normalizeSubscriptionStatus(status, fallback = 'trial') {
    const normalized = (status !== null && status !== void 0 ? status : '').trim().toLowerCase();
    if (normalized === 'trial' ||
        normalized === 'active' ||
        normalized === 'past_due' ||
        normalized === 'canceled' ||
        normalized === 'suspended') {
        return normalized;
    }
    return fallback;
}
