import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { ChildrenRosterClient } from './children-roster-client'

export const metadata: Metadata = {
  title: 'Children | CentreConnect',
  description: 'Manage child details, parent links, and attendance from one place.',
}

function getPrimaryGuardian(raw: unknown) {
  if (!Array.isArray(raw)) return { parent_name: '', parent_phone: '', parent_email: '' }

  const match = raw.find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const record = entry as Record<string, unknown>
    return typeof record.phone === 'string' || typeof record.email === 'string' || typeof record.full_name === 'string'
  })

  if (!match || typeof match !== 'object') {
    return { parent_name: '', parent_phone: '', parent_email: '' }
  }

  const record = match as Record<string, unknown>
  return {
    parent_name: typeof record.full_name === 'string' ? record.full_name : '',
    parent_phone: typeof record.phone === 'string' ? record.phone : '',
    parent_email: typeof record.email === 'string' ? record.email : '',
  }
}

type ParentProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

type ParentMetaRow = {
  id: string
  alt_phone: string | null
}

export default async function EcdChildrenRosterPage() {
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()

  const [centreResult, classesResult, childrenResult] = await Promise.all([
    supabase
      .from('ecd_centres')
      .select('name')
      .eq('id', ecdId)
      .maybeSingle(),
    supabase
      .from('ecd_classes')
      .select('id, name, age_group')
      .eq('ecd_id', ecdId)
      .order('name'),
    supabase
      .from('children')
      .select('id, first_name, last_name, date_of_birth, class_id, enrollment_start_date, enrollment_status, parent_id, guardian_contacts, created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false }),
  ])

  const centreName = centreResult.data?.name?.trim() || 'Your Centre'
  const classes = (classesResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name : 'Class',
    ageGroup: typeof row.age_group === 'string' && row.age_group.trim().length > 0 ? row.age_group.trim() : null,
  }))

  const classMap = new Map(classes.map((row) => [row.id, row]))
  const parentIds = Array.from(new Set((childrenResult.data ?? []).map((child) => child.parent_id).filter((value): value is string => Boolean(value))))

  const [profileRows, parentMetaRows] = await Promise.all([
    parentIds.length > 0
      ? supabase.from('user_profiles').select('id,full_name,phone').in('id', parentIds)
      : Promise.resolve({ data: [] as ParentProfileRow[] }),
    parentIds.length > 0
      ? supabase.from('parents').select('id,alt_phone').in('id', parentIds)
      : Promise.resolve({ data: [] as ParentMetaRow[] }),
  ])

  const parentProfileMap = new Map(((profileRows.data ?? []) as ParentProfileRow[]).map((row) => [row.id, row]))
  const parentMetaMap = new Map(((parentMetaRows.data ?? []) as ParentMetaRow[]).map((row) => [row.id, row]))

  const children = (childrenResult.data ?? []).map((child: any) => {
    const guardian = getPrimaryGuardian(child.guardian_contacts)
    const classMeta = child.class_id ? classMap.get(String(child.class_id)) : null
    const parentProfile = child.parent_id ? parentProfileMap.get(String(child.parent_id)) : null
    const parentMeta = child.parent_id ? parentMetaMap.get(String(child.parent_id)) : null

    return {
      id: String(child.id),
      firstName: typeof child.first_name === 'string' ? child.first_name : 'Child',
      lastName: typeof child.last_name === 'string' ? child.last_name : '',
      dateOfBirth: typeof child.date_of_birth === 'string' ? child.date_of_birth : null,
      classId: child.class_id ? String(child.class_id) : null,
      className: classMeta?.name ?? null,
      ageGroup: classMeta?.ageGroup ?? null,
      enrollmentStartDate: typeof child.enrollment_start_date === 'string' ? child.enrollment_start_date : null,
      enrollmentStatus: typeof child.enrollment_status === 'string' ? child.enrollment_status : null,
      parentId: child.parent_id ? String(child.parent_id) : null,
      parentName: parentProfile?.full_name?.trim() || guardian.parent_name,
      parentPhone: parentProfile?.phone?.trim() || parentMeta?.alt_phone?.trim() || guardian.parent_phone,
      parentEmail: guardian.parent_email,
      createdAt: typeof child.created_at === 'string' ? child.created_at : null,
      parentSource: parentProfile ? ('synced' as const) : guardian.parent_name || guardian.parent_phone || guardian.parent_email ? ('snapshot' as const) : ('missing' as const),
      detailHref: `/ecd/children/${String(child.id)}`,
    }
  })

  return (
    <EcdOsShell
      title="Children"
      description="Manage child details, parent links, and attendance from one calm screen."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="mx-auto w-full max-w-7xl space-y-6 px-1 py-2 sm:py-3">
        <ChildrenRosterClient centreName={centreName} classes={classes} initialChildren={children} />
      </section>
    </EcdOsShell>
  )
}
