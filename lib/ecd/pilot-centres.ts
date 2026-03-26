const PILOT_CENTRE_KEYWORDS = ['sakhisizwe', 'bajhabulile', 'bajabulile'] as const

export const UNCLAIMED_CENTRE_DISCLAIMER =
  'This cr\u00E8che isn\u2019t on CentreConnect yet. Contact them directly using the buttons above.'

function normalizeIdentifier(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isPilotCentreIdentity(input: { name?: string | null; slug?: string | null }) {
  const normalizedName = normalizeIdentifier(input.name)
  const normalizedSlug = normalizeIdentifier(input.slug)

  return PILOT_CENTRE_KEYWORDS.some(
    (keyword) => normalizedName.includes(keyword) || normalizedSlug.includes(keyword)
  )
}
