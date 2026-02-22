'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function ApprovalReceivedToast({ approvalIds }: { approvalIds: string[] }) {
  useEffect(() => {
    if (approvalIds.length === 0) return
    const key = `approval-toast:${approvalIds.sort().join(',')}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    toast.success('Application approved', {
      description: 'A centre approved this application. Open it to confirm or decline placement.',
    })
  }, [approvalIds])

  return null
}
