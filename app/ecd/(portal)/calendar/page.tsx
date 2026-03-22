import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Calendar, CalendarDays, Clock3, MessageSquare, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EcdIosCalendarView, type EcdCalendarFeedItem } from '@/components/ecd/ecd-ios-calendar-view'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS, normalizeCommunicationAutomationSettings } from '@/lib/communications/automation-settings'
import { toApplicationDocumentLabels } from '@/lib/admissions/application-documents'
import { formatDate, getJohannesburgNowParts } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Calendar - CentreConnect',
  description: 'Plan your school calendar, automate reminders, and keep parent communication consistent.',
}

type CalendarPageProps = {
  searchParams?: {
    month?: string
    edit?: string
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

type CalendarEventRow = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  is_public: boolean
}

type AttendanceRow = {
  id: string
  date: string
  checked_in: boolean
  picked_up: boolean
}

type AnnouncementRow = {
  id: string
  title: string
  content: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

type ReminderRow = {
  id: string
  submitted_at: string | null
  status: string
  missing_documents: unknown
  children:
    | { first_name: string | null; last_name: string | null }
    | Array<{ first_name: string | null; last_name: string | null }>
    | null
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

function formatTimeHHMM(value: string | null | undefined) {
  if (!value) return null
  return value.slice(0, 5)
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeMissingDocuments(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

function toJhbDayAndTime(isoValue: string) {
  const parsed = new Date(isoValue)
  if (Number.isNaN(parsed.getTime())) return null
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(parsed)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')
  const hour = part('hour')
  const minute = part('minute')
  if (!year || !month || !day || !hour || !minute) return null
  return {
    dayKey: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  }
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

  const focusDate = parseDayKey(searchParams?.day) ?? today
  const focusDayKey = formatDayKey(focusDate)

  const rangeStartKey = `${selectedYear}-01-01`
  const rangeEndKey = `${selectedYear}-12-31`
  const rangeStartTs = `${rangeStartKey}T00:00:00.000Z`
  const rangeEndTs = `${rangeEndKey}T23:59:59.999Z`

  const [
    { data: eventRows },
    centreRow,
    { data: birthdaysRows },
    { data: attendanceRows },
    { data: announcementRows },
    { data: reminderRows },
  ] = await Promise.all([
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
    supabase
      .from('attendance')
      .select('id,date,checked_in,picked_up')
      .eq('ecd_id', ecdId)
      .gte('date', rangeStartKey)
      .lte('date', rangeEndKey)
      .limit(60000),
    supabase
      .from('announcements')
      .select('id,title,content,is_published,published_at,created_at')
      .eq('ecd_id', ecdId)
      .gte('created_at', rangeStartTs)
      .lte('created_at', rangeEndTs)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('applications')
      .select('id,submitted_at,status,missing_documents,children(first_name,last_name)')
      .eq('ecd_id', ecdId)
      .in('status', ['partial', 'draft'])
      .not('submitted_at', 'is', null)
      .gte('submitted_at', rangeStartTs)
      .lte('submitted_at', rangeEndTs)
      .order('submitted_at', { ascending: false })
      .limit(3000),
  ])

  const automationSettings = normalizeCommunicationAutomationSettings(
    centreRow?.communication_automation_settings ?? null
  )
  const rawCalendarEvents = ((eventRows ?? []) as CalendarEventRow[]) ?? []
  const attendanceSignalRows = ((attendanceRows ?? []) as AttendanceRow[]) ?? []
  const announcementSignalRows = ((announcementRows ?? []) as AnnouncementRow[]) ?? []
  const reminderSignalRows = ((reminderRows ?? []) as ReminderRow[]) ?? []

  const attendanceByDate = new Map<string, { total: number; checkedIn: number; pickedUp: number }>()
  for (const row of attendanceSignalRows) {
    const key = row.date
    if (!key) continue
    const current = attendanceByDate.get(key) ?? { total: 0, checkedIn: 0, pickedUp: 0 }
    current.total += 1
    if (row.checked_in) current.checkedIn += 1
    if (row.picked_up) current.pickedUp += 1
    attendanceByDate.set(key, current)
  }

  const calendarFeed: EcdCalendarFeedItem[] = []
  for (const event of rawCalendarEvents) {
    calendarFeed.push({
      id: `event:${event.id}`,
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      start_time: formatTimeHHMM(event.start_time),
      end_time: formatTimeHHMM(event.end_time),
      all_day: !event.start_time && !event.end_time,
      is_public: Boolean(event.is_public),
      source: 'event',
      href: `/ecd/calendar?month=${event.event_date.slice(0, 7)}&day=${event.event_date}&edit=${event.id}#editor`,
    })
  }

  for (const [eventDate, summary] of attendanceByDate.entries()) {
    calendarFeed.push({
      id: `attendance:${eventDate}`,
      title: `${summary.checkedIn} checked in`,
      description: `${summary.pickedUp} picked up · ${summary.total} attendance records`,
      event_date: eventDate,
      start_time: null,
      end_time: null,
      all_day: true,
      is_public: false,
      source: 'attendance',
      href: `/ecd/attendance`,
    })
  }

  for (const item of announcementSignalRows) {
    const sourceTimestamp = item.published_at ?? item.created_at
    const when = toJhbDayAndTime(sourceTimestamp)
    if (!when || when.dayKey < rangeStartKey || when.dayKey > rangeEndKey) continue
    calendarFeed.push({
      id: `announcement:${item.id}`,
      title: item.is_published ? item.title : `Draft: ${item.title}`,
      description: item.content,
      event_date: when.dayKey,
      start_time: null,
      end_time: null,
      all_day: true,
      is_public: item.is_published,
      source: 'announcement',
      href: `/ecd/announcements`,
    })
  }

  for (const reminder of reminderSignalRows) {
    if (!reminder.submitted_at) continue
    const dueAt = new Date(reminder.submitted_at)
    if (Number.isNaN(dueAt.getTime())) continue
    dueAt.setHours(dueAt.getHours() + automationSettings.reminder_delay_hours)
    const due = toJhbDayAndTime(dueAt.toISOString())
    if (!due || due.dayKey < rangeStartKey || due.dayKey > rangeEndKey) continue

    const child = normalizeOne(reminder.children)
    const childName = `${child?.first_name ?? 'Child'} ${child?.last_name ?? ''}`.trim()
    const missingLabels = toApplicationDocumentLabels(normalizeMissingDocuments(reminder.missing_documents))

    calendarFeed.push({
      id: `reminder:${reminder.id}`,
      title: `Reminder for ${childName}`,
      description:
        missingLabels.length > 0
          ? `Missing: ${missingLabels.slice(0, 3).join(', ')}`
          : 'Incomplete application details pending',
      event_date: due.dayKey,
      start_time: due.time,
      end_time: null,
      all_day: false,
      is_public: false,
      source: 'reminder',
      href: `/ecd/applications/${encodeURIComponent(reminder.id)}`,
    })
  }

  const editId = (searchParams?.edit ?? '').trim()
  const editingEvent = editId ? rawCalendarEvents.find((event) => event.id === editId) ?? null : null

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
    const repeat = String(formData.get('repeat') ?? '').trim()
    const isPublic = visibilityValue === 'public'

    if (!title || !eventDate) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) return
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) return
    if (startTime && endTime && startTime > endTime) return

<<<<<<< HEAD
    const events: {
      ecd_id: string
      title: string
      description: string | null
      event_date: string
      start_time: string | null
      end_time: string | null
      is_public: boolean
      created_by: string
    }[] = []
=======
    const events: { ecd_id: string; title: string; description: string | null; event_date: string; start_time: string | null; end_time: string | null; is_public: boolean; created_by: string }[] = []
>>>>>>> c182dad3f874cc9aeec7a242f8e5361f5d973135
    const baseDate = new Date(eventDate)
    
    if (!repeat) {
      events.push({
        ecd_id: session.ecdId,
        title,
        description: description || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        is_public: isPublic,
        created_by: session.user.id,
      })
    } else {
      const maxOccurrences = repeat === 'daily' ? 30 : repeat === 'weekly' ? 12 : 12
      for (let i = 0; i < maxOccurrences; i++) {
        const currentDate = new Date(baseDate)
        if (repeat === 'daily') {
          currentDate.setDate(currentDate.getDate() + i)
        } else if (repeat === 'weekly') {
          currentDate.setDate(currentDate.getDate() + (i * 7))
        } else if (repeat === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + i)
        }
        
        events.push({
          ecd_id: session.ecdId,
          title: `${title}${i > 0 ? ` (${i + 1})` : ''}`,
          description: description || null,
          event_date: currentDate.toISOString().split('T')[0],
          start_time: startTime || null,
          end_time: endTime || null,
          is_public: isPublic,
          created_by: session.user.id,
        })
      }
    }

    await session.supabase.from('calendar_events').insert(events)

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

  const clearSelectionHref = `/ecd/calendar?month=${currentMonthKey}&day=${focusDayKey}#editor`
  const parentCalendarHref = '/parent/calendar'

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-teal-100 bg-teal-50/70 p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">Planning Studio</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-700">
            Plan events once, keep parents informed professionally, and auto-sync birthdays as children enroll.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800">Share with Parents</h3>
              <p className="mt-1 text-sm text-amber-700">
                Parents can see public events and birthdays on their app. Make events &quot;Public&quot; to share them.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={parentCalendarHref}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Link href={parentCalendarHref}>Open</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <EcdIosCalendarView
          items={calendarFeed}
          initialMonthKey={currentMonthKey}
          initialDayKey={focusDayKey}
          todayKey={todayKey}
          nowBadge={nowBadge}
        />

        <section id="editor" className="grid gap-5 xl:grid-cols-2">
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
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="visibility" className="cc-native-field h-11 rounded-2xl">
                    <option value="internal">Internal</option>
                    <option value="public">Public (parent-facing)</option>
                  </select>
                  <select name="repeat" className="cc-native-field h-11 rounded-2xl">
                    <option value="">Does not repeat</option>
                    <option value="daily">Daily (every day)</option>
                    <option value="weekly">Weekly (same day each week)</option>
                    <option value="monthly">Monthly (same date each month)</option>
                  </select>
                </div>
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
                      <option value="in_app_whatsapp">In-app + WhatsApp</option>
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
    </>
  )
}

