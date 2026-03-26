export interface CentreCardData {
  id: string
  slug: string
  name: string
  suburb: string | null
  area: string | null
  fee_min: number | null
  fee_max: number | null
  age_min_months: number | null
  age_max_months: number | null
  hero_image_url: string | null
  is_verified: boolean
  is_dsd_registered: boolean
  vacancy_status: 'available' | 'limited' | 'full' | null
  is_claimed: boolean
}

/**
 * Parse an age_groups string array (e.g. ["0-2 years", "2-6 years"])
 * into min/max months for the CentreCardData shape.
 */
export function parseAgeGroupsToMonths(ageGroups: string[] | null | undefined): {
  age_min_months: number | null
  age_max_months: number | null
} {
  if (!ageGroups || ageGroups.length === 0) return { age_min_months: null, age_max_months: null }

  let minMonths: number | null = null
  let maxMonths: number | null = null

  for (const group of ageGroups) {
    const lower = group.toLowerCase()

    // "X-Y years" or "X – Y years"
    const yearRange = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*year/)
    if (yearRange) {
      const lo = parseInt(yearRange[1]) * 12
      const hi = parseInt(yearRange[2]) * 12
      if (minMonths === null || lo < minMonths) minMonths = lo
      if (maxMonths === null || hi > maxMonths) maxMonths = hi
      continue
    }

    // "X months - Y years"
    const mixedRange = lower.match(/(\d+)\s*month.*?(\d+)\s*year/)
    if (mixedRange) {
      const lo = parseInt(mixedRange[1])
      const hi = parseInt(mixedRange[2]) * 12
      if (minMonths === null || lo < minMonths) minMonths = lo
      if (maxMonths === null || hi > maxMonths) maxMonths = hi
      continue
    }

    // "0-6 months"
    const monthRange = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*month/)
    if (monthRange) {
      const lo = parseInt(monthRange[1])
      const hi = parseInt(monthRange[2])
      if (minMonths === null || lo < minMonths) minMonths = lo
      if (maxMonths === null || hi > maxMonths) maxMonths = hi
      continue
    }
  }

  return { age_min_months: minMonths, age_max_months: maxMonths }
}

/** Format parsed months into a display string like "0–2 yrs" */
export function formatAgeRange(minMonths: number | null, maxMonths: number | null): string | null {
  if (minMonths === null && maxMonths === null) return null
  const toYears = (m: number) => (m % 12 === 0 ? `${m / 12}` : `${(m / 12).toFixed(1)}`)
  if (minMonths !== null && maxMonths !== null) {
    return `${toYears(minMonths)}\u2013${toYears(maxMonths)} yrs`
  }
  if (maxMonths !== null) return `Up to ${toYears(maxMonths)} yrs`
  if (minMonths !== null) return `${toYears(minMonths)}+ yrs`
  return null
}
