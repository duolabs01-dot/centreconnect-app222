'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { requireSupabasePublicEnv } from '@/lib/supabase/env'

const schema = z.object({
  child_id: z.string().uuid(),
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

export async function addGuardianAction(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' }

  const { supabaseUrl, supabaseAnonKey } = requireSupabasePublicEnv('add-guardian-action')
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    { cookies: { getAll: () => cookies().getAll() } }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', parsed.data.child_id)
    .eq('parent_id', user.id)
    .single()

  if (!child) return { error: 'Child not found' }

  const { data: existing } = await supabase
    .from('guardians')
    .select('id')
    .eq('child_id', parsed.data.child_id)
    .eq('phone', parsed.data.phone)
    .maybeSingle()

  if (existing) {
    return { error: 'A guardian with this number already exists for this child' }
  }

  const { error } = await supabase.from('guardians').insert({
    parent_id: user.id,
    child_id: parsed.data.child_id,
    full_name: parsed.data.full_name,
    relationship: parsed.data.relationship,
    phone: parsed.data.phone,
    email: parsed.data.email,
    import_source: parsed.data.import_source,
    can_pickup: parsed.data.can_pickup,
    can_view_applications: parsed.data.can_view_applications,
    can_receive_announcements: parsed.data.can_receive_announcements,
    can_generate_pickup_code: parsed.data.can_generate_pickup_code,
    created_at: new Date().toISOString(),
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
