'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { BellRing, CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Megaphone, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type EcdCalendarFeedSource = 'event' | 'attendance' | 'announcement' | 'reminder'

export type EcdCalendarFeedItem = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  is_public: boolean
  source: EcdCalendarFeedSource
  href?: string
}

type EcdIosCalendarViewProps = {
  items: EcdCalendarFeedItem[]
  initialMonthKey: string
  initialDayKey: string
  todayKey: string
  nowBadge: string
}

type SourceMeta = {
  label: string
  dotClass: string
  chipClass: string
  icon: LucideIcon
}

const SOURCE_META: Record<EcdCalendarFeedSource, SourceMeta> = {
  event: {
    label: 'Event',
    dotClass: 'bg-teal-500',
    chipClass: 'border-teal-200 bg-teal-50 text-teal-700',
    icon: CalendarCheck2,
  },
  attendance: {
    label: 'Attendance',
    dotClass: 'bg-sky-500',
    chipClass: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: UsersRound,
  },
  reminder: {
    label: 'Reminder',
    dotClass: 'bg-amber-500',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: BellRing,
  },
  announcement: {
    label: 'Announcement',
    dotClass: 'bg-emerald-500',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: Megaphone,
  },
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

function parseDayKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return new Date(year, month - 1, day)
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function startOfMonthGrid(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const offset = mondayIndex(first)
  first.setDate(first.getDate() - offset)
  return first
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

function formatLongDay(dayKey: string) {
  const parsed = parseDayKey(dayKey)
  if (!parsed) return dayKey
  return parsed.toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toTimeRange(start: string | null, end: string | null, allDay: boolean) {
  if (allDay) return 'All-day'
  if (start && end) return `${start} - ${end}`
  if (start) return start
  return 'Time TBC'
}

function sortDayItems(items: EcdCalendarFeedItem[]) {
  return [...items].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    const aStart = a.start_time ?? '99:99'
    const bStart = b.start_time ?? '99:99'
    if (aStart !== bStart) return aStart.localeCompare(bStart)
    return a.title.localeCompare(b.title)
  })
}

export function EcdIosCalendarView({
  items,
  initialMonthKey,
  initialDayKey,
  todayKey,
  nowBadge,
}: EcdIosCalendarViewProps) {
  const todayDate = parseDayKey(todayKey) ?? new Date()
  const [monthDate, setMonthDate] = useState<Date>(
    parseMonthKey(initialMonthKey) ?? new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  )
  const [selectedDay, setSelectedDay] = useState<Date>(
    parseDayKey(initialDayKey) ?? new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())
  )

  const monthKey = toMonthKey(monthDate)
  const selectedDayKey = toDayKey(selectedDay)

  const itemsByDate = useMemo(() => {
    const map = new Map<string, EcdCalendarFeedItem[]>()
    for (const item of items) {
      const current = map.get(item.event_date) ?? []
      current.push(item)
      map.set(item.event_date, current)
    }
    return map
  }, [items])

  const monthDays = useMemo(() => {
    const start = startOfMonthGrid(monthDate)
    const days: Date[] = []
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      days.push(day)
    }
    return days
  }, [monthDate])

  const selectedDayItems = useMemo(() => {
    return sortDayItems(itemsByDate.get(selectedDayKey) ?? [])
  }, [itemsByDate, selectedDayKey])

  const monthSummary = useMemo(() => {
    const monthStart = `${monthKey}-01`
    const monthEndDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const monthEnd = toDayKey(monthEndDate)
    const monthlyItems = items.filter((item) => item.event_date >= monthStart && item.event_date <= monthEnd)
    const sourceCounts = monthlyItems.reduce<Record<EcdCalendarFeedSource, number>>(
      (acc, item) => {
        acc[item.source] += 1
        return acc
      },
      { event: 0, attendance: 0, reminder: 0, announcement: 0 }
    )
    return {
      total: monthlyItems.length,
      sourceCounts,
    }
  }, [items, monthDate, monthKey])

  function shiftMonth(offset: number) {
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1)
    setMonthDate(nextMonth)
    if (selectedDay.getFullYear() !== nextMonth.getFullYear() || selectedDay.getMonth() !== nextMonth.getMonth()) {
      setSelectedDay(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
    }
  }

  function jumpToToday() {
    setMonthDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
    setSelectedDay(todayDate)
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[var(--shadow-elevation-2)]">
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-600">Calendar Overview</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{formatMonthTitle(monthDate)}</h2>
            <p className="text-xs text-slate-500">{nowBadge}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => shiftMonth(-1)}
              className="h-11 w-11 rounded-2xl border-slate-200 p-0 text-slate-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={jumpToToday}
              className="h-11 rounded-2xl border-slate-200 px-4 text-slate-700"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => shiftMonth(1)}
              className="h-11 w-11 rounded-2xl border-slate-200 p-0 text-slate-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 sm:grid-cols-5">
          <p className="sm:col-span-2">
            <span className="font-bold text-slate-800">{monthSummary.total}</span> items this month
          </p>
          <p>Events: {monthSummary.sourceCounts.event}</p>
          <p>Attendance: {monthSummary.sourceCounts.attendance}</p>
          <p>Reminders: {monthSummary.sourceCounts.reminder}</p>
        </div>

        <div className="grid grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {label}
            </div>
          ))}

          {monthDays.map((day) => {
            const dayKey = toDayKey(day)
            const dayItems = sortDayItems(itemsByDate.get(dayKey) ?? [])
            const allDayItems = dayItems.filter((item) => item.all_day)
            const timedCount = dayItems.length - allDayItems.length
            const sourceKeys = Array.from(new Set(dayItems.map((item) => item.source))).slice(0, 4)
            const inCurrentMonth = day.getMonth() === monthDate.getMonth()
            const isToday = dayKey === todayKey
            const isSelected = dayKey === selectedDayKey

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => {
                  setSelectedDay(day)
                  if (!inCurrentMonth) {
                    setMonthDate(new Date(day.getFullYear(), day.getMonth(), 1))
                  }
                }}
                className={cn(
                  'min-h-[74px] rounded-2xl border p-1.5 text-left transition-[background-color,border-color,transform] duration-200 sm:min-h-[92px] sm:p-2',
                  inCurrentMonth ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-slate-100 bg-slate-100/70 text-slate-400',
                  isSelected ? 'border-teal-300 bg-teal-50/70 shadow-[var(--shadow-elevation-1)]' : '',
                  isToday ? 'ring-1 ring-teal-300' : ''
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : isToday
                          ? 'bg-teal-100 text-teal-700'
                          : 'text-slate-700'
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayItems.length > 0 ? (
                    <span className="text-[10px] font-bold text-slate-500">{dayItems.length}</span>
                  ) : null}
                </div>

                {allDayItems[0] ? (
                  <p className="mt-1.5 truncate rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    {allDayItems[0].title}
                  </p>
                ) : null}

                {timedCount > 0 ? (
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">{timedCount} timed</p>
                ) : null}

                {sourceKeys.length > 0 ? (
                  <div className="mt-1.5 flex items-center gap-1">
                    {sourceKeys.map((source) => (
                      <span key={`${dayKey}-${source}`} className={cn('h-1.5 w-1.5 rounded-full', SOURCE_META[source].dotClass)} />
                    ))}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-600">Selected Day</p>
              <h3 className="text-lg font-black text-slate-900">{formatLongDay(selectedDayKey)}</h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              <CalendarDays className="h-3.5 w-3.5" />
              {selectedDayItems.length} item{selectedDayItems.length === 1 ? '' : 's'}
            </div>
          </div>

          {selectedDayItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No events, attendance, reminders, or announcements on this day.
            </div>
          ) : (
            <div className="space-y-2.5 transition-all duration-200">
              {selectedDayItems.map((item) => {
                const meta = SOURCE_META[item.source]
                const Icon = meta.icon
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[var(--shadow-elevation-1)] transition-colors duration-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', meta.chipClass)}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {toTimeRange(item.start_time, item.end_time, item.all_day)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-900">{item.title}</p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                        ) : null}
                      </div>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-teal-200 hover:text-teal-700"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {Object.entries(SOURCE_META).map(([source, meta]) => (
            <span key={source} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
              {meta.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

