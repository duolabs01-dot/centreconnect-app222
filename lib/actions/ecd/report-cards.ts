'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const dateValueSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).nullable()

const areaSchema = z.object({
  area_name: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(800).optional().or(z.literal('')).nullable(),
  sort_order: z.number().int().min(0).max(100).default(0),
})

const saveReportCardSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')).nullable(),
  child_id: z.string().uuid(),
  term: z.string().min(2).max(80),
  period_start: dateValueSchema,
  period_end: dateValueSchema,
  overall_comment: z.string().max(2500).optional().or(z.literal('')).nullable(),
  areas: z.array(areaSchema).min(1).max(20),
})

const reportCardIdSchema = z.string().uuid()

export type SaveReportCardInput = z.infer<typeof saveReportCardSchema>

export type ReportCardActionResult = {
  success: boolean
  message: string
  reportCardId?: string
}

export const DEFAULT_DEVELOPMENT_AREAS = [
  'Language & Literacy',
  'Numeracy & Mathematics',
  'Life Skills',
  'Physical Development',
  'Creative Arts',
  'Social & Emotional',
] as const

function normalizeDateInput(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim()
  return normalized || null
}

function normalizeTextInput(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim()
  return normalized || null
}

export async function saveReportCardAction(input: unknown): Promise<ReportCardActionResult> {
  const session = await requireEcdPortalSession({ cached: false })
  const parsed = saveReportCardSchema.safeParse(input)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid report card input.'
    return { success: false, message: firstIssue }
  }

  const payload = parsed.data
  const periodStart = normalizeDateInput(payload.period_start)
  const periodEnd = normalizeDateInput(payload.period_end)

  if (periodStart && periodEnd && periodStart > periodEnd) {
    return { success: false, message: 'Period end date must be on or after period start date.' }
  }

  const { data: childRecord, error: childError } = await session.supabase
    .from('children')
    .select('id')
    .eq('id', payload.child_id)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (childError || !childRecord?.id) {
    return { success: false, message: 'This child is not linked to your centre.' }
  }

  const { data: teacherProfile } = await session.supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle()

  const teacherName = normalizeTextInput(teacherProfile?.full_name) ?? session.user.email ?? 'ECD Staff'
  const normalizedTerm = payload.term.trim()

  const existingForTerm = await session.supabase
    .from('report_cards')
    .select('id,status')
    .eq('ecd_id', session.ecdId)
    .eq('child_id', payload.child_id)
    .eq('term', normalizedTerm)
    .maybeSingle()

  if (existingForTerm.error) {
    return { success: false, message: existingForTerm.error.message }
  }

  const resolvedId =
    normalizeTextInput(payload.id) ??
    (existingForTerm.data?.id ? String(existingForTerm.data.id) : null)

  if (resolvedId) {
    const { data: updated, error: updateError } = await session.supabase
      .from('report_cards')
      .update({
        term: normalizedTerm,
        period_start: periodStart,
        period_end: periodEnd,
        overall_comment: normalizeTextInput(payload.overall_comment),
        teacher_id: session.user.id,
        teacher_name: teacherName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedId)
      .eq('ecd_id', session.ecdId)
      .select('id')
      .maybeSingle()

    if (updateError || !updated?.id) {
      return { success: false, message: updateError?.message || 'Unable to update report card.' }
    }

    const { error: deleteAreasError } = await session.supabase
      .from('report_card_areas')
      .delete()
      .eq('report_card_id', resolvedId)

    if (deleteAreasError) {
      return { success: false, message: deleteAreasError.message }
    }

    const { error: insertAreasError } = await session.supabase.from('report_card_areas').insert(
      payload.areas.map((area, index) => ({
        report_card_id: resolvedId,
        area_name: area.area_name.trim(),
        rating: area.rating,
        comment: normalizeTextInput(area.comment),
        sort_order: area.sort_order ?? index,
      }))
    )

    if (insertAreasError) {
      return { success: false, message: insertAreasError.message }
    }

    revalidatePath('/ecd/report-cards')
    revalidatePath('/parent/report-cards')
    return { success: true, message: 'Report card saved.', reportCardId: resolvedId }
  }

  const { data: inserted, error: insertError } = await session.supabase
    .from('report_cards')
    .insert({
      ecd_id: session.ecdId,
      child_id: payload.child_id,
      term: normalizedTerm,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'draft',
      teacher_id: session.user.id,
      teacher_name: teacherName,
      overall_comment: normalizeTextInput(payload.overall_comment),
    })
    .select('id')
    .maybeSingle()

  if (insertError || !inserted?.id) {
    return { success: false, message: insertError?.message || 'Unable to create report card.' }
  }

  const createdId = String(inserted.id)
  const { error: areaInsertError } = await session.supabase.from('report_card_areas').insert(
    payload.areas.map((area, index) => ({
      report_card_id: createdId,
      area_name: area.area_name.trim(),
      rating: area.rating,
      comment: normalizeTextInput(area.comment),
      sort_order: area.sort_order ?? index,
    }))
  )

  if (areaInsertError) {
    return { success: false, message: areaInsertError.message }
  }

  revalidatePath('/ecd/report-cards')
  revalidatePath('/parent/report-cards')
  return { success: true, message: 'Report card saved as draft.', reportCardId: createdId }
}

export async function publishReportCardAction(reportCardIdRaw: string): Promise<ReportCardActionResult> {
  const parsed = reportCardIdSchema.safeParse(reportCardIdRaw)
  if (!parsed.success) {
    return { success: false, message: 'Invalid report card identifier.' }
  }

  const session = await requireEcdPortalSession({ cached: false })

  const { data: updated, error } = await session.supabase
    .from('report_cards')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data)
    .eq('ecd_id', session.ecdId)
    .select('id')
    .maybeSingle()

  if (error || !updated?.id) {
    return { success: false, message: error?.message || 'Unable to publish report card.' }
  }

  revalidatePath('/ecd/report-cards')
  revalidatePath('/parent/report-cards')
  return { success: true, message: 'Report card published to parents.', reportCardId: String(updated.id) }
}

export async function deleteReportCardAction(reportCardIdRaw: string): Promise<ReportCardActionResult> {
  const parsed = reportCardIdSchema.safeParse(reportCardIdRaw)
  if (!parsed.success) {
    return { success: false, message: 'Invalid report card identifier.' }
  }

  const session = await requireEcdPortalSession({ cached: false })

  const { data: existing, error: existingError } = await session.supabase
    .from('report_cards')
    .select('id,status')
    .eq('id', parsed.data)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (existingError || !existing?.id) {
    return { success: false, message: 'Report card not found.' }
  }

  if (existing.status === 'published') {
    return { success: false, message: 'Published report cards cannot be deleted.' }
  }

  const { error: deleteError } = await session.supabase
    .from('report_cards')
    .delete()
    .eq('id', parsed.data)
    .eq('ecd_id', session.ecdId)

  if (deleteError) {
    return { success: false, message: deleteError.message }
  }

  revalidatePath('/ecd/report-cards')
  revalidatePath('/parent/report-cards')
  return { success: true, message: 'Draft report card deleted.', reportCardId: parsed.data }
}
