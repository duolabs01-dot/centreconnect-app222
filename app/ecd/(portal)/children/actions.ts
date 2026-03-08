'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const updateChildBasicsSchema = z.object({
  child_id: z.string().uuid(),
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(120),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).nullable(),
  class_id: z.string().uuid().optional().or(z.literal('')).nullable(),
})

export type UpdateChildBasicsResult = {
  success: boolean
  message: string
}

async function syncBirthdayEventsForChild(args: {
  supabase: Awaited<ReturnType<typeof requireEcdPortalSession>>['supabase']
  ecdId: string
  childId: string
  firstName: string
  lastName: string
  dateOfBirth?: string | null
}) {
  if (!args.dateOfBirth) return

  const { error } = await args.supabase.rpc('ensure_child_birthday_events', {
    p_ecd_id: args.ecdId,
    p_child_id: args.childId,
    p_first_name: args.firstName,
    p_last_name: args.lastName,
    p_date_of_birth: args.dateOfBirth,
  })

  if (error && !String(error.message ?? '').toLowerCase().includes('ensure_child_birthday_events')) {
    throw new Error(error.message || 'Failed to sync birthday events')
  }
}

export async function updateChildBasicsAction(input: unknown): Promise<UpdateChildBasicsResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) {
    return { success: false, message: 'ECD session not found.' }
  }

  const parsed = updateChildBasicsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Please review the child details before saving.' }
  }

  const payload = parsed.data
  const firstName = payload.first_name.trim()
  const lastName = payload.last_name.trim()

  const { error } = await session.supabase
    .from('children')
    .update({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: payload.date_of_birth?.trim() || null,
      class_id: payload.class_id?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('ecd_id', session.ecdId)
    .eq('id', payload.child_id)

  if (error) {
    return { success: false, message: error.message || 'Failed to update child profile.' }
  }

  try {
    await syncBirthdayEventsForChild({
      supabase: session.supabase,
      ecdId: session.ecdId,
      childId: payload.child_id,
      firstName,
      lastName,
      dateOfBirth: payload.date_of_birth?.trim() || null,
    })
  } catch {
    // Birthday sync should not block editing.
  }

  await session.supabase.from('audit_logs').insert({
    user_id: session.user.id,
    ecd_id: session.ecdId,
    action: 'child_profile_updated',
    resource_type: 'children',
    resource_id: payload.child_id,
    changes: {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: payload.date_of_birth?.trim() || null,
      class_id: payload.class_id?.trim() || null,
    },
  })

  revalidatePath('/ecd/children')
  revalidatePath('/ecd/children/new')
  revalidatePath('/ecd/attendance')
  revalidatePath('/ecd/dashboard')

  return { success: true, message: 'Child details updated.' }
}
