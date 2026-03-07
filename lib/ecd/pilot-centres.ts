const PILOT_CENTRE_KEYWORDS = ['sakhisizwe', 'bajhabulile', 'bajabulile'] as const

export const UNCLAIMED_CENTRE_DISCLAIMER =
  'This centre is not yet using our online portal. Some details might be outdated, so we recommend reaching out directly using the WhatsApp or call buttons below.'

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
