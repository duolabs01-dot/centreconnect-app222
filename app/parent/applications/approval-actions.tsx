'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { triggerFirstTimeConfetti } from '@/lib/ui/confetti'

type ApprovalActionsProps = {
  applicationId: string
}

export function ApprovalActions({ applicationId }: ApprovalActionsProps) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<'accept' | 'decline' | null>(null)
  const [showSuccessBurst, setShowSuccessBurst] = useState(false)

  async function submit(action: 'accept' | 'decline') {
    setLoadingAction(action)
    try {
      const response = await fetch(`/api/parent/applications/${applicationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const payload = (await response.json()) as { ok?: boolean; error?: string; withdrawnCount?: number }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Request failed')
      }

      if (action === 'accept') {
        setShowSuccessBurst(true)
        setTimeout(() => setShowSuccessBurst(false), 1500)
        triggerFirstTimeConfetti('parent-first-approval-accept', 'approval')
        toast.success('Enrollment confirmed', {
          description: 'Enrollment is now finalized for this centre.',
        })
        if ((payload.withdrawnCount ?? 0) > 0) {
          toast.success('Auto-withdraw completed', {
            description: `${payload.withdrawnCount} other active application(s) were withdrawn.`,
          })
        }
      } else {
        toast.success('Placement declined')
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update decision')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="relative mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm font-semibold text-emerald-900">Application approved</p>
      <p className="mt-1 text-xs text-emerald-800">
        This centre approved this application. Confirm enrollment to finalize and automatically withdraw other active applications for this child.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => void submit('accept')} disabled={Boolean(loadingAction)}>
          {loadingAction === 'accept' ? 'Accepting...' : 'Accept'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void submit('decline')} disabled={Boolean(loadingAction)}>
          {loadingAction === 'decline' ? 'Declining...' : 'Decline'}
        </Button>
      </div>
      <AnimatePresence>
        {showSuccessBurst ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-emerald-50/85 backdrop-blur-[1px]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm"
            >
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.18 }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100"
              >
                <Check className="h-3.5 w-3.5" />
              </motion.span>
              Enrolled
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
