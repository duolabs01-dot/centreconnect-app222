'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { BellRing, CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Megaphone, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
  textClass: string
  icon: LucideIcon
}

const SOURCE_META: Record<EcdCalendarFeedSource, SourceMeta> = {
  event: {
    label: 'Event',
    dotClass: 'bg-cyan-500',
    chipClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    textClass: 'text-cyan-700',
    icon: CalendarCheck2,
  },
  attendance: {
    label: 'Attendance',
    dotClass: 'bg-indigo-500',
    chipClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    textClass: 'text-indigo-700',
    icon: UsersRound,
  },
  reminder: {
    label: 'Reminder',
    dotClass: 'bg-amber-500',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
    textClass: 'text-amber-700',
    icon: BellRing,
  },
  announcement: {
    label: 'Announcement',
    dotClass: 'bg-emerald-500',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    textClass: 'text-emerald-700',
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

function toTimeLabel(start: string | null, allDay: boolean) {
  if (allDay) return 'All-day'
  return start ?? 'Time TBC'
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

type AgendaGroup = {
  dayKey: string
  items: EcdCalendarFeedItem[]
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

  const selectedAllDayItems = useMemo(
    () => selectedDayItems.filter((item) => item.all_day),
    [selectedDayItems]
  )

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

  const monthAgenda = useMemo(() => {
    const monthStart = `${monthKey}-01`
    const monthEnd = toDayKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0))
    const monthlyItems = items
      .filter((item) => item.event_date >= monthStart && item.event_date <= monthEnd)
      .sort((a, b) => {
        if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
        if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
        return (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99')
      })

    const groups: AgendaGroup[] = []
    for (const item of monthlyItems) {
      const current = groups[groups.length - 1]
      if (!current || current.dayKey !== item.event_date) {
        groups.push({ dayKey: item.event_date, items: [item] })
      } else {
        current.items.push(item)
      }
    }
    return groups.slice(0, 18)
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
    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.32)]">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-3.5 sm:p-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600">Calendar</p>
            <h2 className="mt-0.5 text-2xl font-black tracking-tight text-slate-900">{formatMonthTitle(monthDate)}</h2>
            <p className="text-xs text-slate-500">{nowBadge}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => shiftMonth(-1)}
              className="h-10 w-10 rounded-2xl border-slate-200/90 p-0 text-slate-700 transition-all duration-200 hover:bg-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={jumpToToday}
              className="h-10 rounded-2xl border-slate-200/90 px-4 text-slate-700 transition-all duration-200 hover:bg-slate-100"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => shiftMonth(1)}
              className="h-10 w-10 rounded-2xl border-slate-200/90 p-0 text-slate-700 transition-all duration-200 hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="grid gap-2 rounded-2xl border-slate-200/80 bg-slate-50/80 p-3 text-xs text-slate-600 shadow-none sm:grid-cols-5">
          <p className="sm:col-span-2">
            <span className="font-bold text-slate-800">{monthSummary.total}</span> items this month
          </p>
          <p>Events: {monthSummary.sourceCounts.event}</p>
          <p>Attendance: {monthSummary.sourceCounts.attendance}</p>
          <p>Reminders: {monthSummary.sourceCounts.reminder}</p>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-slate-50/75 shadow-none">
          <div className="grid grid-cols-7 border-b border-slate-200/80 bg-white/80">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-1.5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200/70">
            {monthDays.map((day) => {
              const dayKey = toDayKey(day)
              const dayItems = sortDayItems(itemsByDate.get(dayKey) ?? [])
              const previewItems = dayItems.slice(0, 2)
              const overflowCount = Math.max(0, dayItems.length - previewItems.length)
              const inCurrentMonth = day.getMonth() === monthDate.getMonth()
              const isToday = dayKey === todayKey
              const isSelected = dayKey === selectedDayKey

              return (
                <Button
                  key={dayKey}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedDay(day)
                    if (!inCurrentMonth) {
                      setMonthDate(new Date(day.getFullYear(), day.getMonth(), 1))
                    }
                  }}
                  className={cn(
                    'min-h-[84px] h-auto justify-start rounded-none bg-white px-1.5 py-1.5 text-left transition-all duration-250 ease-out sm:min-h-[102px] sm:px-2 sm:py-2',
                    inCurrentMonth ? 'hover:bg-slate-50/70' : 'bg-slate-100/80 text-slate-400 hover:bg-slate-100',
                    isSelected ? 'ring-2 ring-cyan-500/60 ring-inset' : '',
                    isToday ? 'bg-cyan-50/55' : ''
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                        isSelected
                          ? 'bg-cyan-600 text-white'
                          : isToday
                            ? 'bg-cyan-100 text-cyan-700'
                            : inCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 ? (
                      <span className="text-[10px] font-semibold text-slate-500">{dayItems.length}</span>
                    ) : null}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {previewItems.map((item) => (
                      <p
                        key={`${dayKey}-${item.id}`}
                        className={cn(
                          'truncate rounded-md border border-transparent px-1.5 py-0.5 text-[10px] font-semibold',
                          item.all_day ? 'bg-slate-100 text-slate-700' : 'bg-white text-slate-600',
                          SOURCE_META[item.source].textClass
                        )}
                      >
                        {item.all_day ? item.title : `${item.start_time ?? '--:--'} ${item.title}`}
                      </p>
                    ))}
                    {overflowCount > 0 ? (
                      <p className="truncate px-1 text-[10px] font-semibold text-slate-500">+{overflowCount} more</p>
                    ) : null}
                  </div>
                </Button>
              )
            })}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-3.5 shadow-none sm:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-600">All-day</p>
              <h3 className="text-base font-black text-slate-900">{formatLongDay(selectedDayKey)}</h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              <CalendarDays className="h-3.5 w-3.5" />
              {selectedAllDayItems.length} all-day
            </div>
          </div>

          {selectedAllDayItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No all-day items on this date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedAllDayItems.map((item) => {
                const meta = SOURCE_META[item.source]
                const Icon = meta.icon
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200',
                      meta.chipClass
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="max-w-[220px] truncate">{item.title}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-3.5 shadow-none sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-600">Agenda List</p>
              <h3 className="text-lg font-black text-slate-900">Everything at a glance</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">{monthAgenda.length} day groups</span>
          </div>

          {monthAgenda.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No calendar activity in this month yet.
            </div>
          ) : (
            <div className="space-y-3">
              {monthAgenda.map((group) => (
                <Card
                  key={group.dayKey}
                  className="rounded-2xl border-slate-200 bg-slate-50/55 p-3 shadow-none transition-all duration-200"
                >
                  <h4 className="text-sm font-black text-slate-900">{formatLongDay(group.dayKey)}</h4>
                  <div className="mt-2 space-y-2">
                    {group.items.map((item) => {
                      const meta = SOURCE_META[item.source]
                      const Icon = meta.icon
                      return (
                        <article
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors duration-200 hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
                                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                  {toTimeLabel(item.start_time, item.all_day)}
                                </p>
                              </div>
                              <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{item.title}</p>
                              {item.description ? (
                                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                  {item.description}
                                </p>
                              ) : null}
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                {toTimeRange(item.start_time, item.end_time, item.all_day)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                                  meta.chipClass
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </span>
                              {item.href ? (
                                <Link
                                  href={item.href}
                                  className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition-colors duration-200 hover:border-cyan-200 hover:text-cyan-700"
                                >
                                  Open
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {Object.entries(SOURCE_META).map(([source, meta]) => (
            <span key={source} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
              {meta.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
