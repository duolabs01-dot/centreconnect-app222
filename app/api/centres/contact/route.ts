'use server'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  centreId: z.string().uuid(),
  message: z.string().min(5, 'Please write at least five characters.'),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data submitted.' }, { status: 400 })
  }

  const { centreId, message } = parsed.data
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please log in to contact this centre.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: admins, error: adminsError } = await admin
    .from('ecd_admins')
    .select('user_id')
    .eq('ecd_id', centreId)

  if (adminsError) {
    return NextResponse.json({ error: 'Unable to locate centre staff right now.' }, { status: 500 })
  }

  const adminIds = (admins ?? []).map((row) => row.user_id).filter(Boolean)
  const participantIds = Array.from(new Set([user.id, ...adminIds]))

  const { data: existingThread } = await admin
    .from('message_threads')
    .select('id,participant_ids')
    .eq('ecd_id', centreId)
    .eq('context_type', 'general')
    .contains('participant_ids', [user.id])
    .maybeSingle()

  let threadId = existingThread?.id
  if (!threadId) {
    const { data: createdThread, error: threadError } = await admin
      .from('message_threads')
      .insert({
        ecd_id: centreId,
        context_type: 'general',
        participant_ids: participantIds,
      })
      .select('id')
      .single()

    if (threadError || !createdThread) {
      return NextResponse.json({ error: 'Failed to open the conversation.' }, { status: 500 })
    }

    threadId = createdThread.id
  }

  const { error: messageError } = await admin.from('messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    body: message.trim(),
  })

  if (messageError) {
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
