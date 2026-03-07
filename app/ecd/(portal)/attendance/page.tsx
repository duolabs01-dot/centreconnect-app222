import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { getJohannesburgNowParts } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { AttendanceGridClient } from './attendance-grid-client'

export const revalidate = 0 // Disable cache for attendance to ensure real-time updates

export const metadata: Metadata = {
  title: 'DSD Attendance Register - CentreConnect',
  description: 'Official DSD-compliant monthly attendance register.',
}

export default async function EcdAttendancePage({
  searchParams,
}: {
  searchParams: { classId?: string; month?: string; year?: string }
}) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const now = getJohannesburgNowParts()
  
  const selectedYear = searchParams.year ? parseInt(searchParams.year) : now.year
  const selectedMonth = searchParams.month ? parseInt(searchParams.month) : now.month
  const selectedClassId = searchParams.classId || null

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

  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('child_id, date, status')
    .eq('centre_id', ecdId)
    .gte('date', startDate)
    .lte('date', endDate)

  return (
    <EcdOsShell
      title="Attendance Register"
      description="Monthly DSD-compliant register"
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : 'Staff'}
      userEmail={user.email ?? ''}
    >
      <AttendanceGridClient 
        ecdId={ecdId}
        centreName={centre?.name ?? ''}
        registrationNumber={centre?.registration_number ?? ''}
        classes={classes ?? []}
        enrolledChildren={children ?? []}
        initialAttendance={attendance ?? []}
        selectedClassId={selectedClassId}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        staffId={user.id}
      />
    </EcdOsShell>
  )
}
