'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type CopyRouteLinkButtonProps = {
  driverToken: string
}

export function CopyRouteLinkButton({ driverToken }: CopyRouteLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const routeUrl = `${window.location.origin}/driver/${driverToken}`
    try {
      await navigator.clipboard.writeText(routeUrl)
      setCopied(true)
      toast.success('Route link copied')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy route link')
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? 'Copied' : 'Copy Route Link'}
    </Button>
  )
}
