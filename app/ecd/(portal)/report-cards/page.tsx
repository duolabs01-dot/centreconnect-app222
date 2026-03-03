import type { Metadata } from 'next'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { ReportCardsClient } from './report-cards-client'

export const metadata: Metadata = {
  title: 'Report Cards - CentreConnect',
  description: 'Create and publish term-based progress report cards for enrolled children.',
}

type EnrolledRow = {
  child_id: string | null
  children:
    | {
        id: string
        first_name: string | null
        last_name: string | null
      }
    | Array<{
        id: string
        first_name: string | null
        last_name: string | null
      }>
    | null
}

type ReportCardRow = {
  id: string
  child_id: string
  term: string
  period_start: string | null
  period_end: string | null
  status: 'draft' | 'published'
  teacher_name: string | null
  overall_comment: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  report_card_areas:
    | Array<{
        area_name: string
        rating: number
        comment: string | null
        sort_order: number
      }>
    | null
}

type PostgrestLikeError = {
  code?: string | null
  message?: string | null
} | null | undefined

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function isMissingReportCardsSchemaError(error: PostgrestLikeError) {
  if (!error) return false
  const message = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01' ||
    message.includes('relation "report_cards" does not exist') ||
    message.includes('relation "report_card_areas" does not exist')
  )
}

export default async function ReportCardsPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()

  const [{ data: childrenRows }, { data: enrolledRows }] = await Promise.all([
    supabase
      .from('children')
      .select('id,first_name,last_name')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(800),
    supabase
      .from('applications')
      .select('child_id,children(id,first_name,last_name)')
      .eq('ecd_id', ecdId)
      .eq('status', 'enrolled')
      .order('submitted_at', { ascending: false })
      .limit(400),
  ])

  const seenChildIds = new Set<string>()
  const enrolledChildren = [
    ...((childrenRows ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).flatMap((child) => {
      if (!child.id || seenChildIds.has(child.id)) return []
      seenChildIds.add(child.id)
      return [
        {
          id: child.id,
          first_name: child.first_name?.trim() || 'Child',
          last_name: child.last_name?.trim() || '',
        },
      ]
    }),
    ...((enrolledRows ?? []) as EnrolledRow[]).flatMap((row) => {
      const child = normalizeOne(row.children)
      const childId = child?.id ?? row.child_id
      if (!childId || seenChildIds.has(childId)) return []
      seenChildIds.add(childId)
      return [
        {
          id: childId,
          first_name: child?.first_name?.trim() || 'Child',
          last_name: child?.last_name?.trim() || '',
        },
      ]
    }),
  ]

  const childIds = enrolledChildren.map((child) => child.id)

  const { data: reportCardsRows, error: reportCardsError } =
    childIds.length > 0
      ? await supabase
          .from('report_cards')
          .select(
            'id,child_id,term,period_start,period_end,status,teacher_name,overall_comment,published_at,created_at,updated_at,report_card_areas(area_name,rating,comment,sort_order)'
          )
          .eq('ecd_id', ecdId)
          .in('child_id', childIds)
          .order('updated_at', { ascending: false })
          .limit(300)
      : { data: [] as ReportCardRow[] }

  const reportCardsWarning = isMissingReportCardsSchemaError(reportCardsError)
    ? 'Report Cards is not fully enabled yet for this environment. Run Supabase migrations 048 and 049, then refresh this page.'
    : reportCardsError
      ? 'Report Cards could not load right now. Please refresh or try again shortly.'
      : null

  const reportCards = ((reportCardsRows ?? []) as ReportCardRow[]).map((card) => ({
    id: card.id,
    child_id: card.child_id,
    term: card.term,
    period_start: card.period_start,
    period_end: card.period_end,
    status: card.status,
    teacher_name: card.teacher_name,
    overall_comment: card.overall_comment,
    published_at: card.published_at,
    created_at: card.created_at,
    updated_at: card.updated_at,
    report_card_areas: (card.report_card_areas ?? []).map((area) => ({
      area_name: area.area_name,
      rating: area.rating,
      comment: area.comment,
      sort_order: area.sort_order ?? 0,
    })),
  }))

  return (
    <ReportCardsClient
      enrolledChildren={enrolledChildren}
      initialReportCards={reportCards}
      reportCardsWarning={reportCardsWarning}
      userRoleLabel={
        role === 'ecd_admin'
          ? 'Creche Admin'
          : role === 'ecd_supervisor'
            ? 'Supervisor'
            : 'Staff Member'
      }
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    />
  )
}
