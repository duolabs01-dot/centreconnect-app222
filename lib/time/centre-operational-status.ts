import {
  buildDefaultOperatingSchedule,
  getOperatingScheduleSummary,
  type CentreOperatingSchedule,
  type OperatingDayKey,
} from './centre-operating-schedule'

const SOUTH_AFRICA_TIMEZONE = 'Africa/Johannesburg'

const WEEKDAY_KEYS: Record<string, OperatingDayKey> = {
  sun: 'sun',
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
}

function toMinutes(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number.parseInt(hourText ?? '0', 10)
  const minute = Number.parseInt(minuteText ?? '0', 10)
  return hour * 60 + minute
}

function getJohannesburgClock(now: Date) {
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: SOUTH_AFRICA_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const map = new Map(parts.map((part) => [part.type, part.value]))
  const weekdayLabel = String(map.get('weekday') ?? '').slice(0, 3).toLowerCase()
  const dayKey = WEEKDAY_KEYS[weekdayLabel] ?? 'mon'
  const hour = Number.parseInt(String(map.get('hour') ?? '0'), 10)
  const minute = Number.parseInt(String(map.get('minute') ?? '0'), 10)
  return { dayKey, minutes: hour * 60 + minute }
}

export function getCentreOperationalStatus(
  schedule: CentreOperatingSchedule | null | undefined = buildDefaultOperatingSchedule(),
  now: Date = new Date(),
  legacySummary?: string | null
) {
  const resolvedSchedule = schedule ?? buildDefaultOperatingSchedule()
  const { dayKey, minutes } = getJohannesburgClock(now)
  const window = resolvedSchedule[dayKey]

  if (!window) {
    return {
      isOnline: false,
      label: 'Closed now',
      schedule: getOperatingScheduleSummary(resolvedSchedule, legacySummary),
    }
  }

  const openMinutes = toMinutes(window.open)
  const closeMinutes = toMinutes(window.close)
  const isOnline = minutes >= openMinutes && minutes < closeMinutes

  return {
    isOnline,
    label: isOnline ? 'Open now' : 'Closed now',
    schedule: getOperatingScheduleSummary(resolvedSchedule, legacySummary),
  }
}
