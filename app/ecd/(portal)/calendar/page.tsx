import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CalendarInteractiveView,
  type CalendarEvent,
  type CalendarScope,
  type CalendarVisibility,
  type CalendarViewMode,
} from '@/components/ecd/CalendarInteractiveView'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getJohannesburgNowParts } from '@/lib/utils'

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
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const nowJhb = getJohannesburgNowParts()
  const today = new Date(
    `${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}T00:00:00`
  )
  const todayKey = formatDayKey(today)

  const viewParam = searchParams?.view
  const view: CalendarViewMode =
    viewParam === 'week'
      ? 'week'
      : viewParam === 'day'
        ? 'day'
        : viewParam === 'timetable'
          ? 'timetable'
          : 'month'
  const focusParam = searchParams?.focus ?? searchParams?.day
  const focusDate = parseDayKey(focusParam) ?? today
  const focusDayKey = formatDayKey(focusDate)

  const parsed = parseMonthKey(searchParams?.month)
  const selectedYear = parsed?.year ?? today.getFullYear()
  const selectedMonth = parsed?.month ?? today.getMonth() + 1
  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1)
  const currentMonthKey = toMonthKey(selectedDate)

  const visibility: CalendarVisibility =
    searchParams?.visibility === 'public' || searchParams?.visibility === 'internal'
      ? searchParams.visibility
      : 'all'
  const scope: CalendarScope =
    searchParams?.scope === 'past' || searchParams?.scope === 'upcoming'
      ? searchParams.scope
      : 'all'

  // Fetch surrounding years once; month/week/day navigation is handled client-side without route reloads.
  const rangeStartKey = `${selectedYear - 1}-01-01`
  const rangeEndKey = `${selectedYear + 1}-12-31`

  const { data } = await supabase
    .from('calendar_events')
    .select('id,title,description,event_date,start_time,end_time,is_public')
    .eq('ecd_id', ecdId)
    .gte('event_date', rangeStartKey)
    .lte('event_date', rangeEndKey)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(3000)

  const events = (data ?? []) as CalendarEvent[]

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

  const monthStartKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const nowBadge = `Today ${String(nowJhb.day).padStart(2, '0')}/${String(nowJhb.month).padStart(2, '0')} ${String(nowJhb.hour).padStart(2, '0')}:00 SAST`

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

    const templates: Record<
      string,
      {
        title: string
        description: string
        start_time: string
        end_time: string
        is_public: boolean
      }
    > = {
      birthday: {
        title: 'Birthday Celebration',
        description: 'Class celebration for birthdays this month.',
        start_time: '10:00',
        end_time: '11:00',
        is_public: false,
      },
      parent_meeting: {
        title: 'Parent Meeting',
        description: 'Monthly crèche-parent update and Q&A.',
        start_time: '17:30',
        end_time: '18:30',
        is_public: true,
      },
      sports_day: {
        title: 'Sports Day',
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

  const clearParams = new URLSearchParams()
  clearParams.set('month', currentMonthKey)
  if (view !== 'month') {
    clearParams.set('view', view)
    clearParams.set('focus', focusDayKey)
  }
  if (visibility !== 'all') clearParams.set('visibility', visibility)
  if (scope !== 'all') clearParams.set('scope', scope)
  const clearSelectionHref = `/ecd/calendar?${clearParams.toString()}#calendar`

  return (
    <EcdOsShell
      title="Full Calendar"
      description="View your month at a glance. Public and internal events appear in one calendar."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <CalendarInteractiveView
        events={events}
        initialView={view}
        initialVisibility={visibility}
        initialScope={scope}
        initialFocusDayKey={focusDayKey}
        initialMonthKey={currentMonthKey}
        todayKey={todayKey}
        nowBadge={nowBadge}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200/90 bg-white/90 shadow-[var(--shadow-elevation-3)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Create Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createEvent} className="grid gap-3">
              <select name="template_key" className="cc-native-field">
                <option value="custom">Custom event</option>
                <option value="birthday">Birthday template</option>
                <option value="parent_meeting">Parent meeting template</option>
                <option value="sports_day">Sports day template</option>
              </select>
              <input
                name="title"
                placeholder="Event title (optional when using template)"
                className="cc-native-field"
              />
              <input
                name="description"
                placeholder="Description (optional)"
                className="cc-native-field"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  name="event_date"
                  type="date"
                  defaultValue={monthStartKey}
                  className="cc-native-field"
                  required
                />
                <input name="start_time" type="time" className="cc-native-field" />
                <input name="end_time" type="time" className="cc-native-field" />
              </div>
              <select name="visibility" className="cc-native-field">
                <option value="internal">Internal</option>
                <option value="public">Public</option>
              </select>
              <Button type="submit" className="w-full sm:w-fit">
                Add Event
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white/90 shadow-[var(--shadow-elevation-3)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Edit Event</CardTitle>
          </CardHeader>
          <CardContent>
            {editingEvent ? (
              <div className="grid gap-3">
                <form action={updateEvent} className="grid gap-3">
                  <input type="hidden" name="event_id" value={editingEvent.id} />
                  <input
                    name="title"
                    defaultValue={editingEvent.title}
                    className="cc-native-field"
                    required
                  />
                  <input
                    name="description"
                    defaultValue={editingEvent.description ?? ''}
                    placeholder="Description (optional)"
                    className="cc-native-field"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      name="event_date"
                      type="date"
                      defaultValue={editingEvent.event_date}
                      className="cc-native-field"
                      required
                    />
                    <input
                      name="start_time"
                      type="time"
                      defaultValue={editingEvent.start_time?.slice(0, 5) ?? ''}
                      className="cc-native-field"
                    />
                    <input
                      name="end_time"
                      type="time"
                      defaultValue={editingEvent.end_time?.slice(0, 5) ?? ''}
                      className="cc-native-field"
                    />
                  </div>
                  <select
                    name="visibility"
                    defaultValue={editingEvent.is_public ? 'public' : 'internal'}
                    className="cc-native-field"
                  >
                    <option value="internal">Internal</option>
                    <option value="public">Public</option>
                  </select>
                  <Button type="submit" className="w-full sm:w-fit">
                    Save Changes
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={deleteEvent}>
                    <input type="hidden" name="event_id" value={editingEvent.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      Delete Event
                    </Button>
                  </form>
                  <Button type="button" variant="outline" asChild>
                    <Link href={clearSelectionHref}>Clear Selection</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-500">
                Select an event from the calendar to edit.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EcdOsShell>
  )
}






