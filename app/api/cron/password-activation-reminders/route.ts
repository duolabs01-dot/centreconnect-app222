import { NextResponse } from 'next/server'

import { upsertNotificationLog } from '@/lib/admin/notification-logs'
import {
  buildFirstPartyConfirmLink,
  buildLockedResetPasswordRedirect,
  normalizeAppUrl,
  sanitizeGeneratedAccessLinkWithDiagnostics,
} from '@/lib/auth/onboarding-links'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { renderPasswordActivationReminderEmail } from '@/lib/email/templates/password-activation-reminder'
import { createAdminClient } from '@/lib/supabase/admin'
import { JOHANNESBURG_TIME_ZONE } from '@/lib/utils'

const PASSWORD_ACTIVATION_EVENT_TYPES = [
  'password_activation_day1',
  'password_activation_day3',
  'password_activation_day7',
  'password_activation_weekly',
] as const

type PasswordActivationEventType = (typeof PASSWORD_ACTIVATION_EVENT_TYPES)[number]

type CentreRow = {
  id: string
  name: string | null
  email: string | null
  owner_id: string | null
  is_deleted: boolean | null
}

type ProfileRow = {
  id: string
  first_name: string | null
  full_name: string | null
  first_password_set_at: string | null
  activation_requested_at: string | null
  account_activation_required: boolean | null
}

type LogRow = {
  centre_id: string | null
  event_type: string
  event_key: string
  status: string
  created_at: string
  payload: Record<string, unknown> | null
}

type ReminderDecision = {
  eventType: PasswordActivationEventType
  reminderLabel: string
  dueDays: number
  eventKeySuffix: string
  weeklyOrdinal?: number
}

function getJohannesburgWeekday(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: JOHANNESBURG_TIME_ZONE,
    weekday: 'short',
  }).format(value)
}

function normalizeName(value: string | null | undefined, fallback: string) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function firstName(value: string | null | undefined, fallback = 'there') {
  const text = normalizeName(value, fallback)
  return text.split(/\s+/)[0] || fallback
}

function ageDaysFrom(anchorIso: string, now = new Date()) {
  const anchor = new Date(anchorIso)
  if (Number.isNaN(anchor.getTime())) return 0
  return Math.floor((now.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000))
}

function createSentState(logs: LogRow[]) {
  const sentEventTypes = new Set<string>()
  const weeklyOrdinals = new Set<number>()
  let lastSentAt: string | null = null

  for (const log of logs) {
    if (log.status === 'failed') continue
    sentEventTypes.add(log.event_type)
    if (!lastSentAt || new Date(log.created_at).getTime() > new Date(lastSentAt).getTime()) {
      lastSentAt = log.created_at
    }

    if (log.event_type === 'password_activation_weekly') {
      const weeklyOrdinal = Number(log.payload?.weekly_ordinal)
      if (Number.isFinite(weeklyOrdinal) && weeklyOrdinal > 0) {
        weeklyOrdinals.add(weeklyOrdinal)
      }
    }
  }

  return { sentEventTypes, weeklyOrdinals, lastSentAt }
}

function decideReminder(ageDays: number, sentState: ReturnType<typeof createSentState>): ReminderDecision | null {
  if (ageDays >= 14) {
    const weeklyOrdinal = Math.floor((ageDays - 14) / 7) + 1
    if (!sentState.weeklyOrdinals.has(weeklyOrdinal)) {
      const weekCount = weeklyOrdinal + 1
      return {
        eventType: 'password_activation_weekly',
        reminderLabel: `Weekly follow-up, week ${weekCount}`,
        dueDays: 14 + (weeklyOrdinal - 1) * 7,
        eventKeySuffix: `weekly-${weeklyOrdinal}`,
        weeklyOrdinal,
      }
    }
    return null
  }

  if (ageDays >= 7 && !sentState.sentEventTypes.has('password_activation_day7')) {
    return {
      eventType: 'password_activation_day7',
      reminderLabel: 'Day 7 follow-up',
      dueDays: 7,
      eventKeySuffix: 'day7',
    }
  }

  if (ageDays >= 3 && !sentState.sentEventTypes.has('password_activation_day3')) {
    return {
      eventType: 'password_activation_day3',
      reminderLabel: 'Day 3 follow-up',
      dueDays: 3,
      eventKeySuffix: 'day3',
    }
  }

  if (ageDays >= 1 && !sentState.sentEventTypes.has('password_activation_day1')) {
    return {
      eventType: 'password_activation_day1',
      reminderLabel: 'Day 1 follow-up',
      dueDays: 1,
      eventKeySuffix: 'day1',
    }
  }

  return null
}

