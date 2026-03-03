// app/ecd/(portal)/daily-reports/page.tsx
import type { Metadata } from 'next'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getJohannesburgNowParts } from '@/lib/utils'
import { DailyReportsClient } from './daily-reports-client'

export const metadata: Metadata = {
  title: 'Daily Reports - CentreConnect',
  description: 'Provide daily updates for parents on their children\'s meals, mood, and activities.',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function EcdDailyReportsPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const [childrenResult, enrolledResult, reportsResult] = await Promise.all([
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
      .limit(100),
    supabase
      .from('child_daily_reports')
      .select('*')
      .eq('ecd_id', ecdId)
      .eq('report_date', todayDate),
  ])

  const childrenRows = childrenResult.data ?? []
  const enrolledRows = enrolledResult.data ?? []
  const seenChildIds = new Set<string>()
  const enrolledChildren = [
    ...childrenRows.flatMap((child: any) => {
      const childId = child?.id
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
    ...enrolledRows.flatMap((row: any) => {
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

  const reportsByChild: Record<string, any> = {}
  for (const report of reportsResult.data ?? []) {
    reportsByChild[report.child_id] = report
  }

  return (
    <DailyReportsClient
      enrolledChildren={enrolledChildren}
      initialReportsByChild={reportsByChild}
      ecdId={ecdId}
      todayDate={todayDate}
      staffId={user.id}
      userRoleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? ''}
      userRole={role}
    />
  )
}

