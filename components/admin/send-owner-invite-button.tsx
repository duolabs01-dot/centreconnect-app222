'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MailPlus } from 'lucide-react'
import { Button } from '@/components/cc-admin/Button'

type SendOwnerInviteButtonProps = {
  centreId: string
  centreName: string
  ownerEmail: string | null
  ownerPhone: string | null
}

type InviteSendResponse = {
  ok: boolean
  email?: { sent: boolean; error?: string | null }
  whatsapp?: { sent: boolean; error?: string | null }
  warning?: string
}

export function SendOwnerInviteButton({
  centreId,
  centreName,
  ownerEmail,
  ownerPhone,
}: SendOwnerInviteButtonProps) {
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function handleSendInvite() {
    if (!ownerEmail?.trim()) {
      toast.error('Owner email is required before sending an invite.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${centreId}/send-owner-invite`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => ({}))) as InviteSendResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send owner invite.')
      }

      const emailState = payload.email?.sent ? 'Email sent' : `Email failed: ${payload.email?.error ?? 'Unknown error'}`
      const whatsappState = payload.whatsapp?.sent
        ? 'WhatsApp sent'
        : `WhatsApp not sent: ${payload.whatsapp?.error ?? 'Unknown error'}`

      toast.success(`${centreName}: ${emailState}. ${whatsappState}.`)
      if (payload.warning) toast.warning(payload.warning)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invite.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-400">
        Sends a branded email + WhatsApp invite to the centre owner and tracks status in notification logs.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => startTransition(() => void handleSendInvite())} disabled={busy || !ownerEmail?.trim()}>
          <MailPlus className="h-4 w-4" />
          {busy ? 'Sending Invite...' : 'Send Invite'}
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/invites">View Invite Tracking</Link>
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">
        Owner email: {ownerEmail || 'Missing'} | Owner phone: {ownerPhone || 'Missing'}
      </p>
    </div>
  )
}
