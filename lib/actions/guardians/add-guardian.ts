'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  child_ids: z.array(z.string().uuid()).min(1),
  full_name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().nullable(),
  relationship: z.string().min(2),
  import_source: z.enum(['manual', 'device_contacts', 'whatsapp']),
  can_pickup: z.boolean(),
  can_view_applications: z.boolean(),
  can_receive_announcements: z.boolean(),
  can_generate_pickup_code: z.boolean(),
})

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, '')
  return digits.trim()
}

export async function addGuardianAction(input: unknown) {
  const parsed = schema.safeParse(
    (() => {
      const raw = (input ?? {}) as Record<string, unknown>
      const childIds = Array.isArray(raw.child_ids)
        ? raw.child_ids
        : typeof raw.child_id === 'string'
          ? [raw.child_id]
          : []
      return {
        ...raw,
        child_ids: childIds,
      }
    })()
  )
  if (!parsed.success) return { error: 'Invalid data' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const childIds = Array.from(new Set(parsed.data.child_ids))

  const { data: children } = await supabase
    .from('children')
    .select('id')
    .in('id', childIds)
    .eq('parent_id', user.id)
    .limit(childIds.length)

  if (!children || children.length !== childIds.length) {
    return { error: 'One or more selected children could not be found.' }
  }

  const phone = normalizePhone(parsed.data.phone)

  const { data: existing } = await supabase
    .from('guardians')
    .select('id,child_id')
    .in('child_id', childIds)
    .eq('phone', phone)

  const existingByChild = new Set((existing ?? []).map((row: any) => row.child_id))
  const newChildIds = childIds.filter((id) => !existingByChild.has(id))

  if (newChildIds.length === 0) {
    return { error: 'This co-parent is already linked to the selected children.' }
  }

  const rows = newChildIds.map((childId) => ({
    parent_id: user.id,
    child_id: childId,
    full_name: parsed.data.full_name.trim(),
    relationship: parsed.data.relationship.trim(),
    phone,
    email: parsed.data.email?.trim() || null,
    import_source: parsed.data.import_source,
    can_pickup: parsed.data.can_pickup,
    can_view_applications: parsed.data.can_view_applications,
    can_receive_announcements: parsed.data.can_receive_announcements,
    can_generate_pickup_code: parsed.data.can_generate_pickup_code,
    created_at: new Date().toISOString(),
  }))

  const { data: insertedRows, error } = await supabase
    .from('guardians')
    .insert(rows)
    .select('id,child_id')

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    createdCount: insertedRows?.length ?? rows.length,
    guardians: insertedRows ?? [],
  }
}
