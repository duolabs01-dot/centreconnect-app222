import type { EcdCalendarFeedItem } from '@/components/ecd/ecd-ios-calendar-view'

type HolidayEntry = {
  date: string // YYYY-MM-DD
  name: string
}

// Fixed South African public holidays — same date every year
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

// Easter-relative holidays (Good Friday = -2, Family Day = +1 from Easter Sunday)
const EASTER_DATES: Record<number, string> = {
  2024: '2024-03-31',
  2025: '2025-04-20',
  2026: '2026-04-05',
  2027: '2027-03-28',
  2028: '2028-04-16',
}

function easterRelative(easterSunday: string, offsetDays: number): string {
  const d = new Date(`${easterSunday}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function getSaPublicHolidays(year: number): HolidayEntry[] {
  const holidays: HolidayEntry[] = FIXED_HOLIDAYS.map(({ month, day, name }) => ({
    date: `${year}-${pad(month)}-${pad(day)}`,
    name,
  }))

  const easter = EASTER_DATES[year]
  if (easter) {
    holidays.push({ date: easterRelative(easter, -2), name: 'Good Friday' })
    holidays.push({ date: easterRelative(easter, +1), name: 'Family Day' })
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
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
