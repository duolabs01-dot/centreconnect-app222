import type { EcdCalendarFeedItem } from '@/components/ecd/ecd-ios-calendar-view'

type HolidayEntry = {
  date: string // YYYY-MM-DD
  name: string
}

// Fixed South African public holidays — same date every year.
// Source: https://www.gov.za/about-sa/public-holidays
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1,  day: 1,  name: 'New Year\u2019s Day' },
  { month: 3,  day: 21, name: 'Human Rights Day' },
  { month: 4,  day: 27, name: 'Freedom Day' },
  { month: 5,  day: 1,  name: 'Workers\u2019 Day' },
  { month: 6,  day: 16, name: 'Youth Day' },
  { month: 8,  day: 9,  name: 'National Women\u2019s Day' },
  { month: 9,  day: 24, name: 'Heritage Day' },
  { month: 12, day: 16, name: 'Day of Reconciliation' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 12, day: 26, name: 'Day of Goodwill' },
]

// Compute Easter Sunday for any year using the Anonymous Gregorian algorithm.
// Replaces the previous hardcoded EASTER_DATES lookup (which only covered 2024-2028).
function computeEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

export function getSaPublicHolidays(year: number): HolidayEntry[] {
  const holidays: HolidayEntry[] = FIXED_HOLIDAYS.map(({ month, day, name }) => ({
    date: `${year}-${pad(month)}-${pad(day)}`,
    name,
  }))

  // Easter-relative holidays (Good Friday = -2, Family Day = +1 from Easter Sunday)
  const easter = computeEasterSunday(year)
  holidays.push({ date: dateKey(addDays(easter, -2)), name: 'Good Friday' })
  holidays.push({ date: dateKey(addDays(easter, 1)), name: 'Family Day' })

  // When a public holiday falls on a Sunday, the following Monday is observed.
  // Source: https://www.gov.za/about-sa/public-holidays
  const observed: HolidayEntry[] = []
  for (const holiday of holidays) {
    const [y, m, d] = holiday.date.split('-').map(Number)
    const date = new Date(y, (m ?? 1) - 1, d ?? 1)
    if (date.getDay() === 0) {
      observed.push({
        date: dateKey(addDays(date, 1)),
        name: `${holiday.name} (Observed)`,
      })
    }
  }

  return [...holidays, ...observed].sort((a, b) => a.date.localeCompare(b.date))
}

export function getSaHolidayFeedItems(year: number): EcdCalendarFeedItem[] {
  return getSaPublicHolidays(year).map((holiday) => ({
    id: `holiday:${holiday.date}`,
    title: holiday.name,
    description: 'South African public holiday',
    event_date: holiday.date,
    start_time: null,
    end_time: null,
    all_day: true,
    is_public: true,
    source: 'holiday' as const,
  }))
}
