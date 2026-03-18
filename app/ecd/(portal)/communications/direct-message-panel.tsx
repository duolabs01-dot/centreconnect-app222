'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

type DirectMessagePanelProps = {
  ecdId: string
  centreName: string
  centreParticipantIds: string[]
  recipientParentId: string
  recipientLabel: string
  contextType: 'application' | 'pickup' | 'general'
  contextId: string | null
  threadId: string | null
  messages: Array<{
    id: string
    body: string
    createdAt: string
    sender: 'parent' | 'centre'
    senderLabel: string
  }>
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DirectMessagePanel({
  ecdId,
  centreName,
  centreParticipantIds,
  recipientParentId,
  recipientLabel,
  contextType,
  contextId,
  threadId,
  messages,
}: DirectMessagePanelProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!threadId) return

    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [router, supabase, threadId])

  async function sendMessage() {
    const body = draft.trim()
    if (!body) {
      toast.error('Write a message first.')
      return
    }

    setSending(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const professionalMessage = body.includes(centreName)
        ? body
        : `${body}\n\nKind regards,\n${centreName} Team`

      const { error: notificationError } = await supabase.from('parent_notifications').insert({
        parent_id: recipientParentId,
        ecd_id: ecdId,
        application_id: contextType === 'application' ? contextId : null,
        title: `Message from ${centreName}`,
        message: professionalMessage,
      })
      if (notificationError) throw notificationError

      let existingThreadQuery = supabase
        .from('message_threads')
        .select('id')
        .eq('ecd_id', ecdId)
        .eq('context_type', contextType)
        .contains('participant_ids', [user.id, recipientParentId])
        .order('created_at', { ascending: false })
        .limit(1)

      existingThreadQuery = contextId
        ? existingThreadQuery.eq('context_id', contextId)
        : existingThreadQuery.is('context_id', null)

      const { data: existingThread } = await existingThreadQuery.maybeSingle()

      let threadId = existingThread?.id ?? null

      if (!threadId) {
        const participantIds = Array.from(new Set([...centreParticipantIds, recipientParentId])).filter(Boolean)
        const { data: thread, error: threadError } = await supabase
          .from('message_threads')
          .insert({
            ecd_id: ecdId,
            context_type: contextType,
            context_id: contextId,
            participant_ids: participantIds,
          })
          .select('id')
          .single()

        if (threadError || !thread) throw threadError ?? new Error('Failed to start the conversation.')
        threadId = thread.id
      }

      const { error: messageError } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        body: professionalMessage,
      })
      if (messageError) throw messageError

      setDraft('')
      toast.success('Message sent.')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <p className="text-lg font-black text-slate-900">{recipientLabel}</p>
        <p className="mt-1 text-sm text-slate-500">
          Read the parent message here and reply directly. No thread IDs, no extra steps.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 px-4 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
            No messages yet. Send the first message below.
          </div>
        ) : (
          messages.map((message) => {
            const isCentre = message.sender === 'centre'

            return (
              <div key={message.id} className={`flex ${isCentre ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={
                    isCentre
                      ? 'max-w-[85%] rounded-[1.5rem] rounded-br-md bg-teal-600 px-4 py-3 text-white shadow-sm'
                      : 'max-w-[85%] rounded-[1.5rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm'
                  }
                >
                  <p className={`text-xs font-bold ${isCentre ? 'text-teal-50/90' : 'text-slate-500'}`}>
                    {message.senderLabel}
                  </p>
                  <p className={`mt-1 whitespace-pre-wrap text-sm leading-6 ${isCentre ? 'text-white' : 'text-slate-700'}`}>
                    {message.body}
                  </p>
                  <p className={`mt-2 text-[11px] font-medium ${isCentre ? 'text-teal-50/80' : 'text-slate-400'}`}>
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your reply to the parent here..."
            className="min-h-[110px] rounded-2xl border-slate-200"
          />
          <div className="flex items-center justify-end">
            <Button type="button" className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700" onClick={sendMessage} disabled={sending}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Send reply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
