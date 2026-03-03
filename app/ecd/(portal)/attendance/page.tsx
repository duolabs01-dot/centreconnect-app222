import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { getJohannesburgNowParts } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { AttendanceClient } from './attendance-client'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Attendance - CentreConnect',
  description: 'Mark daily check-ins and pickups for enrolled children.',
}

type EnrolledApplicationRow = {
  child_id: string | null
  parent_id: string | null
  children:
    | { id: string; first_name: string | null; last_name: string | null }
    | Array<{ id: string; first_name: string | null; last_name: string | null }>
    | null
}

type AttendanceRow = {
  id: string
  child_id: string
  checked_in: boolean
  picked_up: boolean
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function EcdAttendancePage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const [enrolledResult, attendanceResult] = await Promise.all([
    supabase
      .from('applications')
      .select('child_id,parent_id,children(id,first_name,last_name)')
      .eq('ecd_id', ecdId)
      .eq('status', 'enrolled')
      .limit(100),
    supabase
      .from('attendance')
      .select('id,child_id,checked_in,picked_up')
      .eq('ecd_id', ecdId)
      .eq('date', todayDate),
  ])

  const enrolledRows = (enrolledResult.data ?? []) as EnrolledApplicationRow[]
  const attendanceRows = (attendanceResult.data ?? []) as AttendanceRow[]
  const seenChildIds = new Set<string>()

  const enrolledChildren = enrolledRows.flatMap((row) => {
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

  const attendanceByChild: Record<string, { id: string; checked_in: boolean; picked_up: boolean } | null> = {}
  const parentIdByChild: Record<string, string | null> = {}
  for (const child of enrolledChildren) {
    attendanceByChild[child.id] = null
    parentIdByChild[child.id] = null
  }
  for (const row of enrolledRows) {
    const child = normalizeOne(row.children)
    const childId = child?.id ?? row.child_id
    if (!childId) continue
    if (!parentIdByChild[childId] && row.parent_id) {
      parentIdByChild[childId] = row.parent_id
    }
  }
  for (const row of attendanceRows) {
    if (attendanceByChild[row.child_id] === undefined) continue
    attendanceByChild[row.child_id] = {
      id: row.id,
      checked_in: Boolean(row.checked_in),
      picked_up: Boolean(row.picked_up),
    }
  }

  return (
    <EcdOsShell
      title="Attendance"
      description="Mark daily attendance and pickup status."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <AttendanceClient
        enrolledChildren={enrolledChildren}
        attendanceByChild={attendanceByChild}
        parentIdByChild={parentIdByChild}
        ecdId={ecdId}
        todayDate={todayDate}
        staffId={user.id}
      />
    </EcdOsShell>
  )
}



