export const OPERATING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type OperatingDayKey = (typeof OPERATING_DAYS)[number]

export type OperatingWindow = {
  open: string
  close: string
}

export type CentreOperatingSchedule = Record<OperatingDayKey, OperatingWindow | null>

const DAY_LABELS: Record<OperatingDayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

const WEEKDAY_DEFAULT_WINDOW: OperatingWindow = {
  open: '07:00',
  close: '17:30',
}

const TIME_PATTERN = /^\d{2}:\d{2}$/

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value.trim())
}

function cloneWindow(window: OperatingWindow | null) {
  if (!window) return null
  return { open: window.open, close: window.close }
}

export function buildDefaultOperatingSchedule(): CentreOperatingSchedule {
  return {
    mon: cloneWindow(WEEKDAY_DEFAULT_WINDOW),
    tue: cloneWindow(WEEKDAY_DEFAULT_WINDOW),
    wed: cloneWindow(WEEKDAY_DEFAULT_WINDOW),
    thu: cloneWindow(WEEKDAY_DEFAULT_WINDOW),
    fri: cloneWindow(WEEKDAY_DEFAULT_WINDOW),
    sat: null,
    sun: null,
  }
}

export function normalizeOperatingSchedule(input: unknown, fallback?: CentreOperatingSchedule | null): CentreOperatingSchedule {
  const base = fallback ? { ...fallback } : buildDefaultOperatingSchedule()

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return base
  }

  const record = input as Record<string, unknown>
  const next = { ...base }

  for (const day of OPERATING_DAYS) {
    const raw = record[day]
    if (raw == null) {
      next[day] = null
      continue
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      next[day] = null
      continue
    }

    const open = (raw as Record<string, unknown>).open
    const close = (raw as Record<string, unknown>).close

    if (!isValidTime(open) || !isValidTime(close)) {
      next[day] = null
      continue
    }

    next[day] = { open, close }
  }

  return next
}

export function summarizeOperatingSchedule(schedule: CentreOperatingSchedule) {
  const segments: string[] = []
  let index = 0

  while (index < OPERATING_DAYS.length) {
    const day = OPERATING_DAYS[index]
    const current = schedule[day]
    const startIndex = index
    index += 1

    while (index < OPERATING_DAYS.length) {
      const compareDay = OPERATING_DAYS[index]
      const compare = schedule[compareDay]
      const currentKey = current ? `${current.open}-${current.close}` : 'closed'
      const compareKey = compare ? `${compare.open}-${compare.close}` : 'closed'
      if (currentKey != compareKey) break
      index += 1
    }

    if (!current) continue

    const startDay = DAY_LABELS[OPERATING_DAYS[startIndex]]
    const endDay = DAY_LABELS[OPERATING_DAYS[index - 1]]
    const label = startIndex === index - 1 ? startDay : `${startDay}-${endDay}`
    segments.push(`${label} ${current.open}-${current.close}`)
  }

  return segments.length > 0 ? segments.join(', ') : 'Hours shared on request'
}

export function getOperatingScheduleSummary(
  schedule: CentreOperatingSchedule | null | undefined,
  legacySummary?: string | null
) {
  if (schedule) return summarizeOperatingSchedule(schedule)
  if (legacySummary?.trim()) return legacySummary.trim()
  return summarizeOperatingSchedule(buildDefaultOperatingSchedule())
}

export function readOperatingScheduleFromSettings(settings: unknown) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const overrides = (settings as Record<string, unknown>).tenant_admin_overrides
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return null

  const rawSchedule = (overrides as Record<string, unknown>).operating_schedule
  if (!rawSchedule) return null
  return normalizeOperatingSchedule(rawSchedule, buildDefaultOperatingSchedule())
}

export function readOperatingHoursSummaryFromSettings(settings: unknown) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const overrides = (settings as Record<string, unknown>).tenant_admin_overrides
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return null
  const summary = (overrides as Record<string, unknown>).operating_hours
  return typeof summary === 'string' ? summary : null
}
