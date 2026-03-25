import type { SupabaseClient } from '@supabase/supabase-js'

export type MergedAttendanceRow = {
  child_id: string
  date: string
  status: string
}

/**
 * Fetch attendance from both the new `attendance_records` table and the legacy
 * `attendance` table, merging them so the new system wins on conflict.
 *
 * The attendance page previously only read `attendance_records`, which caused
 * February data (stored in the legacy `attendance` table before the new system
 * was deployed) to appear in DOE export but not in the attendance grid.
 */
export async function fetchMergedAttendance(args: {
  supabase: Pick<SupabaseClient, 'from'>
  ecdId: string
  startDate: string
  endDate: string
}): Promise<MergedAttendanceRow[]> {
  const { supabase, ecdId, startDate, endDate } = args

  const [{ data: newRows }, { data: legacyRows }] = await Promise.all([
    // New system: keyed by centre_id, uses status strings
    (supabase as SupabaseClient)
      .from('attendance_records')
      .select('child_id,date,status')
      .eq('centre_id', ecdId)
      .gte('date', startDate)
      .lte('date', endDate),
    // Legacy system: keyed by ecd_id, uses boolean checked_in
    (supabase as SupabaseClient)
      .from('attendance')
      .select('child_id,date,checked_in')
      .eq('ecd_id', ecdId)
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  // New system wins on conflict — build a set of child_id::date keys
  const newSystemKeys = new Set(
    ((newRows ?? []) as Array<{ child_id: string; date: string }>).map(
      (r) => `${r.child_id}::${r.date}`
    )
  )

  // Map legacy rows, excluding any that already exist in the new system
  const legacyMapped = ((legacyRows ?? []) as Array<{ child_id: string; date: string; checked_in: boolean }>)
    .filter((r) => !newSystemKeys.has(`${r.child_id}::${r.date}`))
    .map((r) => ({
      child_id: r.child_id,
      date: r.date,
      status: r.checked_in ? 'present' : 'absent',
    }))

  return [...(newRows ?? []), ...legacyMapped]
}
