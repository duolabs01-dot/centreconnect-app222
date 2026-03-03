'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { renderTemplate } from '@/lib/communications/templates'

type Template = {
  template_key: string
  title: string
  body: string
}

type ComposerProps = {
  ecdId: string
  centreName: string
  templates: Template[]
  recipients: Array<{ parentId: string; label: string }>
  initialRecipientParentId?: string | null
  initialContextType?: 'application' | 'pickup' | 'general'
  initialContextId?: string | null
  initialTemplateKey?: string | null
  initialAudience?: 'all' | 'pending'
  initialMode?: 'broadcast' | 'direct'
}

export function CommunicationsComposer({
  ecdId,
  centreName,
  templates,
  recipients,
  initialRecipientParentId = null,
  initialContextType = 'general',
  initialContextId = null,
  initialTemplateKey = null,
  initialAudience = 'all',
  initialMode = 'broadcast',
}: ComposerProps) {
  const supabase = createClient()
  const [selectedKey, setSelectedKey] = useState(
    initialTemplateKey && templates.some((template) => template.template_key === initialTemplateKey)
      ? initialTemplateKey
      : templates[0]?.template_key ?? ''
  )
  const [customMessage, setCustomMessage] = useState('')
  const [audience, setAudience] = useState<'all' | 'pending'>(initialAudience)
  const [mode, setMode] = useState<'broadcast' | 'direct'>(initialMode)
  const [recipientParentId, setRecipientParentId] = useState(
    initialRecipientParentId && recipients.some((recipient) => recipient.parentId === initialRecipientParentId)
      ? initialRecipientParentId
      : recipients[0]?.parentId ?? ''
  )
  const [sending, setSending] = useState(false)
  const [quickTip, setQuickTip] = useState('Tip: Use templates first, then edit only final details.')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_key === selectedKey) ?? null,
    [templates, selectedKey]
  )

  const resolvedBody = selectedTemplate ? renderTemplate(selectedTemplate.body, { centreName }) : customMessage.trim()
  const finalMessage = customMessage.trim() || resolvedBody
  const professionalMessage = finalMessage.includes(centreName)
    ? finalMessage
    : `${finalMessage}\n\nKind regards,\n${centreName} Team`
  useEffect(() => {
    const tips = [
      'Tip: Use Broadcast for crèche-wide updates.',
      'Tip: Use Direct for one parent conversation.',
      'Tip: Keep the first sentence clear and action-focused.',
      'Tip: Templates save time; edit only final details.',
    ]
    try {
      const idx = Number.parseInt(window.localStorage.getItem('ecd_comms_tip_idx') ?? '-1', 10)
      const next = Number.isFinite(idx) ? (idx + 1) % tips.length : 0
      window.localStorage.setItem('ecd_comms_tip_idx', String(next))
      setQuickTip(tips[next])
    } catch {
      setQuickTip(tips[0])
    }
  }, [])

  async function copyMessage() {
    if (!finalMessage) return
    await navigator.clipboard.writeText(finalMessage)
    toast.success('Message copied')
  }

  function openWhatsAppStub() {
    if (!finalMessage) return
    const href = `https://wa.me/?text=${encodeURIComponent(finalMessage)}`
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function sendInApp() {
    if (!selectedTemplate && !customMessage.trim()) {
      toast.error('Select a template or write a message')
      return
    }

    setSending(true)
    try {
      let appsQuery = supabase.from('applications').select('parent_id,status').eq('ecd_id', ecdId)

      if (audience === 'pending') {
        appsQuery = appsQuery.in('status', ['draft', 'partial', 'submitted', 'in_review', 'waitlisted'])
      }

      const { data: applications, error: appsError } = await appsQuery
      if (appsError) throw appsError

      const parentIds = Array.from(new Set((applications ?? []).map((row) => row.parent_id).filter(Boolean)))
      if (parentIds.length === 0) {
        toast('No matching parents. Were you trying one parent only? Switch to Direct.')
        return
      }

      const payload = parentIds.map((parentId) => ({
        parent_id: parentId,
        ecd_id: ecdId,
        template_key: selectedTemplate?.template_key ?? null,
        title: `${centreName}: ${selectedTemplate?.title ?? 'Crèche update'}`,
        message: professionalMessage,
      }))

      const { error: insertError } = await supabase.from('parent_notifications').insert(payload)
      if (insertError) throw insertError

      toast.success(`Broadcast sent to ${parentIds.length} parents`)
      if (!selectedTemplate) setCustomMessage('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  async function sendThreadMessage() {
    if (!recipientParentId) {
      toast.error('Choose a parent recipient. For everyone, switch to Broadcast.')
      return
    }
    if (!finalMessage) {
      toast.error('Message cannot be empty')
      return
    }

    setSending(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const notificationTitle = `Message from ${centreName}`
      const { error: notificationError } = await supabase.from('parent_notifications').insert({
        parent_id: recipientParentId,
        ecd_id: ecdId,
        application_id: initialContextType === 'application' ? initialContextId : null,
        template_key: 'parent_message',
        title: notificationTitle,
        message: professionalMessage,
      })
      if (notificationError) throw notificationError

      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('ecd_id', ecdId)
        .eq('context_type', initialContextType)
        .eq('context_id', initialContextId)
        .contains('participant_ids', [user.id, recipientParentId])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let threadId = existingThread?.id ?? null

      if (!threadId) {
        const { data: thread, error: threadError } = await supabase
          .from('message_threads')
          .insert({
            ecd_id: ecdId,
            context_type: initialContextType,
            context_id: initialContextId,
            participant_ids: [user.id, recipientParentId],
          })
          .select('id')
          .single()

        if (threadError || !thread) throw threadError ?? new Error('Failed to create thread')
        threadId = thread.id
      }

      const { error: messageError } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        body: professionalMessage,
      })
      if (messageError) throw messageError

      toast.success(existingThread ? 'Direct message sent and mirrored to inbox' : 'Conversation started and mirrored to inbox')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 text-foreground">
      <div className="rounded-xl border border-border bg-card/80 p-3 text-xs font-medium text-muted-foreground">
        {quickTip}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={mode === 'broadcast' ? 'default' : 'outline'} onClick={() => setMode('broadcast')}>
          Broadcast
        </Button>
        <Button type="button" size="sm" variant={mode === 'direct' ? 'default' : 'outline'} onClick={() => setMode('direct')}>
          Direct
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">Template</label>
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="cc-native-field mt-1"
            disabled={templates.length === 0}
          >
            {templates.length === 0 ? (
              <option value="">No templates available</option>
            ) : (
              templates.map((template) => (
                <option key={template.template_key} value={template.template_key}>
                  {labelWithEmoji(template)}
                </option>
              ))
            )}
          </select>
          <p className="mt-1 text-xs text-slate-400">Use templates first for faster, clearer communication.</p>
        </div>

        {mode === 'broadcast' ? (
          <div>
            <label className="text-sm font-medium text-foreground">Audience</label>
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value as 'all' | 'pending')}
              className="cc-native-field mt-1"
            >
              <option value="all">All parents with applications</option>
              <option value="pending">Pending applications only</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">Broadcast sends in-app notifications in bulk.</p>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-foreground">Direct recipient</label>
            <select
              value={recipientParentId}
              onChange={(event) => setRecipientParentId(event.target.value)}
              className="cc-native-field mt-1"
              disabled={recipients.length === 0}
            >
              {recipients.length === 0 ? (
                <option value="">No parent recipients available</option>
              ) : (
                recipients.map((recipient) => (
                  <option key={recipient.parentId} value={recipient.parentId}>
                    {recipient.label}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-slate-400">Direct creates or continues one private thread.</p>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Message preview</label>
        <textarea
          value={customMessage || resolvedBody}
          onChange={(event) => setCustomMessage(event.target.value)}
          className="cc-native-field mt-1 h-auto min-h-[120px] py-2"
        />
        <p className="mt-1 text-xs text-slate-400">Edit if needed before sending.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === 'broadcast' ? (
          <Button type="button" onClick={sendInApp} disabled={sending}>
            {sending ? 'Sending...' : 'Broadcast to Parents'}
          </Button>
        ) : (
          <Button type="button" onClick={sendThreadMessage} disabled={sending || recipients.length === 0}>
            {sending ? 'Sending...' : 'Send Direct Message'}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={copyMessage}>
          Copy
        </Button>
        <Button type="button" variant="outline" onClick={openWhatsAppStub}>
          WhatsApp Preview
        </Button>
      </div>
    </div>
  )
}

function labelWithEmoji(template: Template) {
  if (template.template_key === 'missing_documents') return `[Docs] ${template.title}`
  if (template.template_key === 'open_day_invite') return `[Invite] ${template.title}`
  if (template.template_key === 'application_update') return `[Update] ${template.title}`
  if (template.template_key === 'spot_available') return `[Spot] ${template.title}`
  if (template.template_key.endsWith('_reminder')) return `[Reminder] ${template.title}`
  if (template.template_key.endsWith('_notice')) return `[Notice] ${template.title}`
  if (template.template_key.endsWith('_invite')) return `[Invite] ${template.title}`
  if (template.template_key.includes('welcome')) return `[Welcome] ${template.title}`
  if (template.template_key.includes('report_card')) return `[Report] ${template.title}`
  return `[Message] ${template.title}`
}


