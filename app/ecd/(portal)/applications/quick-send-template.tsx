'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { renderTemplate } from '@/lib/communications/templates'

type Template = {
  template_key: string
  title: string
  body: string
}

type QuickSendTemplateProps = {
  ecdId: string
  parentId: string
  applicationId: string
  applicationNumber: string
  centreName: string
  childName: string
  parentName: string
  status: string
  templates: Template[]
}

export function QuickSendTemplate({
  ecdId,
  parentId,
  applicationId,
  applicationNumber,
  centreName,
  childName,
  parentName,
  status,
  templates,
}: QuickSendTemplateProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState(templates[0]?.template_key ?? '')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_key === selectedKey) ?? null,
    [templates, selectedKey]
  )

  const resolvedBody = selectedTemplate
    ? renderTemplate(selectedTemplate.body, {
        centreName,
        childName,
        parentName,
        applicationNumber,
        status,
      })
    : customMessage.trim()

  const finalMessage = customMessage.trim() || resolvedBody
  const professionalMessage = finalMessage.includes(centreName)
    ? finalMessage
    : `${finalMessage}\n\nKind regards,\n${centreName} Admissions Team`
  const threadHref = parentId
    ? `/ecd/communications?recipient=${encodeURIComponent(parentId)}&contextType=application&contextId=${encodeURIComponent(applicationId)}`
    : null

  async function send() {
    if (!parentId) {
      toast.error('Parent not linked to this application')
      return
    }
    if (!finalMessage.trim()) {
      toast.error('Select a template or enter a message')
      return
    }

    setSending(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { error } = await supabase.from('parent_notifications').insert({
        parent_id: parentId,
        ecd_id: ecdId,
        application_id: applicationId,
        template_key: 'parent_message',
        title: `Message from ${centreName}`,
        message: professionalMessage,
      })
      if (error) throw error

      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('ecd_id', ecdId)
        .eq('context_type', 'application')
        .eq('context_id', applicationId)
        .contains('participant_ids', [user.id, parentId])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let threadId = existingThread?.id ?? null
      if (!threadId) {
        const { data: createdThread, error: threadError } = await supabase
          .from('message_threads')
          .insert({
            ecd_id: ecdId,
            context_type: 'application',
            context_id: applicationId,
            participant_ids: [user.id, parentId],
          })
          .select('id')
          .single()
        if (threadError || !createdThread) throw threadError ?? new Error('Failed to create message thread')
        threadId = createdThread.id
      }

      const { error: messageError } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        body: professionalMessage,
      })
      if (messageError) throw messageError

      toast.success('Sent to inbox and message thread')
      setOpen(false)
      setCustomMessage('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? 'Close Send' : 'Send Template'}
      </Button>
      {open ? (
        <div className="mt-2 w-full rounded-md border border-border bg-card/80 p-3 sm:w-[360px]">
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="cc-native-field"
            disabled={templates.length === 0}
          >
            {templates.length === 0 ? (
              <option value="">No templates available</option>
            ) : (
              templates.map((template) => (
                <option key={template.template_key} value={template.template_key}>
                  {template.title}
                </option>
              ))
            )}
          </select>
          <textarea
            value={customMessage || resolvedBody}
            onChange={(event) => setCustomMessage(event.target.value)}
            className="cc-native-field mt-2 min-h-[96px] h-auto py-2"
          />
          <div className="mt-2 grid gap-2">
            <Button className="h-10 w-full" onClick={send} disabled={sending}>
              {sending ? 'Sending...' : 'Send to Inbox'}
            </Button>
            {threadHref ? (
              <Button className="h-10 w-full" variant="outline" asChild>
                <Link href={threadHref}>Open Thread</Link>
              </Button>
            ) : (
              <Button className="h-10 w-full" variant="outline" disabled>
                Open Thread
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
