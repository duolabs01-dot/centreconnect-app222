export type CentreClassroomDraft = {
  id?: string | null
  name: string
  ageGroup: string
  practitionerName: string
}

export type CentreAftercareConfig = {
  available: boolean
  endTime: string | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readTenantAdminOverrides(settings: unknown) {
  if (!isPlainObject(settings)) return {}
  const overrides = settings.tenant_admin_overrides
  return isPlainObject(overrides) ? overrides : {}
}

export function readAftercareConfig(settings: unknown): CentreAftercareConfig {
  const overrides = readTenantAdminOverrides(settings)
  const aftercare = overrides.aftercare
  if (!isPlainObject(aftercare)) {
    return { available: false, endTime: null }
  }

  const available = aftercare.available === true
  const endTime = typeof aftercare.end_time === 'string' && /^\d{2}:\d{2}$/.test(aftercare.end_time)
    ? aftercare.end_time
    : null

  return { available, endTime }
}

export function sanitizeClassroomDrafts(input: unknown, limit = 6): CentreClassroomDraft[] {
  if (!Array.isArray(input)) return []

  const classrooms = input
    .map((item): CentreClassroomDraft | null => {
      if (!isPlainObject(item)) return null
      const name = typeof item.name === 'string' ? item.name.trim() : ''
      const ageGroup = typeof item.ageGroup === 'string' ? item.ageGroup.trim() : ''
      const practitionerName = typeof item.practitionerName === 'string' ? item.practitionerName.trim() : ''
      const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id.trim() : null
      if (!name) return null
      return { id, name, ageGroup, practitionerName }
    })
    .filter((item): item is CentreClassroomDraft => item !== null)

  return classrooms.slice(0, limit)
}
