import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Calendar, CalendarDays, Clock3, MessageSquare, Sparkles } from 'lucide-react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarInteractiveView, type CalendarEvent, type CalendarScope, type CalendarViewMode, type CalendarVisibility } from '@/components/ecd/CalendarInteractiveView'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS, normalizeCommunicationAutomationSettings } from '@/lib/communications/automation-settings'
import { formatDate, getJohannesburgNowParts } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Calendar - CentreConnect',
  description: 'Plan your school calendar, automate reminders, and keep parent communication consistent.',
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

type CentreAutomationRow = {
  name: string | null
  phone: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  email: string | null
  communication_automation_settings?: unknown
}

type PortalSessionLite = Pick<Awaited<ReturnType<typeof requireEcdPortalSession>>, 'supabase' | 'ecdId'>

type ChildBirthdayRow = {
  id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
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

function maxDayInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate()
}

function nextBirthdayDate(dob: string, today: Date) {
  if (!dob) return null
  const [yearRaw, monthRaw, dayRaw] = dob.split('-')
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let targetYear = todayStart.getFullYear()
  let safeDay = Math.min(day, maxDayInMonth(targetYear, month))
  let candidate = new Date(targetYear, month - 1, safeDay)
  if (candidate < todayStart) {
    targetYear += 1
    safeDay = Math.min(day, maxDayInMonth(targetYear, month))
    candidate = new Date(targetYear, month - 1, safeDay)
  }
  return candidate
}

function includesMissingColumn(error: { message?: string | null } | null | undefined, column: string) {
  if (!error?.message) return false
  return error.message.toLowerCase().includes(column.toLowerCase())
}

async function loadCentreAutomationRow(session: PortalSessionLite): Promise<CentreAutomationRow | null> {
  const primary = await session.supabase
    .from('ecd_centres')
    .select('name,phone,contact_phone,contact_whatsapp,email,communication_automation_settings')
    .eq('id', session.ecdId)
    .maybeSingle()

  if (includesMissingColumn(primary.error, 'communication_automation_settings')) {
    const fallback = await session.supabase
      .from('ecd_centres')
      .select('name,phone,contact_phone,contact_whatsapp,email')
      .eq('id', session.ecdId)
      .maybeSingle()
    return (fallback.data ?? null) as CentreAutomationRow | null
  }

  return (primary.data ?? null) as CentreAutomationRow | null
}

async function syncBirthdaysForCentre(session: PortalSessionLite) {
  const viaBatch = await session.supabase.rpc('sync_existing_birthday_events_for_centre', {
    p_ecd_id: session.ecdId,
  })

  if (!viaBatch.error) return
  if (!String(viaBatch.error.message ?? '').toLowerCase().includes('sync_existing_birthday_events_for_centre')) {
    return
  }

  const { data: childrenRows } = await session.supabase
    .from('children')
    .select('id,first_name,last_name,date_of_birth')
    .eq('ecd_id', session.ecdId)
    .not('date_of_birth', 'is', null)
    .limit(1200)

  for (const child of (childrenRows ?? []) as ChildBirthdayRow[]) {
    if (!child.id || !child.date_of_birth) continue
    await session.supabase.rpc('ensure_child_birthday_events', {
      p_ecd_id: session.ecdId,
      p_child_id: child.id,
      p_first_name: child.first_name ?? 'Child',
      p_last_name: child.last_name ?? '',
      p_date_of_birth: child.date_of_birth,
    })
  }
}

