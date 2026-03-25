// app/ecd/(portal)/daily-reports/page.tsx
import type { Metadata } from 'next'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { hasEcdFeatureAccess } from '@/lib/ecd/feature-gates'
import { getJohannesburgNowParts } from '@/lib/utils'
import { DailyReportsClient } from './daily-reports-client'

export const metadata: Metadata = {
  title: 'Daily Reports - CentreConnect',
  description: 'Provide daily updates for parents on their children\'s meals, mood, and activities.',
}

type ChildRecord = {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10)
}

export default async function EcdDailyReportsPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const dailyReportsAccess = await hasEcdFeatureAccess({ supabase, ecdId, feature: 'daily-reports' })
  // Starter tier gets mood-only; Growth+ gets the full daily reports experience
  const isStarterTier = !dailyReportsAccess.allowed

  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const todayUtc = new Date(Date.UTC(year, month - 1, day))
  const weekStartUtc = new Date(todayUtc)
  const weekDay = (todayUtc.getUTCDay() + 6) % 7
  weekStartUtc.setUTCDate(todayUtc.getUTCDate() - weekDay)
  const lookbackUtc = new Date(todayUtc)
  lookbackUtc.setUTCDate(todayUtc.getUTCDate() - 45)
  const weekStartDate = toDateString(weekStartUtc)
  const lookbackDate = toDateString(lookbackUtc)

  const [childrenResult, enrolledResult, reportsResult] = await Promise.all([
    supabase
      .from('children')
      .select('id,first_name,last_name,photo_url')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(800),
    supabase
      .from('applications')
      .select('child_id,children(id,first_name,last_name,photo_url)')
      .eq('ecd_id', ecdId)
      .eq('status', 'enrolled')
      .limit(100),
    supabase
      .from('child_daily_reports')
      .select('*')
      .eq('ecd_id', ecdId)
      .gte('report_date', lookbackDate)
      .lte('report_date', todayDate)
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const childrenRows = childrenResult.data ?? []
  const enrolledRows = enrolledResult.data ?? []
  const seenChildIds = new Set<string>()
  const enrolledChildren: ChildRecord[] = [
    ...childrenRows.flatMap((child: any) => {
      const childId = child?.id
      if (!childId || seenChildIds.has(childId)) return []
      seenChildIds.add(childId)
      return [
        {
          id: childId,
          first_name: child?.first_name?.trim() || 'Child',
          last_name: child?.last_name?.trim() || '',
          photo_url: child?.photo_url ?? null,
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
          photo_url: child?.photo_url ?? null,
        },
      ]
    }),
  ]
  const reports = reportsResult.data ?? []

  return (
    <DailyReportsClient
      enrolledChildren={enrolledChildren}
      initialReports={reports as any[]}
      ecdId={ecdId}
      todayDate={todayDate}
      weekStartDate={weekStartDate}
      staffId={user.id}
      userRoleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? ''}
      userRole={role}
      isStarterTier={isStarterTier}
    />
  )
}

