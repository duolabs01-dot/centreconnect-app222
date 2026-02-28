'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from './useUser'

interface UsePageViewProps {
  ecdId: string;
}

/**
 * Hook to record page views and page duration analytics.
 * Extends telemetry with role segmentation and session tracking.
 */
export function usePageView({ ecdId }: UsePageViewProps) {
  const pathname = usePathname()
  const { profile } = useUser()
  const startTimeRef = useRef<number>(Date.now())
  const sessionIdRef = useRef<string>('')

  // Generate or retrieve persistent session ID for the browser session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sId = sessionStorage.getItem('cc_analytics_session')
      if (!sId) {
        sId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
        sessionStorage.setItem('cc_analytics_session', sId)
      }
      sessionIdRef.current = sId
    }
  }, [])

  useEffect(() => {
    if (!ecdId) return

    const actorRole = profile?.role || 'anonymous'
    const sessionId = sessionIdRef.current

    // 1. Record Entry (Page View)
    const recordPageView = async () => {
      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ecdId,
            eventType: 'page_view',
            actorRole,
            path: pathname,
            sessionId,
            metadata: {
              referrer: document.referrer,
              screen: `${window.innerWidth}x${window.innerHeight}`
            }
          })
        })
      } catch (err) {
        // Silent fail for analytics in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Analytics: Failed to record page view', err)
        }
      }
    }

    recordPageView()
    startTimeRef.current = Date.now()

    // 2. Record Exit (Page Duration)
    const recordDuration = () => {
      const duration = Date.now() - startTimeRef.current
      if (duration < 500) return // Ignore "bounces" under 0.5s

      const payload = JSON.stringify({
        ecdId,
        eventType: 'page_duration',
        actorRole,
        path: pathname,
        durationMs: duration,
        sessionId,
        metadata: {
          exit_at: new Date().toISOString()
        }
      })

      // Use sendBeacon for reliable delivery on page close/navigation
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/events', blob)
      } else {
        fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {})
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordDuration()
      } else {
        // Reset timer when user returns to tab
        startTimeRef.current = Date.now()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      recordDuration()
    }
  }, [ecdId, pathname, profile?.role])
}
