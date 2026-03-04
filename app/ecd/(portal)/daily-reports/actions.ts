'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

const mealValueSchema = z.enum(['all', 'some', 'none', 'not_offered'])
const moodValueSchema = z.enum(['happy', 'good', 'tired', 'unsettled', 'upset'])

const reportPayloadSchema = z.object({
  breakfast_eaten: mealValueSchema.optional().nullable(),
  lunch_eaten: mealValueSchema.optional().nullable(),
  snack_eaten: mealValueSchema.optional().nullable(),
  mood: moodValueSchema.optional().nullable(),
  nap_start: z.string().optional().nullable(),
  nap_end: z.string().optional().nullable(),
  activities: z.array(z.string()).optional().nullable(),
  teacher_notes: z.string().max(3000).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
})

const saveDailyReportSchema = z.object({
  childId: z.string().uuid(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  publish: z.boolean().default(false),
  report: reportPayloadSchema,
})

export type SaveDailyReportResult = {
  ok: boolean
  error?: string
  report?: Record<string, unknown>
  whatsappHref?: string
  warning?: string
}

function normalizeText(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeActivities(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((entry) => entry.trim()).filter(Boolean)))
}

function hasDraftSignal(value: z.infer<typeof reportPayloadSchema>) {
  return Boolean(
    value.breakfast_eaten ||
      value.lunch_eaten ||
      value.snack_eaten ||
      value.mood ||
      value.nap_start ||
      value.nap_end ||
      (value.activities && value.activities.length > 0) ||
      normalizeText(value.teacher_notes)
  )
}

export async function saveDailyReportAction(input: unknown): Promise<SaveDailyReportResult> {
  const parsed = saveDailyReportSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid report payload.' }
  }

  const session = await requireEcdPortalSession({ cached: false })
  const payload = parsed.data
  const publish = payload.publish

  const { data: child } = await session.supabase
    .from('children')
    .select('id,parent_id,first_name,last_name')
    .eq('id', payload.childId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (!child) return { ok: false, error: 'Child not found for this centre.' }

  const cleanedReport = {
    breakfast_eaten: payload.report.breakfast_eaten ?? null,
    lunch_eaten: payload.report.lunch_eaten ?? null,
    snack_eaten: payload.report.snack_eaten ?? null,
    mood: payload.report.mood ?? null,
    nap_start: normalizeText(payload.report.nap_start),
    nap_end: normalizeText(payload.report.nap_end),
    activities: sanitizeActivities(payload.report.activities),
    teacher_notes: normalizeText(payload.report.teacher_notes),
    photo_url: normalizeText(payload.report.photo_url),
  }

  const nowIso = new Date().toISOString()
  const reportToSave: Record<string, unknown> = {
    ecd_id: session.ecdId,
    child_id: payload.childId,
    report_date: payload.reportDate,
    ...cleanedReport,
  }

  if (publish) {
    reportToSave.published_at = nowIso
    reportToSave.published_by = session.user.id
  }

  const { data: savedReport, error: upsertError } = await session.supabase
    .from('child_daily_reports')
    .upsert(reportToSave, { onConflict: 'ecd_id,child_id,report_date' })
    .select('*')
    .single()

  if (upsertError || !savedReport) {
    return { ok: false, error: upsertError?.message || 'Failed to save daily report.' }
  }

  let whatsappHref: string | undefined
  let warning: string | undefined

  if (publish && child.parent_id) {
    const childName = `${normalizeText(child.first_name) ?? 'Child'} ${normalizeText(child.last_name) ?? ''}`.trim()

    const [{ data: parent }, { data: centre }, { data: application }] = await Promise.all([
      session.supabase
        .from('parents')
        .select('id,alt_phone,user_profiles(full_name,phone)')
        .eq('id', child.parent_id)
        .maybeSingle(),
      session.supabase.from('ecd_centres').select('name,email').eq('id', session.ecdId).maybeSingle(),
      session.supabase
        .from('applications')
        .select('id')
        .eq('ecd_id', session.ecdId)
        .eq('child_id', child.id)
        .in('status', ['draft', 'partial', 'submitted', 'in_review', 'approved', 'enrolled', 'waitlisted'])
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const parentProfileRaw = parent?.user_profiles
    const parentProfile = Array.isArray(parentProfileRaw) ? parentProfileRaw[0] : parentProfileRaw
    const parentPhone = normalizeText(parentProfile?.phone) || normalizeText(parent?.alt_phone) || null
    const centreName = normalizeText(centre?.name) || 'your creche'
    const shortDate = new Date(`${payload.reportDate}T00:00:00Z`).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    const notePreview = normalizeText(cleanedReport.teacher_notes)
    const summaryLine = notePreview
      ? notePreview.length > 140
        ? `${notePreview.slice(0, 137)}...`
        : notePreview
      : 'Daily highlights are now available.'
    const parentMessage = `Daily report ready for ${childName} (${shortDate}). ${summaryLine}`

    const parentNotification = await sendParentInAppAndWhatsappNotification(session.supabase as any, {
      parent_id: child.parent_id,
      ecd_id: session.ecdId,
      application_id: application?.id ?? null,
      template_key: 'daily_report_ready',
      title: `${childName}: daily report ready`,
      message: parentMessage,
      parent_phone: parentPhone,
      recipient_name: parentProfile?.full_name ?? null,
      whatsapp_event_type: 'daily_report_ready',
      whatsapp_event_key: `daily_report_ready:${String(savedReport.id)}`,
      whatsapp_metadata: {
        child_name: childName,
        report_date: payload.reportDate,
        report_id: String(savedReport.id),
      },
      is_read: false,
    })
    whatsappHref = parentNotification.whatsappHref ?? undefined

    const reportState = hasDraftSignal(payload.report) ? 'published' : 'published (minimal fields)'
    const ecdMessage = `${childName} daily report was ${reportState} for ${shortDate} by ${session.user.email ?? 'staff'}.`
    const ecdEmailSubject = `[CentreConnect] Daily report published for ${childName}`
    const ecdEmailBody = `
      <p>Hello team,</p>
      <p>${ecdMessage}</p>
      <p>Centre: <strong>${centreName}</strong></p>
      <p>Date: <strong>${shortDate}</strong></p>
      <p>Open Daily Reports to review or update.</p>
    `

    const ecdNotification = await sendEcdInAppAndEmailNotification(session.supabase as any, {
      ecd_id: session.ecdId,
      application_id: application?.id ?? null,
      title: 'Daily report published',
      message: ecdMessage,
      metadata: {
        kind: 'daily_report_ready',
        child_id: child.id,
        report_date: payload.reportDate,
        report_id: savedReport.id,
      },
      email_recipient: normalizeText(centre?.email),
      email_subject: ecdEmailSubject,
      email_body: ecdEmailBody,
      is_read: false,
    })

    if (!parentNotification.ok || !ecdNotification.ok) {
      warning = 'Report saved and published, but at least one notification channel failed.'
    }
  }

  revalidatePath('/ecd/daily-reports')
  revalidatePath('/parent/daily-reports')
  revalidatePath('/parent/notifications')
  revalidatePath('/ecd/communications')

  return {
    ok: true,
    report: savedReport as Record<string, unknown>,
    whatsappHref,
    warning,
  }
}
