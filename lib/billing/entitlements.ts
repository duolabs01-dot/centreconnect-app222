import { toInternalTier, type InternalTier } from '@/lib/billing/plans'

export type WebsiteSectionKey = 'hero' | 'about' | 'programs' | 'gallery' | 'events' | 'jobs' | 'contact'
export type EntitlementKey = 'website.section.gallery' | 'website.section.events' | 'website.section.jobs'

const tierRank: Record<InternalTier, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
}

const minTierByEntitlement: Record<EntitlementKey, InternalTier> = {
  'website.section.gallery': 'standard',
  'website.section.events': 'standard',
  'website.section.jobs': 'standard',
}

const sectionEntitlementMap: Partial<Record<WebsiteSectionKey, EntitlementKey>> = {
  gallery: 'website.section.gallery',
  events: 'website.section.events',
  jobs: 'website.section.jobs',
}

const allWebsiteSections: WebsiteSectionKey[] = ['hero', 'about', 'programs', 'gallery', 'events', 'jobs', 'contact']

export function hasTierEntitlement(tierInput: string | null | undefined, key: EntitlementKey) {
  const tier = toInternalTier(tierInput, 'basic')
  return tierRank[tier] >= tierRank[minTierByEntitlement[key]]
}

export function canUseWebsiteSection(tierInput: string | null | undefined, sectionKey: WebsiteSectionKey) {
  const mappedEntitlement = sectionEntitlementMap[sectionKey]
  if (!mappedEntitlement) return true
  return hasTierEntitlement(tierInput, mappedEntitlement)
}

export function getAllowedWebsiteSections(tierInput: string | null | undefined): WebsiteSectionKey[] {
  return allWebsiteSections.filter((sectionKey) => canUseWebsiteSection(tierInput, sectionKey))
}

export function filterWebsiteSectionsByTier(sectionKeys: string[], tierInput: string | null | undefined): WebsiteSectionKey[] {
  const requested = sectionKeys
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is WebsiteSectionKey => allWebsiteSections.includes(value as WebsiteSectionKey))
  const uniqueRequested = Array.from(new Set(requested))
  const allowedSet = new Set(getAllowedWebsiteSections(tierInput))
  const filtered = uniqueRequested.filter((key) => allowedSet.has(key))
  return filtered.length > 0 ? filtered : ['hero', 'about', 'programs', 'contact']
}

