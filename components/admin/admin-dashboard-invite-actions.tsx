'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, CheckCircle2, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/cc-admin/Button'

type EcdNotificationStatus = 'sent' | 'opened' | 'claimed' | 'failed'

type EcdInviteActionProps = {
  audience: 'ecd'
  rowId: string
  centreId: string | null
  status: EcdNotificationStatus
}

type ParentInviteActionProps = {
  audience: 'parent'
  rowId: string
  parentId: string | null
  isRead: boolean
}

type AdminDashboardInviteActionsProps = EcdInviteActionProps | ParentInviteActionProps

async function parseJsonResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; inserted?: number }
}

export function AdminDashboardInviteActions(props: AdminDashboardInviteActionsProps) {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const runAction = async (key: string, task: () => Promise<void>) => {
    if (busyAction) return
    setBusyAction(key)
    try {
      await task()
      router.refresh()
    } finally {
      setBusyAction(null)
    }
  }

  if (props.audience === 'ecd') {
    const nextStatus: EcdNotificationStatus = props.status === 'claimed' ? 'opened' : 'claimed'
    const nextStatusLabel = nextStatus === 'claimed' ? 'Mark Claimed' : 'Mark Opened'

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busyAction !== null}
          onClick={() =>
            void runAction('status', async () => {
              const response = await fetch(`/api/internal/platform-admin/notification-logs/${props.rowId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
              })
              const payload = await parseJsonResponse(response)
              if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Failed to update invite status.')
              }
              toast.success(`Invite updated: ${nextStatus}.`)
            })
          }
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {busyAction === 'status' ? 'Saving...' : nextStatusLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busyAction !== null || !props.centreId}
          onClick={() =>
            void runAction('resend', async () => {
              if (!props.centreId) throw new Error('Missing centre ID.')
              const response = await fetch(`/api/internal/platform-admin/centres/${props.centreId}/send-owner-invite`, {
                method: 'POST',
              })
              const payload = await parseJsonResponse(response)
              if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Failed to resend invite.')
              }
              toast.success('Invite resent successfully.')
            })
          }
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {busyAction === 'resend' ? 'Sending...' : 'Resend'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busyAction !== null}
        onClick={() =>
          void runAction('read', async () => {
            const response = await fetch(`/api/internal/platform-admin/parent-notifications/${props.rowId}/read-state`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isRead: !props.isRead }),
            })
            const payload = await parseJsonResponse(response)
            if (!response.ok || !payload.ok) {
              throw new Error(payload.error || 'Failed to update read state.')
            }
            toast.success(`Notification marked ${props.isRead ? 'unread' : 'read'}.`)
          })
        }
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {busyAction === 'read' ? 'Saving...' : props.isRead ? 'Mark Unread' : 'Mark Read'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={busyAction !== null || !props.parentId}
        onClick={() =>
          void runAction('welcome', async () => {
            if (!props.parentId) throw new Error('Missing parent ID.')
            const response = await fetch(`/api/internal/platform-admin/parents/${props.parentId}/welcome-sequence`, {
              method: 'POST',
            })
            const payload = await parseJsonResponse(response)
            if (!response.ok || !payload.ok) {
              throw new Error(payload.error || 'Failed to ensure welcome notifications.')
            }
            if ((payload.inserted ?? 0) > 0) {
              toast.success(`Welcome notifications added (${payload.inserted}).`)
            } else {
              toast.message('Welcome notifications already present for this parent.')
            }
          })
        }
      >
        <BellRing className="h-3.5 w-3.5" />
        {busyAction === 'welcome' ? 'Checking...' : 'Ensure Welcome'}
      </Button>
    </div>
  )
}

