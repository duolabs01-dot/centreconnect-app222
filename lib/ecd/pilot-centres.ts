const PILOT_CENTRE_KEYWORDS = ['sakhisizwe', 'bajhabulile', 'bajabulile'] as const

export const UNCLAIMED_CENTRE_DISCLAIMER =
  'This is what is shown online. The centre has not submitted updated details yet. Please use the contact details below to reach them directly.'

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
