const AGE_RANGE_PATTERN = /^(\d+)(?:-(\d+)|\+)?$/

type AgeBounds = {
  start: number
  end: number
  openEnded: boolean
}

function parseAgeBounds(token: string): AgeBounds | null {
  const match = token.trim().match(AGE_RANGE_PATTERN)
  if (!match) return null

  const start = Number(match[1])
  const explicitEnd = match[2] ? Number(match[2]) : null
  const openEnded = token.includes('+')

  if (!Number.isFinite(start)) return null
  if (openEnded) {
    return { start, end: start, openEnded: true }
  }

  const end = explicitEnd ?? start
  if (!Number.isFinite(end)) return null

  return {
    start: Math.max(0, start),
    end: Math.max(start, end),
    openEnded: false,
  }
}

export function deriveAgeRangeFromGroups(ageGroups: string[] | null | undefined) {
  const parsed = (ageGroups ?? [])
    .map(parseAgeBounds)
    .filter((value): value is AgeBounds => Boolean(value))

  if (parsed.length === 0) {
    return { start: '0', end: '6' }
  }

  return {
    start: String(Math.min(...parsed.map((value) => value.start))),
    end: String(Math.max(...parsed.map((value) => value.end))),
  }
}

export function formatAgeRangeSummary(ageGroups: string[] | null | undefined, fallback = 'All ages welcome') {
  const parsed = (ageGroups ?? [])
    .map(parseAgeBounds)
    .filter((value): value is AgeBounds => Boolean(value))

  if (parsed.length === 0) return fallback

  const start = Math.min(...parsed.map((value) => value.start))
  const end = Math.max(...parsed.map((value) => value.end))
  const hasOpenEnded = parsed.some((value) => value.openEnded)

  if (hasOpenEnded) {
    return `${start}+ years`
  }

  if (start === end) {
    return `${start} year${start === 1 ? '' : 's'}`
  }

  return `${start}-${end} years`
}
