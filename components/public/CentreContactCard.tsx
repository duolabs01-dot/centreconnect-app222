'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ContactTemplate = {
  label: string
  message: string
}

type CentreContactCardProps = {
  centreId: string
  centreName: string
  templates?: ContactTemplate[]
}

export function CentreContactCard({ centreId, centreName, templates = [] }: CentreContactCardProps) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error('Please share a quick message for the centre.')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/centres/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ centreId, message: trimmed }),
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          toast.error(payload.error || 'Unable to send your message right now.')
          return
        }

        toast.success('Message sent! The creche can now reply inside CentreConnect.')
        setMessage('')
      } catch (error) {
        console.error(error)
        toast.error('Something went wrong. Please try again in a moment.')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/95 p-5 shadow-[var(--shadow-elevation-3)]">
      <p className="text-base font-bold text-slate-900">Send a quick question</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Ask about space, visits, fees, or subsidy support and CentreConnect will route your note straight to the centre inbox so the conversation stays organised.
      </p>
      {templates.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
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
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="centre-contact-message">Your message</Label>
          <Textarea
            id="centre-contact-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={`Hi ${centreName}, I would like to ask about enrolling my child.`}
            rows={4}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Sending...' : 'Send quick question'}
          </Button>
        </div>
      </form>
    </div>
  )
}
