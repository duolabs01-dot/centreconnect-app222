'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Bell, Globe, Users } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormShell, FormFooter } from '@/components/ui/form-shell'
import { publishAnnouncementAction } from '@/lib/actions/announcements/publish'

export const QUICK_PUBLISH_TEMPLATES = {
  fees_reminder: {
    label: 'Fees Reminder',
    emoji: '💳',
    title: 'Monthly Fees Reminder - {month}',
    body: `Dear Parents,\n\nThis is a reminder that monthly fees for {month} are due by {due_date}.\n\nPlease contact us if you need support.\n\nThank you,\n{centre_name}`,
    audience: 'all' as const,
    template_type: 'fees_reminder',
  },
  closure: {
    label: 'Centre Closure',
    emoji: '📌',
    title: 'Important: Centre Closed - {date}',
    body: `Dear Parents,\n\nPlease note that {centre_name} will be closed on {date}.\n\nReason: {reason}\nReopen: {reopen_date}\n\nThank you,\n{centre_name}`,
    audience: 'all' as const,
    template_type: 'closure',
  },
  absent_child: {
    label: 'Child Absence',
    emoji: '🧒',
    title: 'Absence Notice - {child_name}',
    body: `Dear {parent_name},\n\nWe noticed {child_name} was absent on {date}. Please reply if there is anything we should know.\n\nWarm regards,\n{centre_name}`,
    audience: 'individual' as const,
    template_type: 'absent_child',
  },
  holiday: {
    label: 'Holiday Notice',
    emoji: '🎉',
    title: '{centre_name} Holiday Schedule',
    body: `Dear Parents,\n\nHoliday schedule:\nFrom: {start_date}\nTo: {end_date}\nReopen: {reopen_date}\n\nThank you,\n{centre_name}`,
    audience: 'all' as const,
    template_type: 'holiday',
  },
  payment_received: {
    label: 'Payment Received',
    emoji: '✅',
    title: 'Payment Confirmation - {month}',
    body: `Dear {parent_name},\n\nWe have received your payment of {amount} for {month}.\n\nThank you,\n{centre_name}`,
    audience: 'individual' as const,
    template_type: 'payment_received',
  },
} as const

export type TemplateKey = keyof typeof QUICK_PUBLISH_TEMPLATES

type QuickPublishDrawerProps = {
  open: boolean
  templateKey: TemplateKey | null
  ecdId: string
  centreName: string
  onClose: () => void
}

function resolveVars(text: string, centreName: string) {
  const now = new Date()
  return text
    .replace(/\{centre_name\}/g, centreName)
    .replace(/\{month\}/g, now.toLocaleString('en-ZA', { month: 'long', year: 'numeric' }))
    .replace(/\{date\}/g, now.toLocaleDateString('en-ZA'))
    .replace(/\{due_date\}/g, 'end of this month')
    .replace(/\{reason\}/g, 'Planned maintenance')
    .replace(/\{reopen_date\}/g, '')
    .replace(/\{start_date\}/g, '')
    .replace(/\{end_date\}/g, '')
    .replace(/\{parent_name\}/g, 'Parent')
    .replace(/\{child_name\}/g, 'your child')
    .replace(/\{amount\}/g, 'R0')
}

export function QuickPublishDrawer({ open, templateKey, ecdId, centreName, onClose }: QuickPublishDrawerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const template = templateKey ? QUICK_PUBLISH_TEMPLATES[templateKey] : null
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all' | 'class' | 'individual'>('all')

  useEffect(() => {
    if (!template) return
    setTitle(resolveVars(template.title, centreName))
    setBody(resolveVars(template.body, centreName))
    setAudience(template.audience === 'individual' ? 'individual' : 'all')
  }, [template, centreName])

  const canSend = useMemo(() => title.trim().length >= 3 && body.trim().length >= 10, [title, body])

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSend || !template) return

    startTransition(async () => {
      const result = await publishAnnouncementAction({
        ecdId,
        title: title.trim(),
        body: body.trim(),
        audience,
        template_type: template.template_type,
        postToPublicPage: true,
        sendNotifications: true,
      })
      if ('error' in result) {
        toast.error(result.error || 'Failed to send announcement')
        return
      }
      toast.success(`Announcement sent to ${result.recipientCount} parent${result.recipientCount === 1 ? '' : 's'}`)
      onClose()
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <FormShell
          title={template?.label ?? 'Quick Announcement'}
          description="Review and edit before sending."
          onClose={onClose}
          className="space-y-6 bg-transparent"
          footer={
            <FormFooter
              onCancel={onClose}
              submitLabel="Send Announcement"
              loading={isPending}
              disabled={!canSend || !template}
              formId="quick-publish-form"
            />
          }
        >
          <div className="glass rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">When you send this</p>
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Bell className="h-4 w-4 text-cyan-400" />
              In-app notifications go to approved/enrolled parents
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Globe className="h-4 w-4 text-emerald-500" />
              Public centre page notice is updated
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Users className="h-4 w-4 text-blue-400" />
              Parents can see it in their notifications feed
            </div>
          </div>

          <form id="quick-publish-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">Subject</label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Announcement subject"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">Audience</label>
              <select
                value={audience}
                onChange={(event) => setAudience(event.target.value as 'all' | 'class' | 'individual')}
                className="cc-native-field bg-slate-800 border-slate-700 text-white"
              >
                <option value="all">All parents</option>
                <option value="class">Class (requires class targeting)</option>
                <option value="individual">Individual (requires recipient targeting)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">Message</label>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                className="resize-none font-mono text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>
          </form>
        </FormShell>
      </SheetContent>
    </Sheet>
  )
}
