'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type ContactTemplate = {
  label: string
  message: string
}

type ContactCentreSheetProps = {
  centreId: string
  centreName: string
  templates?: ContactTemplate[]
}

export function ContactCentreSheet({ centreId, centreName, templates = [] }: ContactCentreSheetProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSend = () => {
    if (!message.trim()) return
    startTransition(async () => {
      const response = await fetch('/api/centres/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centreId,
          centreName,
          message: message.trim(),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        toast.error(payload?.error || 'Could not send message. Please try again.')
        return
      }

      toast.success(`Message sent to ${centreName}`)
      setMessage('')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <MessageCircle className="h-4 w-4" />
        Send a quick question
      </Button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
    >
      <Card
        className="glass-modal w-full max-w-lg space-y-4 rounded-t-2xl p-0 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Message {centreName}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-9 w-9 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            Pick a quick parent question below or write your own. Your message will be sent to the centre inbox and saved in CentreConnect.
          </p>
          {templates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => setMessage(template.message)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700"
                >
                  {template.label}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${centreName}, I would like to ask about enrolling my child.`}
            className="cc-native-field min-h-[120px] w-full rounded-2xl p-3 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleSend} disabled={isPending || !message.trim()} className="h-11 flex-1 rounded-2xl">
              {isPending ? 'Sending...' : 'Send question'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-2xl">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
