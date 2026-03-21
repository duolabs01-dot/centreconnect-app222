export type EcdPortalStaffRole = 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'

type SupabaseLike = {
  from: (table: string) => any
}

type PortalMemberLike = {
  userId: string
  role: EcdPortalStaffRole
  fullName: string | null
}

type DsdStaffLike = {
  id: string
  firstName: string
  surname: string
  idNumber: string | null
  role: string
  gender: string | null
  race: string | null
  isDisabled: boolean
  disabilityDescription: string | null
  isTrained: boolean
  trainingDescription: string | null
  isComputerLiterate: boolean
  isSubsidized: boolean
  monthlySalary: number | null
}

function collapseWhitespace(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function hasStructuredStaffName(value: string | null | undefined) {
  return collapseWhitespace(value).split(' ').filter(Boolean).length >= 2
}

export function splitStaffName(fullName: string | null | undefined) {
  const normalized = collapseWhitespace(fullName)
  if (!normalized) {
    return { firstName: 'Team', surname: 'Member' }
  }

  const parts = normalized.split(' ')
  if (parts.length === 1) {
    return { firstName: parts[0], surname: 'Staff' }
  }

  return {
    firstName: parts[0],
    surname: parts.slice(1).join(' '),
  }
}

export function buildStaffNameKey(input: { fullName?: string | null; firstName?: string | null; surname?: string | null }) {
  const value = input.fullName ?? [input.firstName, input.surname].filter(Boolean).join(' ')
  return collapseWhitespace(value).toLowerCase()
}

export function formatPortalRoleLabel(role: EcdPortalStaffRole) {
  if (role === 'ecd_admin') return 'ECD Admin'
  if (role === 'ecd_supervisor') return 'Supervisor'
  return 'Staff Member'
}

export function mapPortalRoleToStaffDesignation(role: EcdPortalStaffRole) {
  if (role === 'ecd_admin') return 'Centre manager'
  if (role === 'ecd_supervisor') return 'Supervisor'
  return 'Practitioner'
}

export async function syncPortalMemberToStaffRecord(input: {
  db: SupabaseLike
  ecdId: string
  fullName: string | null | undefined
  role: EcdPortalStaffRole
}) {
  const normalizedName = collapseWhitespace(input.fullName)
  if (!normalizedName) {
    return { ok: false as const, error: 'Missing full name for staff sync.' }
  }
  if (!hasStructuredStaffName(normalizedName)) {
    return { ok: false as const, error: 'Full name must include first name and surname for staff sync.' }
  }

  const { firstName, surname } = splitStaffName(normalizedName)
  const matchKey = buildStaffNameKey({ firstName, surname })
  const desiredRole = mapPortalRoleToStaffDesignation(input.role)

  const query = input.db
    .from('ecd_staff')
    .select('id,first_name,surname,role')
    .eq('ecd_id', input.ecdId)

  const rowsResult = typeof query.limit === 'function' ? await query.limit(200) : await query
  const rows = ((rowsResult.data ?? []) as Array<{ id: string; first_name: string | null; surname: string | null; role: string | null }>)

  const existing = rows.find((row) => buildStaffNameKey({ firstName: row.first_name, surname: row.surname }) === matchKey) ?? null

  if (existing) {
    const { error } = await input.db
      .from('ecd_staff')
      .update({
        first_name: firstName,
        surname,
        role: desiredRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('ecd_id', input.ecdId)

    return error ? { ok: false as const, error: error.message } : { ok: true as const, recordId: existing.id }
  }

  const { error } = await input.db.from('ecd_staff').insert({
    ecd_id: input.ecdId,
    first_name: firstName,
    surname,
    role: desiredRole,
    is_trained: false,
    is_computer_literate: false,
  })

  return error ? { ok: false as const, error: error.message } : { ok: true as const, recordId: null }
}

export function mergePortalStaffIntoDsdStaff(input: {
  staff: DsdStaffLike[]
  portalMembers: PortalMemberLike[]
}) {
  const merged = [...input.staff]
  const seen = new Set(
    merged.map((member) => buildStaffNameKey({ firstName: member.firstName, surname: member.surname })).filter(Boolean)
  )

  for (const member of input.portalMembers) {
    const normalizedName = collapseWhitespace(member.fullName)
    if (!normalizedName || !hasStructuredStaffName(normalizedName)) continue

    const { firstName, surname } = splitStaffName(normalizedName)
    const key = buildStaffNameKey({ firstName, surname })
    if (!key || seen.has(key)) continue

    merged.push({
      id: `portal-${member.userId}`,
      firstName,
      surname,
      idNumber: null,
      role: mapPortalRoleToStaffDesignation(member.role),
      gender: null,
      race: null,
      isDisabled: false,
      disabilityDescription: null,
      isTrained: false,
      trainingDescription: null,
      isComputerLiterate: false,
      isSubsidized: false,
      monthlySalary: null,
    })
    seen.add(key)
  }

  return merged.sort((left, right) => {
    const leftKey = `${collapseWhitespace(left.surname)} ${collapseWhitespace(left.firstName)}`.trim()
    const rightKey = `${collapseWhitespace(right.surname)} ${collapseWhitespace(right.firstName)}`.trim()
    return leftKey.localeCompare(rightKey)
  })
}


