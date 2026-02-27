'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from './useUser'

interface UsePageViewProps {
  ecdId: string;
}

/**
 * Hook to record page views and page duration analytics.
 * Works in both ECD and Parent portals as long as ecdId is provided.
 */
export function usePageView({ ecdId }: UsePageViewProps) {
  const pathname = usePathname()
  const { profile } = useUser()
  const startTimeRef = useRef<number>(Date.now())
  const sessionIdRef = useRef<string>(Math.random().toString(36).substring(2, 15))

  useEffect(() => {
    if (!ecdId) return

    // Record page view on mount
    const recordPageView = async () => {
      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ecdId,
            eventType: 'page_view',
            actorRole: profile?.role || 'anonymous',
            path: pathname,
            sessionId: sessionIdRef.current,
            metadata: {
              referrer: document.referrer,
              userAgent: navigator.userAgent
            }
          })
        })
      } catch (err) {
        // Silent fail for analytics
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to record page view:', err)
        }
      }
    }

    recordPageView()
    startTimeRef.current = Date.now()

    // Record page duration on unmount or visibility change
    const recordDuration = () => {
      const duration = Date.now() - startTimeRef.current
      if (duration < 1000) return // Skip very short views (likely bots or accidental)

      const payload = JSON.stringify({
        ecdId,
        eventType: 'page_duration',
        actorRole: profile?.role || 'anonymous',
        path: pathname,
        durationMs: duration,
        sessionId: sessionIdRef.current,
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

      // Use sendBeacon for reliable delivery during unmount/visibilitychange
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/events', blob)
      } else {
        // Fallback for older browsers
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
        // Reset start time when coming back to tab
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