export default async function EcdCalendarPage({ searchParams }: CalendarPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const nowJhb = getJohannesburgNowParts()
  const today = new Date(
    `${nowJhb.year}-${String(nowJhb.month).padStart(2, '0')}-${String(nowJhb.day).padStart(2, '0')}T00:00:00`
  )
  const todayKey = formatDayKey(today)

  const parsedMonth = parseMonthKey(searchParams?.month)
  const selectedYear = parsedMonth?.year ?? today.getFullYear()
  const selectedMonth = parsedMonth?.month ?? today.getMonth() + 1
  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1)
  const currentMonthKey = toMonthKey(selectedDate)

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

  const visibility: CalendarVisibility =
    searchParams?.visibility === 'public' || searchParams?.visibility === 'internal'
      ? searchParams.visibility
      : 'all'
  const scope: CalendarScope =
    searchParams?.scope === 'past' || searchParams?.scope === 'upcoming'
      ? searchParams.scope
      : 'all'

  const rangeStartKey = `${selectedYear - 1}-01-01`
  const rangeEndKey = `${selectedYear + 1}-12-31`

  const [{ data: eventRows }, centreRow, { data: birthdaysRows }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('id,title,description,event_date,start_time,end_time,is_public')
      .eq('ecd_id', ecdId)
      .gte('event_date', rangeStartKey)
      .lte('event_date', rangeEndKey)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(3000),
    loadCentreAutomationRow({ supabase, ecdId }),
    supabase
      .from('children')
      .select('id,first_name,last_name,date_of_birth')
      .eq('ecd_id', ecdId)
      .not('date_of_birth', 'is', null)
      .order('first_name', { ascending: true })
      .limit(200),
  ])

  const automationSettings = normalizeCommunicationAutomationSettings(
    centreRow?.communication_automation_settings ?? null
  )
  const events = ((eventRows ?? []) as CalendarEvent[]) ?? []

  const editId = (searchParams?.edit ?? '').trim()
  const editingEvent = editId ? events.find((event) => event.id === editId) ?? null : null

  const monthStartKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const nowBadge = `Today ${String(nowJhb.day).padStart(2, '0')}/${String(nowJhb.month).padStart(2, '0')} ${String(nowJhb.hour).padStart(2, '0')}:00 SAST`

  const upcomingBirthdays = ((birthdaysRows ?? []) as ChildBirthdayRow[])
    .map((child) => {
      const nextDate = child.date_of_birth ? nextBirthdayDate(child.date_of_birth, today) : null
      return {
        id: child.id,
        name: `${child.first_name ?? 'Child'} ${child.last_name ?? ''}`.trim(),
        dateOfBirth: child.date_of_birth,
        nextBirthday: nextDate,
      }
    })
    .filter((entry) => Boolean(entry.nextBirthday))
    .sort((a, b) => (a.nextBirthday?.getTime() ?? 0) - (b.nextBirthday?.getTime() ?? 0))
    .slice(0, 10)

  let birthdayEventCount: number | null = null
  const birthdayCountQuery = await supabase
    .from('calendar_events')
    .select('id', { count: 'exact', head: true })
    .eq('ecd_id', ecdId)
    .ilike('source_key', 'birthday:%')

  if (!includesMissingColumn(birthdayCountQuery.error, 'source_key')) {
    birthdayEventCount = birthdayCountQuery.count ?? 0
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
    const isPublic = visibilityValue === 'public'

    if (!title || !eventDate) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) return
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) return
    if (startTime && endTime && startTime > endTime) return

    await session.supabase.from('calendar_events').insert({
      ecd_id: session.ecdId,
      title,
      description: description || null,
      event_date: eventDate,
      start_time: startTime || null,
      end_time: endTime || null,
      is_public: isPublic,
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

  async function saveAutomationSettingsAction(formData: FormData) {
    'use server'

    const session = await requireEcdPortalSession({ cached: false })
    const settings = normalizeCommunicationAutomationSettings({
      enabled: formData.get('enabled') === 'on',
      auto_birthday_calendar: formData.get('auto_birthday_calendar') === 'on',
      auto_birthday_announcements: formData.get('auto_birthday_announcements') === 'on',
      send_channel: String(formData.get('send_channel') ?? DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_channel),
      send_time: String(formData.get('send_time') ?? DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_time),
      reminder_delay_hours: Number(formData.get('reminder_delay_hours') ?? DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.reminder_delay_hours),
      application_reminder_template: String(
        formData.get('application_reminder_template') ?? DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.application_reminder_template
      ),
      birthday_announcement_template: String(
        formData.get('birthday_announcement_template') ?? DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.birthday_announcement_template
      ),
      include_centre_phone: formData.get('include_centre_phone') === 'on',
      include_centre_email: formData.get('include_centre_email') === 'on',
      include_centre_whatsapp: formData.get('include_centre_whatsapp') === 'on',
      signoff: String(formData.get('signoff') ?? DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.signoff),
    })

    await session.supabase
      .from('ecd_centres')
      .update({ communication_automation_settings: settings })
      .eq('id', session.ecdId)

    if (settings.enabled && settings.auto_birthday_calendar) {
      await syncBirthdaysForCentre(session)
    }

    revalidatePath('/ecd/calendar')
    revalidatePath('/ecd/applications')
    revalidatePath('/ecd/communications')
    revalidatePath('/ecd/announcements')
  }

  async function syncBirthdaysNowAction() {
    'use server'

    const session = await requireEcdPortalSession({ cached: false })
    await syncBirthdaysForCentre(session)
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
      title="Calendar & Automation"
      description="Simple daily planning with clear automation controls for parent communication."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-teal-100 bg-teal-50/70 p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">Planning Studio</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-700">
            Plan events once, keep parents informed professionally, and auto-sync birthdays as children enroll.
          </p>
        </section>

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

        <section className="grid gap-5 xl:grid-cols-2">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Quick Event Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={createEvent} className="grid gap-3">
                <input name="title" placeholder="Event title" className="cc-native-field h-11 rounded-2xl" required />
                <input name="description" placeholder="Description (optional)" className="cc-native-field h-11 rounded-2xl" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <input name="event_date" type="date" defaultValue={monthStartKey} className="cc-native-field h-11 rounded-2xl" required />
                  <input name="start_time" type="time" className="cc-native-field h-11 rounded-2xl" />
                  <input name="end_time" type="time" className="cc-native-field h-11 rounded-2xl" />
                </div>
                <select name="visibility" className="cc-native-field h-11 rounded-2xl">
                  <option value="internal">Internal</option>
                  <option value="public">Public (parent-facing)</option>
                </select>
                <Button type="submit" className="h-11 rounded-3xl bg-teal-600 text-white hover:bg-teal-700">
                  Save Event
                </Button>
              </form>

              {editingEvent ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Edit Selected Event</p>
                  <div className="mt-3 grid gap-2">
                    <form action={updateEvent} className="grid gap-2">
                      <input type="hidden" name="event_id" value={editingEvent.id} />
                      <input name="title" defaultValue={editingEvent.title} className="cc-native-field h-10 rounded-2xl" required />
                      <input
                      name="description"
                      defaultValue={editingEvent.description ?? ''}
                      className="cc-native-field h-10 rounded-2xl"
                      placeholder="Description"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input name="event_date" type="date" defaultValue={editingEvent.event_date} className="cc-native-field h-10 rounded-2xl" required />
                      <input name="start_time" type="time" defaultValue={editingEvent.start_time?.slice(0, 5) ?? ''} className="cc-native-field h-10 rounded-2xl" />
                      <input name="end_time" type="time" defaultValue={editingEvent.end_time?.slice(0, 5) ?? ''} className="cc-native-field h-10 rounded-2xl" />
                    </div>
                      <select
                        name="visibility"
                        defaultValue={editingEvent.is_public ? 'public' : 'internal'}
                      className="cc-native-field h-10 rounded-2xl"
                      >
                        <option value="internal">Internal</option>
                        <option value="public">Public</option>
                      </select>
                      <Button type="submit" className="h-10 rounded-2xl bg-teal-600 text-white hover:bg-teal-700">
                        Update
                      </Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      <form action={deleteEvent}>
                        <input type="hidden" name="event_id" value={editingEvent.id} />
                        <Button type="submit" variant="outline" className="h-10 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50">
                          Delete
                        </Button>
                      </form>
                      <Button type="button" variant="outline" asChild className="h-10 rounded-2xl">
                        <Link href={clearSelectionHref}>Clear Selection</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-teal-600" />
                Communication Automation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveAutomationSettingsAction} className="space-y-4">
                <div className="grid gap-2">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-800">Automation enabled</span>
                    <input type="checkbox" name="enabled" defaultChecked={automationSettings.enabled} className="h-4 w-4 accent-teal-600" />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-800">Auto-add birthdays to calendar</span>
                    <input
                      type="checkbox"
                      name="auto_birthday_calendar"
                      defaultChecked={automationSettings.auto_birthday_calendar}
                      className="h-4 w-4 accent-teal-600"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-800">Auto birthday parent message</span>
                    <input
                      type="checkbox"
                      name="auto_birthday_announcements"
                      defaultChecked={automationSettings.auto_birthday_announcements}
                      className="h-4 w-4 accent-teal-600"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Send Channel</span>
                    <select name="send_channel" defaultValue={automationSettings.send_channel} className="cc-native-field h-11 rounded-2xl">
                      <option value="in_app">In-app only</option>
                      <option value="whatsapp">WhatsApp only</option>
                      <option value="sms">SMS only</option>
                      <option value="in_app_whatsapp">In-app + WhatsApp</option>
                      <option value="in_app_sms">In-app + SMS</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Default Send Time</span>
                    <input type="time" name="send_time" defaultValue={automationSettings.send_time} className="cc-native-field h-11 rounded-2xl" />
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Reminder Delay (hours)</span>
                  <input
                    type="number"
                    min={0}
                    max={168}
                    name="reminder_delay_hours"
                    defaultValue={automationSettings.reminder_delay_hours}
                    className="cc-native-field h-11 rounded-2xl"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Missing Documents Template</span>
                  <textarea
                    name="application_reminder_template"
                    defaultValue={automationSettings.application_reminder_template}
                    className="cc-native-field min-h-[110px] rounded-2xl py-2"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Birthday Message Template</span>
                  <textarea
                    name="birthday_announcement_template"
                    defaultValue={automationSettings.birthday_announcement_template}
                    className="cc-native-field min-h-[90px] rounded-2xl py-2"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Professional Signature</p>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">Include centre phone</span>
                    <input type="checkbox" name="include_centre_phone" defaultChecked={automationSettings.include_centre_phone} className="h-4 w-4 accent-teal-600" />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">Include centre WhatsApp</span>
                    <input
                      type="checkbox"
                      name="include_centre_whatsapp"
                      defaultChecked={automationSettings.include_centre_whatsapp}
                      className="h-4 w-4 accent-teal-600"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">Include centre email</span>
                    <input type="checkbox" name="include_centre_email" defaultChecked={automationSettings.include_centre_email} className="h-4 w-4 accent-teal-600" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Signoff Label</span>
                    <input name="signoff" defaultValue={automationSettings.signoff} className="cc-native-field h-11 rounded-2xl" />
                  </label>
                </div>

                <Button type="submit" className="h-11 w-full rounded-3xl bg-teal-600 text-white hover:bg-teal-700">
                  Save Automation Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Birthday Sync Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">
                Birthdays are synced when children are enrolled or manually added. Use manual sync if you imported older profiles.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Birthday events in calendar</p>
                <p className="mt-1 text-xl font-black text-slate-900">{birthdayEventCount ?? 'Run migration 054'}</p>
              </div>
              <form action={syncBirthdaysNowAction}>
                <Button type="submit" variant="outline" className="h-11 rounded-3xl border-teal-200 text-teal-700 hover:bg-teal-50">
                  <Calendar className="mr-2 h-4 w-4" />
                  Sync Birthdays Now
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4 text-teal-600" />
                Upcoming Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-sm text-slate-500">No child birthdays available yet.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map((birthday) => (
                    <div key={birthday.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-sm font-bold text-slate-900">{birthday.name}</p>
                      <p className="text-xs text-slate-500">
                        Next birthday: {birthday.nextBirthday ? formatDate(birthday.nextBirthday.toISOString()) : '--'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </EcdOsShell>
  )
}
