'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

type InteractionActionsProps = {
  ecdId: string
  whatsappHref: string | null
  callHref: string | null
}

async function trackEvent(ecdId: string, eventType: 'profile_view' | 'whatsapp_click' | 'call_click') {
  const payload = JSON.stringify({ ecdId, eventType })

  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/events', blob)
    return
  }

  await fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  })
}

export function InteractionActions({ ecdId, whatsappHref, callHref }: InteractionActionsProps) {
  useEffect(() => {
    void trackEvent(ecdId, 'profile_view')
  }, [ecdId])

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {whatsappHref ? (
        <Button
          variant="outline"
          asChild
          onClick={() => {
            void trackEvent(ecdId, 'whatsapp_click')
          }}
        >
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </Button>
      ) : null}
      {callHref ? (
        <Button
          variant="outline"
          asChild
          onClick={() => {
            void trackEvent(ecdId, 'call_click')
          }}
        >
          <a href={callHref}>Call</a>
        </Button>
      ) : null}
    </div>
  )
}
