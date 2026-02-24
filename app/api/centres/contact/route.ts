'use server'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  centreId: z.string().uuid(),
  centreName: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1, 'Please write a message.'),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data submitted.' }, { status: 400 })
  }

  const { centreId, centreName, message } = parsed.data
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

  await admin.from('ecd_notifications').insert({
    ecd_id: centreId,
    application_id: null,
    title: 'New parent message',
    message: 'A parent sent a new message in your inbox.',
    metadata: { kind: 'parent_message', thread_id: threadId, parent_id: user.id },
    is_read: false,
  })

  // Mirror the message into the parent inbox feed.
  // If parent profile row is missing, do not block successful send.
  const inboxTitle = centreName?.trim()
    ? `Message to ${centreName.trim()}`
    : 'Message sent to centre'
  await admin.from('parent_notifications').insert({
    parent_id: user.id,
    ecd_id: centreId,
    title: inboxTitle,
    message: message.trim(),
    is_read: false,
    template_key: null,
  })

  return NextResponse.json({ success: true })
}
