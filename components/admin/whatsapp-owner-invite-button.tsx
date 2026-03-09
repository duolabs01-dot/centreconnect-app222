'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type OwnerWhatsAppPayload = {
  message: string
  whatsappLink: string | null
  ownerPhone: string | null
  ownerEmail: string
  links: { login: string; welcomePack: string }
  centreName: string
  ownerFirstName: string
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'not sent yet'
  try {
    return new Date(value).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return value
  }
}

type WhatsAppOwnerInviteButtonProps = {
  centreId: string
  centreName: string
  ownerEmail: string | null
  ownerPhone: string | null
  lastInviteAt?: string | null
}

export function WhatsAppOwnerInviteButton({ centreId, centreName, ownerEmail, ownerPhone, lastInviteAt }: WhatsAppOwnerInviteButtonProps) {
  const [, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [payload, setPayload] = useState<OwnerWhatsAppPayload | null>(null)

  const copyMessageToClipboard = async () => {
    if (!payload?.message) return
    try {
      await navigator.clipboard.writeText(payload.message)
      toast.success('WhatsApp message copied.')
    } catch (error) {
      toast.error('Unable to copy message. Please copy manually.')
    }
  }

  const handleShare = async () => {
    if (!ownerEmail?.trim()) {
      toast.error('Owner email is required before copying the WhatsApp message.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${centreId}/owner-whatsapp-message`, {
        method: 'POST',
      })
      const data = (await response.json().catch(() => null)) as OwnerWhatsAppPayload & { error?: string } | null
      if (!response.ok || !data) {
        throw new Error(data?.error || 'Unable to build WhatsApp message right now.')
      }
      setPayload(data)
      setDialogOpen(true)
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to prepare WhatsApp message.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="mt-2 space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/40 p-3 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">WhatsApp owner</p>
        <p>Copies the login/password + welcome pack links you just emailed so you can send them on WhatsApp too.</p>
        <p className="text-[10px] text-slate-500">Login/password email sent: {formatTimestamp(lastInviteAt)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => startTransition(() => void handleShare())}
            loading={isLoading}
            loadingText="Preparing WhatsApp..."
            className="bg-slate-100/10 text-slate-100 hover:bg-slate-900"
          >
            WhatsApp owner
          </Button>
          {!ownerPhone && (
            <p className="text-[10px] text-amber-200">Add an owner phone to open WhatsApp directly.</p>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>WhatsApp message ready</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm text-slate-400">
            Paste this straight into WhatsApp to remind {payload?.ownerFirstName} that the email contains the login and password link, and share the welcome pack too.
          </DialogDescription>
          {payload && (
            <>
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed">{payload.message}</pre>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={copyMessageToClipboard}>Copy message</Button>
                {payload.whatsappLink ? (
                  <Button asChild className="justify-center">
                    <a href={payload.whatsappLink} target="_blank" rel="noreferrer">
                      Open WhatsApp link
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="justify-center">
                    WhatsApp link unavailable
                  </Button>
                )}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-300">
                <p className="font-semibold text-slate-100">Links included in the message</p>
                <ul className="mt-2 space-y-1 text-[11px]">
                  <li>
                    Login & password setup:{' '}
                    <a className="text-cyan-300" href={payload.links.login} target="_blank" rel="noreferrer">
                      {payload.links.login}
                    </a>
                  </li>
                  <li>
                    Welcome pack:{' '}
                    <a className="text-cyan-300" href={payload.links.welcomePack} target="_blank" rel="noreferrer">
                      {payload.links.welcomePack}
                    </a>
                  </li>
                </ul>
                <p className="mt-2 text-[10px] text-slate-500">Email sent to: {payload.ownerEmail}</p>
                {payload.ownerPhone ? (
                  <p className="text-[10px] text-amber-200">WhatsApp number: {payload.ownerPhone}</p>
                ) : (
                  <p className="text-[10px] text-amber-400">Owner phone is missing. Copy the message and paste it into your WhatsApp chat.</p>
                )}
                <p className="mt-1 text-[10px] text-slate-500">Last invite: {formatTimestamp(lastInviteAt)}</p>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
