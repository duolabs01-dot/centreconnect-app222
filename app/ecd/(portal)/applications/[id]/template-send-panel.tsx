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

type TemplateSendPanelProps = {
  ecdId: string
  parentId: string
  applicationId: string
  centreName: string
  childName: string
  parentName: string
  applicationNumber: string
  status: string
  parentPhone: string | null
  templates: Template[]
}

function toWhatsappHref(phone: string | null, message: string) {
  if (!message.trim()) return null
  const digits = (phone ?? '').replace(/[^\d]/g, '')
  if (!digits) return `https://wa.me/?text=${encodeURIComponent(message)}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function TemplateSendPanel({
  ecdId,
  parentId,
  applicationId,
  centreName,
  childName,
  parentName,
  applicationNumber,
  status,
  parentPhone,
  templates,
}: TemplateSendPanelProps) {
  const supabase = createClient()
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
  const whatsappHref = toWhatsappHref(parentPhone, finalMessage)
  const threadHref = parentId
    ? `/ecd/communications?recipient=${encodeURIComponent(parentId)}&contextType=application&contextId=${encodeURIComponent(applicationId)}`
    : null

  async function copyMessage() {
    if (!finalMessage) return
    await navigator.clipboard.writeText(finalMessage)
    toast.success('Message copied')
  }

  async function sendInAppNotification() {
    if (!parentId) {
      toast.error('Parent record is missing for this application')
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
        message: finalMessage,
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
        body: finalMessage,
      })
      if (messageError) throw messageError

      toast.success('Notification sent and message thread updated')
      if (!selectedTemplate) setCustomMessage('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-slate-700">Template</label>
        <select
          value={selectedKey}
          onChange={(event) => setSelectedKey(event.target.value)}
          className="cc-native-field mt-1 h-11"
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
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Message</label>
        <textarea
          value={customMessage || resolvedBody}
          onChange={(event) => setCustomMessage(event.target.value)}
          className="cc-native-field mt-1 min-h-[132px] h-auto py-2"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" className="h-11" onClick={sendInAppNotification} disabled={sending}>
          {sending ? 'Sending...' : 'Send to Parent Inbox'}
        </Button>
        {threadHref ? (
          <Button type="button" className="h-11" variant="outline" asChild>
            <Link href={threadHref}>Open Thread</Link>
          </Button>
        ) : (
          <Button type="button" className="h-11" variant="outline" disabled>
            Open Thread
          </Button>
        )}
        <Button type="button" className="h-11" variant="outline" onClick={copyMessage}>
          Copy Message
        </Button>
        <Button type="button" className="h-11" variant="outline" asChild>
          <a
            href={whatsappHref ?? '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!whatsappHref) {
                event.preventDefault()
                toast('Add a parent phone number to open WhatsApp')
              }
            }}
          >
            Open WhatsApp Link
          </a>
        </Button>
      </div>
    </div>
  )
}
