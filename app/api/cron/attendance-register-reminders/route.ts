import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { upsertNotificationLog } from '@/lib/admin/notification-logs'
import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { sendEcdInAppNotification } from '@/lib/notifications/multi-channel'
import { getJohannesburgDateKey, JOHANNESBURG_TIME_ZONE } from '@/lib/utils'

const REMINDER_EVENT_TYPE = 'attendance_register_reminder'
const REMINDER_KIND = 'attendance_register_reminder'

function getJohannesburgWeekday(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: JOHANNESBURG_TIME_ZONE,
    weekday: 'short',
  }).format(value)
}

function formatJohannesburgLongDate(value: Date) {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: JOHANNESBURG_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(value)
}

function firstNameFromFullName(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] || 'there'
}

function buildReminderEmail(input: {
  contactName: string
  centreName: string
  todayLabel: string
  attendanceLink: string
}) {
  const { contactName, centreName, todayLabel, attendanceLink } = input
  const subject = `[CentreConnect] Attendance register still needs marking for ${centreName}`
  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6;">
    <p>Hi ${contactName},</p>
    <p>Your attendance register for <strong>${centreName}</strong> has still not been marked for <strong>${todayLabel}</strong>.</p>
    <p>We found enrolled children at the centre, but no attendance entries have been recorded yet for today.</p>
    <p>
      <a href="${attendanceLink}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">
        Open attendance register
      </a>
    </p>
    <p style="margin-top:24px;">If the register is already complete, you can ignore this message.</p>
    <p>Jarvis at CentreConnect</p>
  </body>
</html>`

  return { subject, html }
}

type CentreRow = {
  id: string
  name: string | null
  email: string | null
  owner_id: string | null
}

type ChildRow = {
  ecd_id: string | null
}

type AttendanceRecordRow = {
  centre_id: string | null
}

type LegacyAttendanceRow = {
  ecd_id: string | null
}

type MembershipRow = {
  ecd_id: string
  user_id: string
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
}

type UserProfileRow = {
  id: string
  full_name: string | null
}

type NotificationLogRow = {
  event_key: string
}

type EcdNotificationRow = {
  ecd_id: string
  metadata: Record<string, unknown> | null
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const weekday = getJohannesburgWeekday(now)
  if (weekday === 'Sat' || weekday === 'Sun') {
    return NextResponse.json({ ok: true, skipped: 'weekend' })
  }

  const admin = createAdminClient()
  const todayKey = getJohannesburgDateKey(now)
  const todayLabel = formatJohannesburgLongDate(now)
  const appUrl = normalizeAppUrl().replace(/\/$/, '')
  const attendanceLink = `${appUrl}/ecd/attendance`
  const recentCutoffIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  const results = {
    centresConsidered: 0,
    centresNeedingReminder: 0,
    inAppSent: 0,
    inAppAlreadySent: 0,
    emailSent: 0,
    emailQueued: 0,
    emailFailed: 0,
    skippedNoChildren: 0,
    skippedRegisterDone: 0,
    skippedNoRecipients: 0,
    skippedAlreadyReminded: 0,
    errors: [] as string[],
  }

  const { data: centres, error: centresError } = await admin
    .from('ecd_centres')
    .select('id,name,email,owner_id')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (centresError) {
    return NextResponse.json({ error: centresError.message }, { status: 400 })
  }

  const centreRows = (centres ?? []) as CentreRow[]
  if (centreRows.length === 0) {
    return NextResponse.json({ ok: true, ...results, note: 'No active centres to process' })
  }

  results.centresConsidered = centreRows.length
  const centreIds = centreRows.map((centre) => centre.id)

  const [
    childrenResult,
    attendanceRecordsResult,
    legacyAttendanceResult,
    membershipsResult,
    logsResult,
    notificationsResult,
  ] = await Promise.all([
    admin
      .from('children')
      .select('ecd_id')
      .in('ecd_id', centreIds)
      .eq('enrollment_status', 'active'),
    admin
      .from('attendance_records')
      .select('centre_id')
      .in('centre_id', centreIds)
      .eq('date', todayKey),
    admin
      .from('attendance')
      .select('ecd_id')
      .in('ecd_id', centreIds)
      .eq('date', todayKey),
    admin
      .from('ecd_admins')
      .select('ecd_id,user_id,role')
      .in('ecd_id', centreIds)
      .in('role', ['ecd_admin', 'ecd_supervisor']),
    admin
      .from('notification_logs')
      .select('event_key')
      .in('centre_id', centreIds)
      .eq('event_type', REMINDER_EVENT_TYPE)
      .gte('created_at', recentCutoffIso),
    admin
      .from('ecd_notifications')
      .select('ecd_id,metadata')
      .in('ecd_id', centreIds)
      .gte('created_at', recentCutoffIso),
  ])

  const bulkErrors = [
    childrenResult.error,
    attendanceRecordsResult.error,
    legacyAttendanceResult.error,
    membershipsResult.error,
    logsResult.error,
    notificationsResult.error,
  ].filter(Boolean)

  if (bulkErrors.length > 0) {
    return NextResponse.json(
      {
        error: bulkErrors.map((error) => error?.message ?? 'unknown error').join(' | '),
      },
      { status: 400 }
    )
  }

  const childRows = (childrenResult.data ?? []) as ChildRow[]
  const attendanceRows = (attendanceRecordsResult.data ?? []) as AttendanceRecordRow[]
  const legacyAttendanceRows = (legacyAttendanceResult.data ?? []) as LegacyAttendanceRow[]
  const membershipRows = (membershipsResult.data ?? []) as MembershipRow[]
  const existingLogRows = (logsResult.data ?? []) as NotificationLogRow[]
  const existingNotificationRows = (notificationsResult.data ?? []) as EcdNotificationRow[]

  const activeChildrenByCentre = new Map<string, number>()
  for (const row of childRows) {
    if (!row.ecd_id) continue
    activeChildrenByCentre.set(row.ecd_id, (activeChildrenByCentre.get(row.ecd_id) ?? 0) + 1)
  }

  const centresWithAttendance = new Set<string>()
  for (const row of attendanceRows) {
    if (row.centre_id) centresWithAttendance.add(row.centre_id)
  }
  for (const row of legacyAttendanceRows) {
    if (row.ecd_id) centresWithAttendance.add(row.ecd_id)
  }

  const sentEmailEventKeys = new Set(existingLogRows.map((row) => row.event_key))
  const sentInAppCentres = new Set(
    existingNotificationRows
      .filter((row) => row.metadata?.kind === REMINDER_KIND && row.metadata?.reminder_date === todayKey)
      .map((row) => row.ecd_id)
  )

  const userIds = new Set<string>()
  for (const centre of centreRows) {
    if (centre.owner_id) userIds.add(centre.owner_id)
  }
  for (const membership of membershipRows) {
    userIds.add(membership.user_id)
  }

  const uniqueUserIds = Array.from(userIds)
  const profilesResult = uniqueUserIds.length
    ? await admin.from('user_profiles').select('id,full_name').in('id', uniqueUserIds)
    : { data: [] as UserProfileRow[], error: null }

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 400 })
  }

  const profileById = new Map<string, UserProfileRow>()
  for (const profile of ((profilesResult.data ?? []) as UserProfileRow[])) {
    profileById.set(profile.id, profile)
  }

  const authEmailEntries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      return [userId, error ? null : data?.user?.email?.trim().toLowerCase() ?? null] as const
    })
  )
  const authEmailById = new Map<string, string | null>(authEmailEntries)

  const membershipsByCentre = new Map<string, MembershipRow[]>()
  for (const membership of membershipRows) {
    const current = membershipsByCentre.get(membership.ecd_id) ?? []
    current.push(membership)
    membershipsByCentre.set(membership.ecd_id, current)
  }

  for (const centre of centreRows) {
    const centreName = centre.name?.trim() || 'your creche'
    const activeChildrenCount = activeChildrenByCentre.get(centre.id) ?? 0
    if (activeChildrenCount === 0) {
      results.skippedNoChildren++
      continue
    }

    if (centresWithAttendance.has(centre.id)) {
      results.skippedRegisterDone++
      continue
    }

    results.centresNeedingReminder++

    const recipients = new Map<string, { email: string; name: string }>()
    const addRecipient = (email: string | null | undefined, name: string | null | undefined) => {
      const normalized = String(email ?? '').trim().toLowerCase()
      if (!normalized) return
      recipients.set(normalized, {
        email: normalized,
        name: firstNameFromFullName(name),
      })
    }

    addRecipient(centre.email, centreName)

    if (centre.owner_id) {
      const ownerProfile = profileById.get(centre.owner_id)
      addRecipient(authEmailById.get(centre.owner_id), ownerProfile?.full_name ?? centreName)
    }

    for (const membership of membershipsByCentre.get(centre.id) ?? []) {
      const profile = profileById.get(membership.user_id)
      addRecipient(authEmailById.get(membership.user_id), profile?.full_name ?? centreName)
    }

    const emailRecipients = Array.from(recipients.values())
    const allRecipientKeysAlreadySent =
      emailRecipients.length > 0 &&
      emailRecipients.every((recipient) =>
        sentEmailEventKeys.has(`${REMINDER_EVENT_TYPE}:${centre.id}:${todayKey}:${recipient.email}`)
      )

    if (emailRecipients.length === 0) {
      results.skippedNoRecipients++
      continue
    }

    if (sentInAppCentres.has(centre.id) && allRecipientKeysAlreadySent) {
      results.skippedAlreadyReminded++
      continue
    }

    if (sentInAppCentres.has(centre.id)) {
      results.inAppAlreadySent++
    } else {
      const inAppResult = await sendEcdInAppNotification(admin as any, {
        ecd_id: centre.id,
        title: 'Attendance register still needs marking today',
        message: `There are enrolled children at ${centreName}, but today’s attendance register has not been marked yet. Open Attendance to complete it now.`,
        metadata: {
          kind: REMINDER_KIND,
          reminder_date: todayKey,
          attendance_link: '/ecd/attendance',
          enrolled_children_count: activeChildrenCount,
        },
        is_read: false,
      })

      if (inAppResult.ok) {
        results.inAppSent++
        sentInAppCentres.add(centre.id)
      } else {
        results.errors.push(`${centre.id}: in-app notification failed (${inAppResult.error ?? 'unknown error'})`)
      }
    }

    for (const recipient of emailRecipients) {
      const eventKey = `${REMINDER_EVENT_TYPE}:${centre.id}:${todayKey}:${recipient.email}`
      if (sentEmailEventKeys.has(eventKey)) continue

      try {
        const email = buildReminderEmail({
          contactName: recipient.name,
          centreName,
          todayLabel,
          attendanceLink,
        })
        const delivery = await deliverTransactionalEmail({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
        })

        await upsertNotificationLog(admin, {
          centreId: centre.id,
          eventKey,
          eventType: REMINDER_EVENT_TYPE,
          channel: 'email',
          recipient: recipient.email,
          status: delivery.status,
          provider: delivery.directSent ? delivery.directProvider ?? 'smtp' : 'email_queue',
          providerMessageId: delivery.directMessageId ?? delivery.queueMessageId,
          payload: {
            reminder_date: todayKey,
            centre_name: centreName,
            enrolled_children_count: activeChildrenCount,
          },
          errorMessage: delivery.status === 'failed' ? delivery.deliveryMessage : null,
        })

        if (delivery.status === 'sent') {
          results.emailSent++
          sentEmailEventKeys.add(eventKey)
        } else if (delivery.status === 'queued') {
          results.emailQueued++
          sentEmailEventKeys.add(eventKey)
        } else {
          results.emailFailed++
          results.errors.push(`${centre.id}: email to ${recipient.email} failed (${delivery.deliveryMessage})`)
        }
      } catch (error) {
        results.emailFailed++
        results.errors.push(
          `${centre.id}: email to ${recipient.email} failed (${error instanceof Error ? error.message : String(error)})`
        )
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

export async function GET(request: Request) {
  return POST(request)
}
