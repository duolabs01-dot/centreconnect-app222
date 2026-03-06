'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { trackAnalyticsEvent } from '@/lib/analytics/client-events'

type PrintPosterButtonProps = {
  ecdId: string
}

export function PrintPosterButton({ ecdId }: PrintPosterButtonProps) {
  const awaitingAfterPrintRef = useRef(false)

  useEffect(() => {
    const onAfterPrint = () => {
      if (!awaitingAfterPrintRef.current) return
      awaitingAfterPrintRef.current = false
      void trackAnalyticsEvent({
        ecdId,
        actorRole: 'anonymous',
        eventType: 'qr_poster_print_completed',
        path: window.location.pathname,
      })
    }

    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [ecdId])

  return (
    <Button
      type="button"
      className="no-print rounded-2xl bg-teal-500 px-5 text-slate-950 hover:bg-teal-400"
      onClick={() => {
        awaitingAfterPrintRef.current = true
        void trackAnalyticsEvent({
          ecdId,
          actorRole: 'anonymous',
          eventType: 'qr_poster_print_clicked',
          path: window.location.pathname,
        })
        window.print()
      }}
    >
      Print A4 Poster
    </Button>
  )
}
