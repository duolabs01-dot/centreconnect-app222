import type { SupabaseClient } from '@supabase/supabase-js'

export type SyncStaffRecordOptions = {
  db: SupabaseClient
  ecdId: string
  fullName: string
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
}

export type SyncResult = 
  | { ok: true }
  | { ok: false; error: string }

export async function syncPortalMemberToStaffRecord(
  options: SyncStaffRecordOptions
): Promise<SyncResult> {
  const { db, ecdId, fullName, role } = options

  try {
    // Try to find existing record by name within this centre
    const { data: existing } = await db
      .from('ecd_staff')
      .select('id')
      .eq('ecd_id', ecdId)
      .ilike('first_name', fullName.split(' ')[0] ?? '')
      .ilike('surname', fullName.split(' ').slice(1).join(' ') || '')
      .limit(1)

    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? ''
    const surname = nameParts.slice(1).join(' ')

    if (existing && existing.length > 0) {
      // Update existing record
      const { error } = await db
        .from('ecd_staff')
        .update({
          first_name: firstName,
          surname: surname,
          role: mapRole(role),
        })
        .eq('id', existing[0].id)

      if (error) return { ok: false, error: error.message }
      return { ok: true }
    }

    // Insert new record
    const { error: insertError } = await db.from('ecd_staff').insert({
      ecd_id: ecdId,
      first_name: firstName,
      surname: surname,
      role: mapRole(role),
    })

    if (insertError) return { ok: false, error: insertError.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function mapRole(role: SyncStaffRecordOptions['role']): string {
  switch (role) {
    case 'ecd_admin': return 'Administrator'
    case 'ecd_supervisor': return 'Supervisor'
    case 'ecd_staff': return 'Practitioner'
    default: return 'Practitioner'
  }
}
