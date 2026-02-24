'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ContactCentreSheetProps = {
  centreId: string
  centreName: string
}

export function ContactCentreSheet({ centreId, centreName }: ContactCentreSheetProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const handleSend = () => {
    if (!message.trim()) return
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Sign in to send messages')
        return
      }

      const { error } = await supabase.from('parent_notifications').insert({
        parent_id: user.id,
        ecd_id: centreId,
        title: `Message to ${centreName}`,
        message: message.trim(),
        is_read: false,
      })

      if (error) {
        toast.error('Could not send message. Please try again.')
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
        Message Centre
      </Button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-modal w-full max-w-lg rounded-t-3xl p-6 space-y-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Message {centreName}</h3>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Your message will be sent to the centre. You can view it in your Inbox.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi ${centreName}, I'm interested in enrolling my child...`}
          className="cc-native-field min-h-[120px] w-full rounded-xl p-3 text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={isPending || !message.trim()} className="flex-1">
            {isPending ? 'Sending...' : 'Send Message'}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