async function generatePasswordSetupLink(admin: ReturnType<typeof createAdminClient>, email: string) {
  const resetPath = `/reset-password?locked_email=${encodeURIComponent(email)}`
  const fallbackRedirectTo = buildLockedResetPasswordRedirect(email)
  const recoveryResult = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: fallbackRedirectTo },
  })

  const actionLink = recoveryResult.data?.properties?.action_link?.trim() ?? ''
  if (!recoveryResult.error && actionLink) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: recoveryResult.data?.properties?.hashed_token ?? null,
      verificationType: recoveryResult.data?.properties?.verification_type ?? 'recovery',
      nextPath: resetPath,
    })
    const sanitized = sanitizeGeneratedAccessLinkWithDiagnostics({
      actionLink,
      fallbackRedirectTo,
    })

    return {
      link: firstPartyConfirmLink ?? sanitized.link,
      warning: null as string | null,
      diagnostics: sanitized.diagnostics,
    }
  }

  return {
    link: '',
    warning: recoveryResult.error?.message ?? 'Failed to generate password setup link.',
    diagnostics: null,
  }
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
  const appUrl = normalizeAppUrl().replace(/\/$/, '')
  const loginUrl = `${appUrl}/ecd/login`

  const results = {
    centresConsidered: 0,
    remindersDue: 0,
    emailsSent: 0,
    emailsQueued: 0,
    emailsFailed: 0,
    skippedAlreadySatisfied: 0,
    skippedNotDue: 0,
    skippedMissingEmail: 0,
    errors: [] as string[],
  }

  const { data: centres, error: centresError } = await admin
    .from('ecd_centres')
    .select('id,name,email,owner_id,is_deleted')
    .eq('is_deleted', false)
    .not('owner_id', 'is', null)
    .order('created_at', { ascending: true })

  if (centresError) {
    return NextResponse.json({ error: centresError.message }, { status: 400 })
  }

  const centreRows = (centres ?? []) as CentreRow[]
  if (centreRows.length === 0) {
    return NextResponse.json({ ok: true, ...results, note: 'No centres to process' })
  }

  results.centresConsidered = centreRows.length
  const ownerIds = Array.from(new Set(centreRows.map((row) => row.owner_id).filter(Boolean) as string[]))
  const centreIds = centreRows.map((row) => row.id)

  const [profilesResult, logsResult] = await Promise.all([
    admin
      .from('user_profiles')
      .select('id,first_name,full_name,first_password_set_at,activation_requested_at,account_activation_required')
      .in('id', ownerIds),
    admin
      .from('notification_logs')
      .select('centre_id,event_type,event_key,status,created_at,payload')
      .in('centre_id', centreIds)
      .in('event_type', [...PASSWORD_ACTIVATION_EVENT_TYPES])
      .order('created_at', { ascending: false }),
  ])

  if (profilesResult.error || logsResult.error) {
    return NextResponse.json(
      { error: profilesResult.error?.message ?? logsResult.error?.message ?? 'Query failed' },
      { status: 400 }
    )
  }

  const profileById = new Map<string, ProfileRow>()
  for (const profile of (profilesResult.data ?? []) as ProfileRow[]) {
    profileById.set(profile.id, profile)
  }

  const logsByCentre = new Map<string, LogRow[]>()
  for (const log of (logsResult.data ?? []) as LogRow[]) {
    if (!log.centre_id) continue
    const current = logsByCentre.get(log.centre_id) ?? []
    current.push(log)
    logsByCentre.set(log.centre_id, current)
  }

  for (const centre of centreRows) {
    const ownerId = centre.owner_id
    if (!ownerId) {
      results.skippedMissingEmail++
      continue
    }

    const profile = profileById.get(ownerId)
    if (!profile?.account_activation_required || profile.first_password_set_at) {
      results.skippedAlreadySatisfied++
      continue
    }

    const activationRequestedAt = profile.activation_requested_at
    const ownerEmail = normalizeName(centre.email, '')
    if (!activationRequestedAt) {
      results.skippedNotDue++
      continue
    }
    if (!ownerEmail) {
      results.skippedMissingEmail++
      continue
    }

    const ageDays = ageDaysFrom(activationRequestedAt, now)
    const sentState = createSentState(logsByCentre.get(centre.id) ?? [])
    const reminder = decideReminder(ageDays, sentState)

    if (!reminder) {
      results.skippedNotDue++
      continue
    }

    results.remindersDue++

    const setupLink = await generatePasswordSetupLink(admin, ownerEmail)
    if (!setupLink.link) {
      results.emailsFailed++
      results.errors.push(`${centre.id}: ${setupLink.warning ?? 'could not generate setup link'}`)
      continue
    }

    const ownerName = firstName(profile.first_name ?? profile.full_name, centre.name ?? 'there')
    const email = renderPasswordActivationReminderEmail({
      ownerName,
      centreName: normalizeName(centre.name, 'your centre'),
      setupLink: setupLink.link,
      loginUrl,
      reminderLabel: reminder.reminderLabel,
    })

    const delivery = await deliverTransactionalEmail({
      to: ownerEmail,
      subject: email.subject,
      html: email.html,
    })

    const eventKey = `${reminder.eventType}:${centre.id}:${reminder.eventKeySuffix}`
    await upsertNotificationLog(admin, {
      centreId: centre.id,
      eventKey,
      eventType: reminder.eventType,
      channel: 'email',
      recipient: ownerEmail,
      status: delivery.status,
      provider: delivery.directSent ? delivery.directProvider ?? 'smtp' : delivery.queueSuccess ? 'email_queue' : 'smtp',
      providerMessageId: delivery.directMessageId ?? delivery.queueMessageId,
      payload: {
        centre_name: centre.name,
        activation_requested_at: activationRequestedAt,
        due_days: reminder.dueDays,
        reminder_label: reminder.reminderLabel,
        weekly_ordinal: reminder.weeklyOrdinal ?? null,
        link_sanitization: setupLink.diagnostics,
      },
      errorMessage: delivery.status === 'failed' ? delivery.deliveryMessage : null,
    })

    if (delivery.status === 'sent') {
      results.emailsSent++
    } else if (delivery.status === 'queued') {
      results.emailsQueued++
    } else {
      results.emailsFailed++
      results.errors.push(`${centre.id}: ${delivery.deliveryMessage}`)
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

export async function GET(request: Request) {
  return POST(request)
}
