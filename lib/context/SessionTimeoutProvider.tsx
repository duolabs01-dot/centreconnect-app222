'use client'

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { robustSignOut } from '@/lib/auth/client-sign-out'

const INACTIVITY_LIMIT = 10 * 60 * 1000 // 10 minutes
const CHECK_INTERVAL = 30 * 1000 // 30 seconds

interface SessionTimeoutContextType {}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined)

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const lastActivityRef = useRef<number>(Date.now())
  const supabase = useMemo(() => createClient(), [])

  const isProtectedRoute = (path: string) => {
    // Only CC Admin workspace should auto-logout; parents and ECD users keep their sessions
    return path.startsWith('/admin')
  }

  const getSession = useCallback(() => supabase.auth.getSession(), [supabase])

  const logout = useCallback(async () => {
    await robustSignOut(supabase)
    // Redirect to landing page as requested
    router.replace('/')
    router.refresh()
  }, [router, supabase])

  useEffect(() => {
    if (!isProtectedRoute(pathname)) return

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, handleActivity))

    const interval = setInterval(async () => {
      const now = Date.now()
      if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
        const { data: { session } } = await getSession()
        if (session) {
          await logout()
        }
      }
    }, CHECK_INTERVAL)

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))
      clearInterval(interval)
    }
  }, [pathname, getSession, logout])

  // Also handle coming back online / tab focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isProtectedRoute(pathname)) {
        const now = Date.now()
        if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
          const { data: { session } } = await getSession()
          if (session) {
            await logout()
          }
        }
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pathname, getSession, logout])

  return (
    <SessionTimeoutContext.Provider value={{}}>
      {children}
    </SessionTimeoutContext.Provider>
  )
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext)
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider')
  }
  return context
}
