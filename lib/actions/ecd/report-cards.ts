'use server'

import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

// ── Schemas ──────────────────────────────────────────────────────
const areaSchema = z.object({
  area_name: z.string().min(1, 'Area name is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
})

const saveReportCardSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  child_id: z.string().uuid(),
  term: z.string().min(1, 'Term is required'),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  overall_comment: z.string().optional().nullable(),
  areas: z.array(areaSchema).min(1, 'At least one development area is required'),
})

export type SaveReportCardInput = z.infer<typeof saveReportCardSchema>

export type ReportCardActionResult = {
  success: boolean
  message: string
  reportCardId?: string
}

// ── Default development areas for South African ECD ──────────────
export const DEFAULT_DEVELOPMENT_AREAS = [
  'Language & Literacy',
  'Numeracy & Mathematics',
  'Life Skills',
  'Physical Development',
  'Creative Arts',
  'Social & Emotional',
] as const

// ── Save (create or update) a report card ────────────────────────
export async function saveReportCardAction(
  input: unknown
): Promise<ReportCardActionResult> {
  const session = await requireEcdPortalSession({ cached: false })
  const parsed = saveReportCardSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { success: false, message: firstError }
  }

  const { id, child_id, term, period_start, period_end, overall_comment, areas } = parsed.data

  // Verify child belongs to this centre
  const { data: childCheck } = await session.supabase
    .from('children')
    .select('id')
    .eq('id', child_id)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (!childCheck) {
    return { success: false, message: 'Child not found in your centre.' }
  }

  // Get teacher name from profile
  const { data: teacherProfile } = await session.supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle()

  const teacherName = teacherProfile?.full_name ?? session.user.email ?? 'Staff'

  if (id) {
    // ── Update existing report card ──
    const { error: updateError } = await session.supabase
      .from('report_cards')
      .update({
        term,
        period_start: period_start || null,
        period_end: period_end || null,
        overall_comment: overall_comment || null,
        teacher_name: teacherName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('ecd_id', session.ecdId)

    if (updateError) {
      return { success: false, message: updateError.message }
    }

    // Replace areas: delete old, insert new
    await session.supabase
      .from('report_card_areas')
      .delete()
      .eq('report_card_id', id)

    const { error: areasError } = await session.supabase
      .from('report_card_areas')
      .insert(
        areas.map((a, i) => ({
          report_card_id: id,
          area_name: a.area_name,
          rating: a.rating,
          comment: a.comment || null,
          sort_order: a.sort_order ?? i,
        }))
      )

    if (areasError) {
      return { success: false, message: areasError.message }
    }

    return { success: true, message: 'Report card updated.', reportCardId: id }
  }

  // ── Create new report card ──
  const { data: inserted, error: insertError } = await session.supabase
    .from('report_cards')
    .insert({
      ecd_id: session.ecdId,
      child_id,
      term,
      period_start: period_start || null,
      period_end: period_end || null,
      overall_comment: overall_comment || null,
      teacher_id: session.user.id,
      teacher_name: teacherName,
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    return { success: false, message: insertError?.message ?? 'Failed to create report card.' }
  }

  const { error: areasInsertError } = await session.supabase
    .from('report_card_areas')
    .insert(
      areas.map((a, i) => ({
        report_card_id: inserted.id,
        area_name: a.area_name,
        rating: a.rating,
        comment: a.comment || null,
        sort_order: a.sort_order ?? i,
      }))
    )

  if (areasInsertError) {
    return { success: false, message: areasInsertError.message }
  }

  return { success: true, message: 'Report card saved as draft.', reportCardId: inserted.id }
}

// ── Publish a report card ────────────────────────────────────────
export async function publishReportCardAction(
  reportCardId: string
): Promise<ReportCardActionResult> {
  if (!reportCardId) {
    return { success: false, message: 'Report card ID is required.' }
  }

  const session = await requireEcdPortalSession({ cached: false })

  const { error } = await session.supabase
    .from('report_cards')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportCardId)
    .eq('ecd_id', session.ecdId)

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: 'Report card published to parents.', reportCardId }
}

// ── Delete a draft report card ───────────────────────────────────
export async function deleteReportCardAction(
  reportCardId: string
): Promise<ReportCardActionResult> {
  if (!reportCardId) {
    return { success: false, message: 'Report card ID is required.' }
  }

  const session = await requireEcdPortalSession({ cached: false })

  // Only allow deleting drafts
  const { data: existing } = await session.supabase
    .from('report_cards')
    .select('status')
    .eq('id', reportCardId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (!existing) {
    return { success: false, message: 'Report card not found.' }
  }

  if (existing.status === 'published') {
    return { success: false, message: 'Cannot delete a published report card.' }
  }

  const { error } = await session.supabase
    .from('report_cards')
    .delete()
    .eq('id', reportCardId)
    .eq('ecd_id', session.ecdId)

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: 'Report card deleted.' }
}
