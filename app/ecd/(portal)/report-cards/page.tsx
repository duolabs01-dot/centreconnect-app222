import type { Metadata } from 'next'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { ReportCardsClient } from './report-cards-client'

export const metadata: Metadata = {
  title: 'Report Cards — CentreConnect',
  description: 'Create and share child progress reports with parents.',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ReportCardsPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()

  // 1. Get enrolled children for this centre
  const { data: enrolledRows } = await supabase
    .from('applications')
    .select('child_id,children(id,first_name,last_name)')
    .eq('ecd_id', ecdId)
    .eq('status', 'enrolled')
    .limit(200)

  const seenChildIds = new Set<string>()
  const enrolledChildren = (enrolledRows ?? []).flatMap((row: any) => {
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
  })

  // 2. Get all report cards for this centre with their areas
  const { data: reportCardsRaw } = await supabase
    .from('report_cards')
    .select('*,report_card_areas(*)')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })
    .limit(200)

  const reportCards = (reportCardsRaw ?? []).map((rc: any) => ({
    id: rc.id,
    child_id: rc.child_id,
    term: rc.term,
    period_start: rc.period_start,
    period_end: rc.period_end,
    status: rc.status,
    teacher_name: rc.teacher_name,
    overall_comment: rc.overall_comment,
    published_at: rc.published_at,
    created_at: rc.created_at,
    updated_at: rc.updated_at,
    report_card_areas: (rc.report_card_areas ?? []).map((a: any) => ({
      area_name: a.area_name,
      rating: a.rating,
      comment: a.comment,
      sort_order: a.sort_order,
    })),
  }))

  return (
    <ReportCardsClient
      enrolledChildren={enrolledChildren}
      initialReportCards={reportCards}
      ecdId={ecdId}
      userRoleLabel={
        role === 'ecd_admin'
          ? 'Creche Admin'
          : role === 'ecd_supervisor'
            ? 'Supervisor'
            : 'Staff Member'
      }
      userEmail={user.email ?? ''}
      userRole={role}
    />
  )
}
