'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn, formatDate } from '@/lib/utils'

export type CalendarViewMode = 'month' | 'week' | 'day' | 'timetable'
export type CalendarVisibility = 'all' | 'public' | 'internal'
export type CalendarScope = 'all' | 'upcoming' | 'past'

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  is_public: boolean
}

type CalendarInteractiveViewProps = {
  events: CalendarEvent[]
  initialView: CalendarViewMode
  initialVisibility: CalendarVisibility
  initialScope: CalendarScope
  initialFocusDayKey: string
  initialMonthKey: string
  todayKey: string
  nowBadge: string
}

function toMonthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDayKey(value?: string) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearRaw, monthRaw, dayRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return new Date(year, month - 1, day)
}

function parseMonthKey(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  const [yearRaw, monthRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return { year, month }
}

function weekdayIndexMondayFirst(date: Date) {
  return (date.getDay() + 6) % 7
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return '--'
  const start = startTime ? startTime.slice(0, 5) : '--'
  const end = endTime ? endTime.slice(0, 5) : null
  return end ? `${start} - ${end}` : start
}

type TermWindow = {
  id: string
  label: string
  start: string
  end: string
  chipClass: string
  dayToneClass: string
}

const WEEKDAY_SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const TIMETABLE_SLOTS: Array<{ time: string; weekA: string; weekB: string }> = [
  { time: '07:00', weekA: 'Arrival and health check', weekB: 'Arrival and wellbeing check' },
  { time: '08:00', weekA: 'Circle time and attendance', weekB: 'Morning movement and attendance' },
  { time: '09:00', weekA: 'Literacy focus block', weekB: 'Numeracy focus block' },
  { time: '10:00', weekA: 'Outdoor play and snack', weekB: 'Music and movement' },
  { time: '11:30', weekA: 'Project learning stations', weekB: 'Creative arts stations' },
  { time: '13:00', weekA: 'Lunch and pickup wave 1', weekB: 'Lunch and pickup wave 1' },
  { time: '15:00', weekA: 'Aftercare structured play', weekB: 'Aftercare homework support' },
]

function buildTermWindows(year: number): TermWindow[] {
  return [
    {
      id: `${year}-t1`,
      label: 'Term 1',
      start: `${year}-01-15`,
      end: `${year}-03-28`,
      chipClass: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      dayToneClass: 'bg-cyan-50/40',
    },
    {
      id: `${year}-t2`,
      label: 'Term 2',
      start: `${year}-04-08`,
      end: `${year}-06-28`,
      chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      dayToneClass: 'bg-emerald-50/40',
    },
    {
      id: `${year}-t3`,
      label: 'Term 3',
      start: `${year}-07-22`,
      end: `${year}-10-04`,
      chipClass: 'border-amber-200 bg-amber-50 text-amber-800',
      dayToneClass: 'bg-amber-50/35',
    },
    {
      id: `${year}-t4`,
      label: 'Term 4',
      start: `${year}-10-14`,
      end: `${year}-12-10`,
      chipClass: 'border-violet-200 bg-violet-50 text-violet-800',
      dayToneClass: 'bg-violet-50/40',
    },
  ]
}

function getIsoWeekNumber(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function getEasterSunday(year: number) {
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

function getSouthAfricaHolidays(year: number) {
  const easter = getEasterSunday(year)
  const goodFriday = addDays(easter, -2)
  const familyDay = addDays(easter, 1)

  const list = [
    { date: `${year}-01-01`, name: 'New Year\'s Day' },
    { date: toDateKey(goodFriday), name: 'Good Friday' },
    { date: toDateKey(familyDay), name: 'Family Day' },
    { date: `${year}-03-21`, name: 'Human Rights Day' },
    { date: `${year}-04-27`, name: 'Freedom Day' },
    { date: `${year}-05-01`, name: 'Workers Day' },
    { date: `${year}-06-16`, name: 'Youth Day' },
    { date: `${year}-08-09`, name: 'Women\'s Day' },
    { date: `${year}-09-24`, name: 'Heritage Day' },
    { date: `${year}-12-16`, name: 'Day of Reconciliation' },
    { date: `${year}-12-25`, name: 'Christmas Day' },
    { date: `${year}-12-26`, name: 'Day of Goodwill' },
  ]

  const observed: Array<{ date: string; name: string }> = []
  for (const holiday of list) {
    const [y, m, d] = holiday.date.split('-').map(Number)
    const date = new Date(y, (m ?? 1) - 1, d ?? 1)
    if (date.getDay() === 0) {
      observed.push({ date: toDateKey(addDays(date, 1)), name: `${holiday.name} (Observed)` })
    }
  }

  return [...list, ...observed]
}

export function CalendarInteractiveView({
  events,
  initialView,
  initialVisibility,
  initialScope,
  initialFocusDayKey,
  initialMonthKey,
  todayKey,
  nowBadge,
}: CalendarInteractiveViewProps) {
  const fallbackDate = parseDayKey(todayKey) ?? new Date()
  const parsedMonth = parseMonthKey(initialMonthKey)
  const initialMonthDate = parsedMonth
    ? new Date(parsedMonth.year, parsedMonth.month - 1, 1)
    : new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1)

  const [view, setView] = useState<CalendarViewMode>(initialView)
  const [visibility, setVisibility] = useState<CalendarVisibility>(initialVisibility)
  const [scope, setScope] = useState<CalendarScope>(initialScope)
  const [focusDate, setFocusDate] = useState<Date>(parseDayKey(initialFocusDayKey) ?? fallbackDate)
  const [monthDate, setMonthDate] = useState<Date>(initialMonthDate)

  const selectedDate = useMemo(
    () => (view === 'month' ? monthDate : new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)),
    [view, monthDate, focusDate]
  )
  const focusDayKey = formatDayKey(focusDate)
  const monthKey = toMonthKey(selectedDate)

  const weekStart = new Date(focusDate)
  weekStart.setDate(focusDate.getDate() - weekdayIndexMondayFirst(focusDate))

  const periodLabel =
    view === 'month'
      ? selectedDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `Week of ${weekStart.toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })}`
        : view === 'timetable'
          ? `School timetable week of ${weekStart.toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })}`
          : `Day of ${focusDate.toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })}`

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (visibility === 'public' && !event.is_public) return false
      if (visibility === 'internal' && event.is_public) return false
      if (scope === 'upcoming' && event.event_date < todayKey) return false
      if (scope === 'past' && event.event_date >= todayKey) return false
      return true
    })
  }, [events, visibility, scope, todayKey])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of filteredEvents) {
      const list = map.get(event.event_date) ?? []
      list.push(event)
      map.set(event.event_date, list)
    }
    return map
  }, [filteredEvents])

  const gridFocusDate = view === 'month' ? selectedDate : focusDate
  const firstGridDay = useMemo(() => {
    const d = new Date(gridFocusDate)
    d.setDate(d.getDate() - weekdayIndexMondayFirst(gridFocusDate))
    return d
  }, [gridFocusDate])

  const days = useMemo(() => {
    const values: Date[] = []
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(firstGridDay)
      d.setDate(firstGridDay.getDate() + i)
      values.push(d)
    }
    return values
  }, [firstGridDay])

  const weekStartIndex = days.findIndex((day) => formatDayKey(day) === formatDayKey(weekStart))
  const weekDays = weekStartIndex >= 0 ? days.slice(weekStartIndex, weekStartIndex + 7) : days.slice(0, 7)
  const dayViewEvents = eventsByDate.get(focusDayKey) ?? []
  const agendaEvents = filteredEvents.slice(0, 12)
  const focusWeekNumber = getIsoWeekNumber(focusDate)
  const activeWeekType = focusWeekNumber % 2 === 0 ? 'B' : 'A'
  const termWindows = useMemo(() => buildTermWindows(selectedDate.getFullYear()), [selectedDate])
  const activeTerm = termWindows.find((term) => focusDayKey >= term.start && focusDayKey <= term.end) ?? null
  const holidayMap = useMemo(() => {
    const years = new Set(days.map((day) => day.getFullYear()))
    const map = new Map<string, string>()
    for (const year of years) {
      const holidays = getSouthAfricaHolidays(year)
      for (const holiday of holidays) {
        map.set(holiday.date, holiday.name)
      }
    }
    return map
  }, [days])
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function setViewMode(next: CalendarViewMode) {
    setView(next)
    if (next === 'month') {
      setMonthDate(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1))
    }
  }

  function goToday() {
    const today = parseDayKey(todayKey) ?? new Date()
    setFocusDate(today)
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  function goPrevious() {
    if (view === 'month') {
      setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
      return
    }
    setFocusDate((prev) => {
      const nextDate = new Date(prev)
      nextDate.setDate(nextDate.getDate() - (view === 'week' || view === 'timetable' ? 7 : 1))
      setMonthDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
      return nextDate
    })
  }

  function goNext() {
    if (view === 'month') {
      setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
      return
    }
    setFocusDate((prev) => {
      const nextDate = new Date(prev)
      nextDate.setDate(nextDate.getDate() + (view === 'week' || view === 'timetable' ? 7 : 1))
      setMonthDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
      return nextDate
    })
  }

  function buildEditHref(eventId: string) {
    const params = new URLSearchParams()
    params.set('month', monthKey)
    if (view !== 'month') {
      params.set('view', view)
      params.set('focus', focusDayKey)
    }
    if (visibility !== 'all') params.set('visibility', visibility)
    if (scope !== 'all') params.set('scope', scope)
    params.set('edit', eventId)
    return `/ecd/calendar?${params.toString()}#calendar`
  }

  function renderDayCell(day: Date) {
    const dayKey = formatDayKey(day)
    const dayEvents = eventsByDate.get(dayKey) ?? []
    const isInSelectedMonth = day.getMonth() === selectedDate.getMonth()
    const isToday = dayKey === todayKey
    const isFocused = dayKey === focusDayKey
    const holidayName = holidayMap.get(dayKey) ?? null
    const dayTerms = buildTermWindows(day.getFullYear())
    const dayTerm = dayTerms.find((term) => dayKey >= term.start && dayKey <= term.end) ?? null

    return (
      <button
        key={dayKey}
        type="button"
        onClick={() => {
          setFocusDate(day)
          if (view === 'month') {
            setMonthDate(new Date(day.getFullYear(), day.getMonth(), 1))
          }
        }}
        className={cn(
          'min-h-[56px] rounded-xl border p-2 text-left shadow-[var(--shadow-elevation-1)] transition-colors sm:min-h-[84px]',
          isInSelectedMonth
            ? 'border-slate-200 bg-white text-foreground'
            : 'border-slate-100 bg-slate-50/80 text-muted-foreground',
          isInSelectedMonth && dayTerm ? dayTerm.dayToneClass : '',
          holidayName ? 'border-rose-200 bg-rose-50/40' : '',
          isFocused ? 'ring-2 ring-cyan-400/70' : ''
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <p
            className={cn(
              'text-xs font-semibold leading-none',
              isToday && isInSelectedMonth
                ? 'rounded-full bg-cyan-100 px-2 py-1 text-cyan-900 ring-1 ring-cyan-200'
                : 'text-slate-700'
            )}
          >
            {day.getDate()}
          </p>
          {dayEvents.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              {dayEvents.length}
            </span>
          ) : holidayName ? (
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">PH</span>
          ) : null}
        </div>
        <div className="space-y-1">
          {holidayName ? (
            <div
              className="truncate rounded-md border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-800"
              title={holidayName}
            >
              {holidayName}
            </div>
          ) : null}
          {dayEvents.slice(0, 2).map((event) => (
            <div
              key={event.id}
              className={cn(
                'truncate rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight',
                event.is_public ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
              )}
              title={`${event.title} (${formatTimeRange(event.start_time, event.end_time)})`}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 2 ? (
            <p className="text-xs text-slate-500">+{dayEvents.length - 2} more</p>
          ) : null}
        </div>
      </button>
    )
  }

  const monthStartKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
  const monthEndKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

  return (
    <CardSurface>
      <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-[var(--shadow-elevation-3)]">
          <div className="flex flex-wrap items-center gap-2">
            {(['month', 'week', 'day', 'timetable'] as CalendarViewMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setViewMode(option)}
                className={cn(
                  'min-h-11 rounded-full px-4 py-2 text-sm font-semibold capitalize transition duration-150',
                  option === view
                    ? 'bg-cyan-600 text-cyan-50 shadow-[var(--shadow-elevation-2)]'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700'
                )}
              >
                {option === 'timetable' ? 'Week A/B' : option}
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={goPrevious}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
            >
              Previous
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToday}
              className="h-auto rounded-xl border-slate-200 py-2 text-sm text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
            >
              Today
            </Button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
            >
              Next
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FilterChip label="All" active={visibility === 'all'} onClick={() => setVisibility('all')} />
            <FilterChip label="Public" active={visibility === 'public'} tone="emerald" onClick={() => setVisibility('public')} />
            <FilterChip label="Internal" active={visibility === 'internal'} tone="amber" onClick={() => setVisibility('internal')} />
            <FilterChip label="Upcoming" active={scope === 'upcoming'} tone="blue" onClick={() => setScope('upcoming')} />
            <FilterChip label="Past" active={scope === 'past'} onClick={() => setScope('past')} />
            {view === 'timetable' ? (
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
                Week {activeWeekType} - ISO {focusWeekNumber}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[var(--shadow-elevation-3)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">School Terms</p>
            {activeTerm ? (
              <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', activeTerm.chipClass)}>
                Active: {activeTerm.label}
              </span>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Out of term
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {termWindows.map((term) => (
              <div key={term.id} className={cn('rounded-xl border px-3 py-2 text-xs font-semibold', term.chipClass)}>
                <p>{term.label}</p>
                <p className="mt-1 text-xs font-medium opacity-90">
                  {term.start} to {term.end}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-[var(--shadow-elevation-3)]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{periodLabel}</h2>
            <span className="inline-flex w-fit items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
              {nowBadge}
            </span>
          </div>

          {view === 'day' ? (
            <div className="space-y-3">
              {dayViewEvents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                  No events scheduled for this day.
                </p>
              ) : (
                dayViewEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-foreground shadow-[var(--shadow-elevation-2)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900">{event.title}</p>
                      <StatusBadge status={event.is_public ? 'approved' : 'in_review'} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(event.event_date)} - {formatTimeRange(event.start_time, event.end_time)}
                    </p>
                    {event.description ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{event.description}</p>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="border-slate-200 text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
                      >
                        <Link href={buildEditHref(event.id)}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : view === 'timetable' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                  Week {activeWeekType} timetable
                </p>
                <p className="mt-1 text-sm text-cyan-900">
                  Structured planning blocks for school operations this week.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {WEEKDAY_SCHOOL_DAYS.map((dayName) => (
                  <div key={dayName} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{dayName}</p>
                    <div className="mt-2 space-y-1.5">
                      {TIMETABLE_SLOTS.map((slot) => (
                        <div key={`${dayName}-${slot.time}`} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                          <p className="text-xs font-semibold text-slate-500">{slot.time}</p>
                          <p className="text-xs font-medium text-slate-800">
                            {activeWeekType === 'A' ? slot.weekA : slot.weekB}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[540px] grid-cols-7 gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-2 sm:min-w-[640px]">
                {weekdayLabels.map((label) => (
                  <div key={label} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </div>
                ))}
                {(view === 'week' ? weekDays : days).map((day) => renderDayCell(day))}
              </div>
            </div>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <EmptyState title="No events in this view" description="Try switching filters or creating a new event." />
        ) : (
          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">School Agenda</p>
            {agendaEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-[var(--shadow-elevation-2)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(event.event_date)} - {formatTimeRange(event.start_time, event.end_time)}</p>
                  </div>
                  <StatusBadge status={event.is_public ? 'approved' : 'in_review'} />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="border-slate-200 text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
                  >
                    <Link href={buildEditHref(event.id)}>Edit</Link>
                  </Button>
                </div>
              </div>
            ))}
            {filteredEvents.length > agendaEvents.length ? (
              <p className="px-1 text-xs text-slate-500">
                Showing first {agendaEvents.length} events for this filter. Refine by view/day for more.
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Public
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Internal
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Public Holiday
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-cyan-500" /> Week {activeWeekType}
          </span>
          <span className="break-words">Month: {monthStartKey} to {monthEndKey}</span>
        </div>
      </div>
    </CardSurface>
  )
}

function CardSurface({ children }: { children: ReactNode }) {
  return (
    <div
      id="calendar"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-elevation-4)]"
    >
      {children}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  tone = 'default',
}: {
  label: string
  active: boolean
  onClick: () => void
  tone?: 'default' | 'emerald' | 'amber' | 'blue'
}) {
  const toneClass =
    tone === 'emerald'
      ? active
        ? 'bg-emerald-700 text-emerald-50'
        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      : tone === 'amber'
        ? active
          ? 'bg-amber-700 text-amber-50'
          : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
        : tone === 'blue'
          ? active
            ? 'bg-primary text-primary-foreground'
            : 'border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
          : active
            ? 'bg-cyan-600 text-cyan-50'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('min-h-11 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors', toneClass)}
    >
      {label}
    </button>
  )
}


