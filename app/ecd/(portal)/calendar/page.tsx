import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatDate, getJohannesburgNowParts } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Full Calendar - CentreConnect',
  description: 'Month-view calendar for events, open days, and internal schedules.',
}

type CalendarPageProps = {
  searchParams?: {
    month?: string
    visibility?: string
    edit?: string
    scope?: string
    view?: string
    focus?: string
    day?: string
  }
}

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  is_public: boolean
}

function toMonthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function parseMonthKey(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  const [yearRaw, monthRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return { year, month }
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return '--'
  const start = startTime ? startTime.slice(0, 5) : '--'
  const end = endTime ? endTime.slice(0, 5) : null
  return end ? `${start} - ${end}` : start
}

function weekdayIndexMondayFirst(date: Date) {
  return (date.getDay() + 6) % 7
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

export default async function EcdCalendarPage({ searchParams }: CalendarPageProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const nowJhb = getJohannesburgNowParts()
  const today = new Date(`${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}T00:00:00`)
  const viewParam = searchParams?.view
  const view = viewParam === 'week' ? 'week' : viewParam === 'day' ? 'day' : 'month'
  const focusParam = searchParams?.focus ?? searchParams?.day
  const focusDate = parseDayKey(focusParam) ?? today
  const focusDayKey = formatDayKey(focusDate)
  const focusMonthKey = toMonthKey(focusDate)
  const parsed = parseMonthKey(searchParams?.month)
  const selectedYear = parsed?.year ?? today.getFullYear()
  const selectedMonth = parsed?.month ?? today.getMonth() + 1
  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1)
  const gridFocusDate = view === 'month' ? selectedDate : focusDate
  const firstGridDay = new Date(gridFocusDate)
  firstGridDay.setDate(firstGridDay.getDate() - weekdayIndexMondayFirst(gridFocusDate))
  const lastGridDay = new Date(firstGridDay)
  lastGridDay.setDate(firstGridDay.getDate() + 41)
  const rangeStartKey = formatDayKey(firstGridDay)
  const rangeEndKey = formatDayKey(lastGridDay)
  const monthLabel = selectedDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
  const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
  const monthEnd = new Date(selectedYear, selectedMonth, 0)
  const monthStartKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const monthEndKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
  const prevMonth = new Date(selectedYear, selectedMonth - 2, 1)
  const nextMonth = new Date(selectedYear, selectedMonth, 1)
  const currentMonthKey = toMonthKey(selectedDate)
  const prevMonthKey = toMonthKey(prevMonth)
  const nextMonthKey = toMonthKey(nextMonth)
  const weekStart = new Date(focusDate)
  weekStart.setDate(focusDate.getDate() - weekdayIndexMondayFirst(focusDate))
  const weekStartKey = formatDayKey(weekStart)
  const prevWeek = new Date(weekStart)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const prevWeekKey = formatDayKey(prevWeek)
  const nextWeekKey = formatDayKey(nextWeek)
  const prevDay = new Date(focusDate)
  prevDay.setDate(prevDay.getDate() - 1)
  const nextDay = new Date(focusDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const prevDayKey = formatDayKey(prevDay)
  const nextDayKey = formatDayKey(nextDay)
  const todayKey = formatDayKey(today)
  const prevFocusKey =
    view === 'week' ? prevWeekKey : view === 'day' ? prevDayKey : undefined
  const nextFocusKey =
    view === 'week' ? nextWeekKey : view === 'day' ? nextDayKey : undefined
  const viewTitles: Record<'month' | 'week' | 'day', string> = {
    month: 'Month View',
    week: 'Week View',
    day: 'Day View',
  }
  const viewTitle = viewTitles[view]
  const periodLabel =
    view === 'month'
      ? monthLabel
      : view === 'week'
        ? `Week of ${weekStart.toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })}`
        : `Day of ${focusDate.toLocaleDateString('en-ZA', { month: 'long', day: 'numeric', year: 'numeric' })}`
  const viewOptions: Array<{ value: 'month' | 'week' | 'day'; label: string }> = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
  ]
  const visibility =
    searchParams?.visibility === 'public' || searchParams?.visibility === 'internal'
      ? searchParams.visibility
      : 'all'
  const scope = searchParams?.scope === 'past' || searchParams?.scope === 'upcoming' ? searchParams.scope : 'all'

  let query = supabase
    .from('calendar_events')
    .select('id,title,description,event_date,start_time,end_time,is_public')
    .eq('ecd_id', ecdId)
    .gte('event_date', rangeStartKey)
    .lte('event_date', rangeEndKey)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(300)

  if (visibility === 'public') query = query.eq('is_public', true)
  if (visibility === 'internal') query = query.eq('is_public', false)
  if (scope === 'upcoming') query = query.gte('event_date', `${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}`)
  if (scope === 'past') query = query.lt('event_date', `${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}`)

  const { data } = await query
  const events = (data ?? []) as CalendarEvent[]
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = eventsByDate.get(event.event_date) ?? []
    list.push(event)
    eventsByDate.set(event.event_date, list)
  }

  const days: Date[] = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(firstGridDay)
    date.setDate(firstGridDay.getDate() + i)
    days.push(date)
  }
  const weekStartIndex = days.findIndex((day) => formatDayKey(day) === weekStartKey)
  const weekDays =
    weekStartIndex >= 0 ? days.slice(weekStartIndex, weekStartIndex + 7) : days.slice(0, 7)
  const dayViewEvents = eventsByDate.get(focusDayKey) ?? []
  const renderDayCell = (day: Date) => {
    const dateKey = formatDayKey(day)
    const dayEvents = eventsByDate.get(dateKey) ?? []
    const isInSelectedMonth = day.getMonth() === selectedDate.getMonth()
    const isToday = dateKey === todayKey
    return (
      <div
        key={dateKey}
        className={cn(
          'min-h-24 rounded-md border p-2',
          isInSelectedMonth
            ? 'border-border bg-card/90 text-foreground'
            : 'border-slate-100 bg-card/95 text-muted-foreground'
        )}
      >
        <div className="mb-1 flex items-center justify-between">
          <p
            className={cn(
              'text-xs font-semibold',
              isToday && isInSelectedMonth
                ? 'rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 ring-1 ring-blue-300'
                : 'text-slate-700'
            )}
          >
            {day.getDate()}
          </p>
          {dayEvents.length > 0 ? <span className="text-[10px] text-slate-500">{dayEvents.length}</span> : null}
        </div>
        <div className="space-y-1">
          {dayEvents.slice(0, 2).map((event) => (
            <div
              key={event.id}
              className={cn(
                'truncate rounded px-1.5 py-0.5 text-[10px] font-medium',
                event.is_public ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              )}
              title={`${event.title} (${formatTimeRange(event.start_time, event.end_time)})`}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 2 ? (
            <p className="text-[10px] text-slate-500">+{dayEvents.length - 2} more</p>
          ) : null}
        </div>
      </div>
    )
  }
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const editId = (searchParams?.edit ?? '').trim()
  let editingEvent: CalendarEvent | null = null
  if (editId) {
    editingEvent = events.find((event) => event.id === editId) ?? null
    if (!editingEvent) {
      const { data: editRow } = await supabase
        .from('calendar_events')
        .select('id,title,description,event_date,start_time,end_time,is_public')
        .eq('ecd_id', ecdId)
        .eq('id', editId)
        .maybeSingle()
      editingEvent = (editRow as CalendarEvent | null) ?? null
    }
  }

  function buildHref(next: {
    month?: string
    visibility?: string
    scope?: string
    view?: 'month' | 'week' | 'day'
    focus?: string
  }) {
    const params = new URLSearchParams()
    const resolvedView = next.view ?? view
    if (resolvedView && resolvedView !== 'month') params.set('view', resolvedView)
    const focusValue = next.focus ?? (resolvedView !== 'month' ? focusDayKey : undefined)
    if (focusValue) params.set('focus', focusValue)
    const month = next.month ?? (resolvedView === 'month' ? currentMonthKey : focusMonthKey)
    if (month) params.set('month', month)
    const selectedVisibility = next.visibility ?? visibility
    const selectedScope = next.scope ?? scope
    if (selectedVisibility !== 'all') params.set('visibility', selectedVisibility)
    if (selectedScope !== 'all') params.set('scope', selectedScope)
    const qs = params.toString()
    return qs ? `/ecd/calendar?${qs}#calendar` : '/ecd/calendar#calendar'
  }

  function buildEditHref(eventId: string) {
    const params = new URLSearchParams()
    params.set('month', currentMonthKey)
    if (visibility !== 'all') params.set('visibility', visibility)
    if (view !== 'month') params.set('view', view)
    if (view !== 'month') params.set('focus', focusDayKey)
    params.set('edit', eventId)
    if (scope !== 'all') params.set('scope', scope)
    return `/ecd/calendar?${params.toString()}#calendar`
  }

  async function createEvent(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const eventDate = String(formData.get('event_date') ?? '').trim()
    const startTime = String(formData.get('start_time') ?? '').trim()
    const endTime = String(formData.get('end_time') ?? '').trim()
    const visibilityValue = String(formData.get('visibility') ?? 'internal')
    const templateKey = String(formData.get('template_key') ?? 'custom')
    const isPublic = visibilityValue === 'public'

    const templates: Record<string, { title: string; description: string; start_time: string; end_time: string; is_public: boolean }> = {
      birthday: {
        title: 'Birthday Celebration 🎂',
        description: 'Class celebration for birthdays this month.',
        start_time: '10:00',
        end_time: '11:00',
        is_public: false,
      },
      parent_meeting: {
        title: 'Parent Meeting 👨‍👩‍👧',
        description: 'Monthly centre-parent update and Q&A.',
        start_time: '17:30',
        end_time: '18:30',
        is_public: true,
      },
      sports_day: {
        title: 'Sports Day 🏅',
        description: 'Outdoor movement activities for all classes.',
        start_time: '09:00',
        end_time: '12:00',
        is_public: true,
      },
    }
    const picked = templates[templateKey]
    const finalTitle = title || picked?.title || ''
    const finalDescription = description || picked?.description || ''
    const finalStart = startTime || picked?.start_time || ''
    const finalEnd = endTime || picked?.end_time || ''
    const finalPublic = picked ? picked.is_public : isPublic

    if (!finalTitle || !eventDate) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return
    if (finalStart && !/^\d{2}:\d{2}$/.test(finalStart)) return
    if (finalEnd && !/^\d{2}:\d{2}$/.test(finalEnd)) return
    if (finalStart && finalEnd && finalStart > finalEnd) return

    await session.supabase.from('calendar_events').insert({
      ecd_id: session.ecdId,
      title: finalTitle,
      description: finalDescription || null,
      event_date: eventDate,
      start_time: finalStart || null,
      end_time: finalEnd || null,
      is_public: finalPublic,
      created_by: session.user.id,
    })

    revalidatePath('/ecd/calendar')
  }

  async function updateEvent(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const eventId = String(formData.get('event_id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const eventDate = String(formData.get('event_date') ?? '').trim()
    const startTime = String(formData.get('start_time') ?? '').trim()
    const endTime = String(formData.get('end_time') ?? '').trim()
    const visibilityValue = String(formData.get('visibility') ?? 'internal')
    const isPublic = visibilityValue === 'public'

    if (!eventId || !title || !eventDate) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) return
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) return
    if (startTime && endTime && startTime > endTime) return

    await session.supabase
      .from('calendar_events')
      .update({
        title,
        description: description || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        is_public: isPublic,
      })
      .eq('id', eventId)
      .eq('ecd_id', session.ecdId)

    revalidatePath('/ecd/calendar')
  }

  async function deleteEvent(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const eventId = String(formData.get('event_id') ?? '').trim()
    if (!eventId) return
    await session.supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('ecd_id', session.ecdId)
    revalidatePath('/ecd/calendar')
  }

  return (
    <EcdOsShell
      title="Full Calendar"
      description="View your month at a glance. Public and internal events appear in one calendar."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
        <Card id="calendar" className="scroll-mt-24 border-slate-200">
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>{viewTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {viewOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={buildHref({
                      view: option.value,
                      focus: option.value === 'month' ? undefined : focusDayKey,
                      month: option.value === 'month' ? currentMonthKey : focusMonthKey,
                    })}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold transition duration-150',
                      option.value === view
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white/10 text-muted-foreground hover:bg-white/20'
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={buildHref({ view, focus: todayKey, month: toMonthKey(today) })}>Today</Link>
              </Button>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create Event</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createEvent} className="grid gap-3">
                  <select name="template_key" className="cc-native-field">
                    <option value="custom">Custom event</option>
                    <option value="birthday">Birthday template 🎂</option>
                    <option value="parent_meeting">Parent meeting template 👨‍👩‍👧</option>
                    <option value="sports_day">Sports day template 🏅</option>
                  </select>
                  <input name="title" placeholder="Event title (optional when using template)" className="cc-native-field" />
                  <input name="description" placeholder="Description (optional)" className="cc-native-field" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input name="event_date" type="date" defaultValue={monthStartKey} className="cc-native-field" required />
                    <input name="start_time" type="time" className="cc-native-field" />
                    <input name="end_time" type="time" className="cc-native-field" />
                  </div>
                  <select name="visibility" className="cc-native-field">
                    <option value="internal">Internal</option>
                    <option value="public">Public</option>
                  </select>
                  <Button type="submit" className="w-fit">Add Event</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Edit Event</CardTitle>
              </CardHeader>
              <CardContent>
                {editingEvent ? (
                  <div className="grid gap-3">
                    <form action={updateEvent} className="grid gap-3">
                      <input type="hidden" name="event_id" value={editingEvent.id} />
                      <input name="title" defaultValue={editingEvent.title} className="cc-native-field" required />
                      <input name="description" defaultValue={editingEvent.description ?? ''} placeholder="Description (optional)" className="cc-native-field" />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input name="event_date" type="date" defaultValue={editingEvent.event_date} className="cc-native-field" required />
                        <input name="start_time" type="time" defaultValue={editingEvent.start_time?.slice(0, 5) ?? ''} className="cc-native-field" />
                        <input name="end_time" type="time" defaultValue={editingEvent.end_time?.slice(0, 5) ?? ''} className="cc-native-field" />
                      </div>
                      <select name="visibility" defaultValue={editingEvent.is_public ? 'public' : 'internal'} className="cc-native-field">
                        <option value="internal">Internal</option>
                        <option value="public">Public</option>
                      </select>
                      <Button type="submit" className="w-fit">Save Changes</Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      <form action={deleteEvent}>
                        <input type="hidden" name="event_id" value={editingEvent.id} />
                        <Button type="submit" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50">
                          Delete Event
                        </Button>
                      </form>
                      <Button type="button" variant="outline" asChild>
                        <Link href={buildHref({})}>Clear Selection</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-card/80 p-3 text-sm text-muted-foreground">
                    Select an event from the table below to edit.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={buildHref({
                  view,
                  month: view === 'month' ? prevMonthKey : undefined,
                  focus: prevFocusKey,
                })}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/80"
              >
                Previous
              </Link>
              <h2 className="min-w-40 text-sm font-semibold text-slate-900">{periodLabel}</h2>
              <Link
                href={buildHref({
                  view,
                  month: view === 'month' ? nextMonthKey : undefined,
                  focus: nextFocusKey,
                })}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/80"
              >
                Next
              </Link>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                Today {String(nowJhb.day).padStart(2, '0')}/{String(nowJhb.month).padStart(2, '0')} {String(nowJhb.hour).padStart(2, '0')}:00 SAST
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={buildHref({ visibility: 'all', view })}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold',
                  visibility === 'all'
                    ? 'bg-cyan-600 text-white'
                    : 'border border-border bg-background text-muted-foreground'
                )}
              >
                All
              </Link>
              <Link
                href={buildHref({ visibility: 'public', view })}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold',
                  visibility === 'public' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'
                )}
              >
                Public
              </Link>
              <Link
                href={buildHref({ visibility: 'internal', view })}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold',
                  visibility === 'internal' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800'
                )}
              >
                Internal
              </Link>
              <Link
                href={buildHref({ scope: 'upcoming', view })}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold',
                  scope === 'upcoming' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800'
                )}
              >
                Upcoming
              </Link>
              <Link
                href={buildHref({ scope: 'past', view })}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold',
                  scope === 'past'
                    ? 'bg-cyan-600 text-white'
                    : 'border border-border bg-background text-muted-foreground'
                )}
              >
                Past
              </Link>
            </div>
          </div>

          {view === 'day' ? (
            <div className="space-y-3 rounded-2xl border border-border bg-card/80 p-4">
              {dayViewEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled for this day.</p>
              ) : (
                dayViewEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-3xl border border-border/60 bg-white/5 p-4 text-sm text-foreground"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold">{event.title}</p>
                      <StatusBadge status={event.is_public ? 'approved' : 'in_review'} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)}
                    </p>
                    {event.description ? (
                      <p className="mt-2 text-xs text-muted-foreground">{event.description}</p>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={buildEditHref(event.id)}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 rounded-lg border border-slate-200 bg-background p-2">
              {weekdayLabels.map((label) => (
                <div key={label} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
              ))}
              {(view === 'week' ? weekDays : days).map((day) => renderDayCell(day))}
            </div>
          )}

          {events.length === 0 ? (
            <EmptyState
              title="No events this month"
              description="No calendar events match this month and filter."
            />
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{formatDate(event.event_date)}</TableCell>
                    <TableCell>{formatTimeRange(event.start_time, event.end_time)}</TableCell>
                    <TableCell>{event.is_public ? 'Public' : 'Internal'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={buildEditHref(event.id)}>
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Public
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Internal
            </span>
            <span>Month: {monthStartKey} to {monthEndKey}</span>
          </div>
        </CardContent>
      </Card>
    </EcdOsShell>
  )
}
