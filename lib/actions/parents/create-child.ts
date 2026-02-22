'use server'

import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const childSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  gender: z.enum(['male', 'female', 'other']).optional(),
})

export type CreateChildInput = z.infer<typeof childSchema>
export { childSchema as createChildSchema }

export async function createChildAction(input: unknown) {
  const parsed = childSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Please provide valid child information.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Please sign in again before adding a child.' }
  }

  const { error, data } = await supabase
    .from('children')
    .insert({
      parent_id: user.id,
      ...parsed.data,
      gender: parsed.data.gender ?? null,
    })
    .select('id,first_name,last_name,date_of_birth,gender')
    .single()

  if (error || !data) {
    return { error: error?.message || 'Failed to add child.' }
  }

  return { success: true, child: data }
}
