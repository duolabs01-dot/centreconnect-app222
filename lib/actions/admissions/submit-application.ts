'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const schema = z.object({
  ecd_id: z.string().uuid(),
  child_id: z.string().uuid(),
  share_multiple_flag: z.boolean().default(false),
  parent_message: z.string().max(1000).optional(),
})

export async function submitApplicationAction(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid application data' }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookies().getAll(),
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in to apply' }
  }

  const { data: child } = await supabase
    .from('children')
    .select('id,parent_id')
    .eq('id', parsed.data.child_id)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!child) {
    return { error: 'Child not found' }
  }

  const { data: duplicate } = await supabase
    .from('applications')
    .select('id,status')
    .eq('parent_id', user.id)
    .eq('child_id', parsed.data.child_id)
    .eq('ecd_id', parsed.data.ecd_id)
    .not('status', 'in', ['withdrawn', 'rejected'])
    .limit(1)
    .maybeSingle()

  if (duplicate?.id) {
    return { error: 'An active application already exists for this child at this centre' }
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      ecd_id: parsed.data.ecd_id,
      parent_id: user.id,
      child_id: parsed.data.child_id,
      status: 'submitted',
      share_multiple_flag: parsed.data.share_multiple_flag,
      parent_message: parsed.data.parent_message ?? null,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    if (error.message?.includes('infinite recursion')) {
      return { error: 'Server configuration error. Please contact support.' }
    }
    return { error: 'Could not submit application. Please try again.' }
  }

  return { success: true, applicationId: data?.id ?? null }
}
