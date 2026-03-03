const SOUTH_AFRICA_TIMEZONE = 'Africa/Johannesburg'

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

type OperationalWindow = {
  openMinutes: number
  closeMinutes: number
}

function getOperationalWindow(dayIndex: number): OperationalWindow | null {
  if (dayIndex === 0) return null // Sunday closed
  if (dayIndex === 6) {
    return { openMinutes: 8 * 60, closeMinutes: 13 * 60 } // Saturday
  }
  return { openMinutes: 7 * 60, closeMinutes: 17 * 60 + 30 } // Weekdays
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
  const dayIndex = WEEKDAY_INDEX[weekdayLabel] ?? 1
  const hour = Number.parseInt(String(map.get('hour') ?? '0'), 10)
  const minute = Number.parseInt(String(map.get('minute') ?? '0'), 10)
  return { dayIndex, minutes: hour * 60 + minute }
}

export function getCentreOperationalStatus(now: Date = new Date()) {
  const { dayIndex, minutes } = getJohannesburgClock(now)
  const window = getOperationalWindow(dayIndex)

  if (!window) {
    return {
      isOnline: false,
      label: 'Closed now',
      schedule: 'Mon-Fri 07:00-17:30, Sat 08:00-13:00',
    }
  }

  const isOnline = minutes >= window.openMinutes && minutes < window.closeMinutes
  return {
    isOnline,
    label: isOnline ? 'Online now' : 'Closed now',
    schedule: 'Mon-Fri 07:00-17:30, Sat 08:00-13:00',
  }
}
