const SLUG_ALIASES: Record<string, string[]> = {
  bajabulile: ['bajabulile-day-care-centre'],
  'bajabulile-day-care-centre': ['bajabulile'],
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function normalizeCentreSlug(value: string | null | undefined) {
  if (typeof value !== 'string') return null
  const decoded = safeDecode(value).trim().replace(/^\/+|\/+$/g, '')
  if (!decoded) return null
  return decoded.toLowerCase()
}

export function resolveCentreSlugCandidates(value: string | null | undefined) {
  if (typeof value !== 'string') return []
  const raw = value.trim()
  if (!raw) return []

  const decoded = safeDecode(raw).trim()
  const normalized = normalizeCentreSlug(raw)
  const aliasCandidates = normalized ? SLUG_ALIASES[normalized] ?? [] : []
  return Array.from(new Set([normalized, decoded, raw, ...aliasCandidates].filter((entry): entry is string => Boolean(entry))))
}
