'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type CentreContactCardProps = {
  centreId: string
  centreName: string
}

export function CentreContactCard({ centreId, centreName }: CentreContactCardProps) {
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

        toast.success('Message sent! The centre will reply shortly.')
        setMessage('')
      } catch (error) {
        console.error(error)
        toast.error('Something went wrong. Please try again in a moment.')
      }
    })
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/95 p-5 shadow-[var(--shadow-elevation-3)]">
      <p className="text-sm font-semibold text-slate-900">Message {centreName}</p>
      <p className="mt-1 text-xs text-slate-500">
        Ask about availability, tours, or any general questions — we will route your note straight to the centre inbox.
      </p>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="centre-contact-message">Your message</Label>
          <Textarea
            id="centre-contact-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hi, I'd like to learn more about your programmes…"
            rows={4}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </form>
    </div>
  )
}


