import type { Metadata } from 'next'
import { getJohannesburgNowParts } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { hasEcdFeatureAccess } from '@/lib/ecd/feature-gates'
import { fetchMergedAttendance } from '@/lib/ecd/attendance-merge'
import { AttendanceGridClient } from './attendance-grid-client'
import { AttendanceRealtimeBridge } from '@/components/ecd/AttendanceRealtimeBridge'

export const revalidate = 0 // Disable cache for attendance to ensure real-time updates

export const metadata: Metadata = {
  title: 'DSD Attendance Register - CentreConnect',
  description: 'Official DSD-compliant monthly attendance register.',
}

export default async function EcdAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; month?: string; year?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const attendanceAccess = await hasEcdFeatureAccess({ supabase, ecdId, feature: 'attendance' })
  const isStarterTier = !attendanceAccess.allowed
  const now = getJohannesburgNowParts()

  // Starter tier: lock to current month only
  const selectedYear = (!isStarterTier && resolvedSearchParams.year) ? parseInt(resolvedSearchParams.year) : now.year
  const selectedMonth = (!isStarterTier && resolvedSearchParams.month) ? parseInt(resolvedSearchParams.month) : now.month
  const selectedClassId = resolvedSearchParams.classId || null

  // Fetch classes for the centre
  const { data: classes } = await supabase
    .from('ecd_classes')
    .select('id, name, practitioner_name')
    .eq('ecd_id', ecdId)
    .order('name')

  // Fetch centre details for the header
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('name, registration_number')
    .eq('id', ecdId)
    .single()

  // Fetch children for the selected class (or all if no class selected)
  let childrenQuery = supabase
    .from('children')
    .select('id, first_name, last_name, date_of_birth, class_id')
    .eq('ecd_id', ecdId)

  if (selectedClassId) {
    childrenQuery = childrenQuery.eq('class_id', selectedClassId)
  }

  const { data: children } = await childrenQuery.order('first_name')

  // Fetch attendance records for the selected month
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`

  const attendance = await fetchMergedAttendance({ supabase, ecdId, startDate, endDate })

  return (
    <>
      <AttendanceRealtimeBridge ecdId={ecdId} />
      <AttendanceGridClient
        ecdId={ecdId}
        centreName={centre?.name ?? ''}
        registrationNumber={centre?.registration_number ?? ''}
        classes={classes ?? []}
        enrolledChildren={children ?? []}
        initialAttendance={attendance as Array<{ child_id: string; date: string; status: 'present' | 'absent' | 'sick' | 'late' | null }>}
        selectedClassId={selectedClassId}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        staffId={user.id}
        isStarterTier={isStarterTier}
      />
    </>
  )
}

