'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSupabasePublicEnv } from '@/lib/supabase/env'

const schema = z.object({
  ecd_id: z.string().uuid(),
  pickup_address: z.string().min(5),
  notes: z.string().optional(),
  child_id: z.string().uuid().optional(),
})

export async function submitTransportEnquiryAction(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { supabaseUrl, supabaseAnonKey } = requireSupabasePublicEnv('submit-transport-enquiry-action')
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    { cookies: { getAll: () => cookies().getAll() } }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in to request a transport quote' }
  }

  const { data: enquiry, error } = await supabase
    .from('transport_enquiries')
    .insert({
      ecd_id: parsed.data.ecd_id,
      parent_id: user.id,
      child_id: parsed.data.child_id ?? null,
      pickup_address: parsed.data.pickup_address,
      notes: parsed.data.notes ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !enquiry) {
    return { error: 'Failed to submit enquiry. Please try again.' }
  }

  const { data: admins } = await supabase
    .from('ecd_admins')
    .select('user_id')
    .eq('ecd_id', parsed.data.ecd_id)

  const adminIds = Array.from(new Set((admins ?? []).map((row: any) => row.user_id).filter(Boolean)))

  if (adminIds.length) {
    await supabase.from('notifications').insert(
      adminIds.map((adminId) => ({
        user_id: adminId,
        ecd_id: parsed.data.ecd_id,
        type: 'transport_enquiry',
        title: 'New Transport Enquiry',
        body: `Pickup address: ${parsed.data.pickup_address}`,
        data: { enquiry_id: enquiry.id },
      }))
    )

    const participantIds = Array.from(new Set([user.id, ...adminIds]))
    const { data: thread } = await supabase
      .from('message_threads')
      .insert({
        ecd_id: parsed.data.ecd_id,
        context_type: 'general',
        context_id: enquiry.id,
        participant_ids: participantIds,
      })
      .select('id')
      .single()

    if (thread) {
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        body: [
          'Transport Quote Request',
          '',
          `Pickup address: ${parsed.data.pickup_address}`,
          parsed.data.notes ? `Notes: ${parsed.data.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      })
    }
  }

  revalidatePath('/dashboard/communications')
  return { success: true, enquiryId: enquiry.id }
}
