"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTierEntitlement = hasTierEntitlement;
exports.canUseWebsiteSection = canUseWebsiteSection;
exports.getAllowedWebsiteSections = getAllowedWebsiteSections;
exports.filterWebsiteSectionsByTier = filterWebsiteSectionsByTier;
const plans_1 = require("@/lib/billing/plans");
const tierRank = {
    basic: 1,
    standard: 2,
    premium: 3,
};
const minTierByEntitlement = {
    'website.section.gallery': 'standard',
    'website.section.events': 'standard',
    'website.section.jobs': 'standard',
};
const sectionEntitlementMap = {
    gallery: 'website.section.gallery',
    events: 'website.section.events',
    jobs: 'website.section.jobs',
};
const allWebsiteSections = ['hero', 'about', 'programs', 'gallery', 'events', 'jobs', 'contact'];
function hasTierEntitlement(tierInput, key) {
    const tier = (0, plans_1.toInternalTier)(tierInput, 'basic');
    return tierRank[tier] >= tierRank[minTierByEntitlement[key]];
}
function canUseWebsiteSection(tierInput, sectionKey) {
    const mappedEntitlement = sectionEntitlementMap[sectionKey];
    if (!mappedEntitlement)
        return true;
    return hasTierEntitlement(tierInput, mappedEntitlement);
}
function getAllowedWebsiteSections(tierInput) {
    return allWebsiteSections.filter((sectionKey) => canUseWebsiteSection(tierInput, sectionKey));
}
function filterWebsiteSectionsByTier(sectionKeys, tierInput) {
    const requested = sectionKeys
        .map((value) => value.trim().toLowerCase())
        .filter((value) => allWebsiteSections.includes(value));
    const uniqueRequested = Array.from(new Set(requested));
    const allowedSet = new Set(getAllowedWebsiteSections(tierInput));
    const filtered = uniqueRequested.filter((key) => allowedSet.has(key));
    return filtered.length > 0 ? filtered : ['hero', 'about', 'programs', 'contact'];
}
