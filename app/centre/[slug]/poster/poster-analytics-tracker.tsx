'use client'

import { useEffect } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics/client-events'

type PosterAnalyticsTrackerProps = {
  ecdId: string
}

export function PosterAnalyticsTracker({ ecdId }: PosterAnalyticsTrackerProps) {
  useEffect(() => {
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'anonymous',
      eventType: 'qr_poster_viewed',
      path: window.location.pathname,
      metadata: {
        source: 'poster_page',
      },
    })
  }, [ecdId])

  return null
}

