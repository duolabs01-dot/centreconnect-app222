'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MailPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SendOwnerInviteButtonProps = {
  centreId: string
  centreName: string
  ownerEmail: string | null
  ownerPhone: string | null
}

type InviteSendResponse = {
  ok: boolean
  email?: { sent: boolean; error?: string | null }
  whatsapp?: { sent: boolean; link?: string | null; error?: string | null }
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
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const copyLinkToClipboard = async () => {
    if (!whatsappLink) return
    try {
      await navigator.clipboard.writeText(whatsappLink)
      toast.success('WhatsApp link copied to clipboard.')
    } catch (error) {
      toast.error('Unable to copy link. Please copy manually.')
    }
  }

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
        ? 'WhatsApp link ready'
        : `WhatsApp link not ready: ${payload.whatsapp?.error ?? 'Unknown error'}`

      toast.success(`${centreName}: ${emailState}. ${whatsappState}.`)
      if (payload.whatsapp?.link) {
        setWhatsappLink(payload.whatsapp.link)
        setDialogOpen(true)
      }
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
        <Button
          onClick={() => startTransition(() => void handleSendInvite())}
          loading={busy}
          loadingText="Sending Invite..."
          disabled={!ownerEmail?.trim()}
          className="bg-cyan-500 text-black hover:bg-cyan-400"
        >
          <MailPlus className="h-4 w-4" />
          Send Invite
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
        >
          <Link href="/admin/invites">View Invite Tracking</Link>
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">
        Owner email: {ownerEmail || 'Missing'} | Owner phone: {ownerPhone || 'Missing'}
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp link ready</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            A WhatsApp link was prepared for {centreName}. Open it when you are ready so the owner can respond.
          </DialogDescription>
          {whatsappLink && (
            <div className="mt-4 flex flex-col gap-3">
              <Button
                asChild
                className="w-full justify-center bg-cyan-500 text-black hover:bg-cyan-400"
              >
                <a href={whatsappLink} rel="noreferrer" className="w-full text-center">
                  Open WhatsApp link
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-center" onClick={copyLinkToClipboard}>
                Copy link for later
              </Button>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="ghost" className="w-full" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
