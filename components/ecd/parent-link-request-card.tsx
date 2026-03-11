'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, RefreshCcw, UserRoundCheck } from 'lucide-react'
import { toast } from 'sonner'
import { sendParentLinkForExistingChildAction } from '@/app/ecd/(portal)/children/new/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ParentLinkRequestSummary } from '@/lib/ecd/parent-link-requests'

type ParentLinkRequestCardProps = {
  childId: string
  parentId: string | null
  defaultParentName: string
  defaultParentPhone: string
  defaultParentEmail: string
  request: ParentLinkRequestSummary | null
}

function badgeLabel(request: ParentLinkRequestSummary | null) {
  if (!request) return 'Ready to send'
  if (request.status === 'opened') return 'Email opened'
  if (request.status === 'accepted') return 'Accepted'
  if (request.status === 'expired' || request.status === 'cancelled') return 'Needs resend'
  return 'Email sent'
}

function badgeClassName(request: ParentLinkRequestSummary | null) {
  if (!request) return 'border-slate-200 bg-slate-50 text-slate-700'
  if (request.status === 'opened') return 'border-cyan-200 bg-cyan-50 text-cyan-800'
  if (request.status === 'accepted') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (request.status === 'expired' || request.status === 'cancelled') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-teal-200 bg-teal-50 text-teal-800'
}

export function ParentLinkRequestCard({
  childId,
  parentId,
  defaultParentName,
  defaultParentPhone,
  defaultParentEmail,
  request,
}: ParentLinkRequestCardProps) {
  const router = useRouter()
  const [parentName, setParentName] = useState(defaultParentName)
  const [parentPhone, setParentPhone] = useState(defaultParentPhone)
  const [parentEmail, setParentEmail] = useState(defaultParentEmail)
  const [isPending, startTransition] = useTransition()

  function sendRequest() {
    if (parentId) return
    if (!parentEmail.trim()) {
      toast.error('Add the parent email before sending the family link.')
      return
    }

    startTransition(async () => {
      const result = await sendParentLinkForExistingChildAction({
        child_id: childId,
        parent_name: parentName.trim() || null,
        parent_phone: parentPhone.trim() || null,
        parent_email: parentEmail.trim(),
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message, {
        description: result.whatsappHref
          ? 'Email is the official path. A WhatsApp reminder is also ready if you want it.'
          : undefined,
      })
      router.refresh()
    })
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <Mail className="h-4 w-4 text-teal-600" />
            Main parent link
          </CardTitle>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeClassName(request)}`}>
            {parentId ? 'Parent linked' : badgeLabel(request)}
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {parentId
            ? 'This child is already linked to a live parent profile.'
            : 'Send the official family email from here. Once the parent accepts it, this child record and the ECD family dossier will stay in sync.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="detail-parent-name">Parent name</Label>
            <Input id="detail-parent-name" value={parentName} onChange={(event) => setParentName(event.target.value)} className="h-11 rounded-2xl border-slate-200" placeholder="Optional" disabled={Boolean(parentId)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="detail-parent-email">Parent email</Label>
            <Input id="detail-parent-email" type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} className="h-11 rounded-2xl border-slate-200" placeholder="name@example.com" disabled={Boolean(parentId)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="detail-parent-phone">Parent phone (optional)</Label>
            <Input id="detail-parent-phone" value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} className="h-11 rounded-2xl border-slate-200" placeholder="071 234 5678" disabled={Boolean(parentId)} />
          </div>
        </div>

        {request ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p><span className="font-semibold text-slate-900">Sent:</span> {request.sentAt ?? request.requestedAt}</p>
            {request.openedAt ? <p className="mt-1"><span className="font-semibold text-slate-900">Opened:</span> {request.openedAt}</p> : null}
            {request.acceptedAt ? <p className="mt-1"><span className="font-semibold text-slate-900">Accepted:</span> {request.acceptedAt}</p> : null}
          </div>
        ) : null}

        {parentId ? (
          <Button type="button" variant="outline" className="h-10 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" disabled>
            <UserRoundCheck className="mr-2 h-4 w-4" />
            Parent linked
          </Button>
        ) : (
          <Button type="button" className="h-11 rounded-2xl bg-teal-600 text-white hover:bg-teal-700" disabled={isPending} onClick={sendRequest}>
            {request ? <RefreshCcw className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}
            {isPending ? 'Sending...' : request ? 'Resend family email' : 'Send family email'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
