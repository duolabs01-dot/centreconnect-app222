'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { sendIncompleteApplicationReminderAction } from './reminder-actions'

type SendReminderButtonProps = {
  applicationId: string
}

export function SendReminderButton({ applicationId }: SendReminderButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await sendIncompleteApplicationReminderAction({ applicationId })
      if (!result.ok) {
        toast.error(result.error || 'Failed to send reminder.')
        return
      }

      toast.success(result.message || 'Reminder sent.')

      const outboundHref = result.whatsappHref ?? result.smsHref ?? null
      if (outboundHref) {
        window.open(outboundHref, '_blank', 'noopener,noreferrer')
      }
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      className="h-10 rounded-2xl bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? 'Sending...' : 'Send Reminder'}
    </Button>
  )
}

