'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PORTAL_PREFIXES = ['/ecd', '/parent']
const PUBLIC_ROUTES = ['/', '/login', '/register', '/for-centres', '/forgot-password', '/reset-password', '/legal', '/privacy', '/terms', '/popia-security']
const CATCH_ALL_PUBLIC_ROUTES_PREFIXES = ['/c/', '/directory', '/apply', '/auth'] // e.g., /c/[slug], /directory, /apply/[id]

export function useAppNavLock() {
  const pathname = usePathname()

  useEffect(() => {
    let isPortalRoute = false
    for (const prefix of PORTAL_PREFIXES) {
      if (pathname.startsWith(prefix) && !PUBLIC_ROUTES.includes(pathname) && !CATCH_ALL_PUBLIC_ROUTES_PREFIXES.some(publicPrefix => pathname.startsWith(publicPrefix))) {
        isPortalRoute = true
        break
      }
    }

    if (!isPortalRoute) {
      // If not a portal route, no need to apply nav lock
      return
    }

    // Push a dummy state to history to create an entry to "trap" the user
    // This state has no real data, it's just a placeholder for the popstate event
    window.history.pushState({ appNavLock: true }, '', window.location.href)

    const handlePopstate = (event: PopStateEvent) => {
      // If the popstate event was triggered by our own pushed state, we ignore it
      // This prevents an infinite loop if we pushState immediately
      if (event.state && event.state.appNavLock) {
        return;
      }

      // Check again if the current path is still a portal path (might have navigated programmatically)
      let currentPathIsPortal = false
      for (const prefix of PORTAL_PREFIXES) {
        if (pathname.startsWith(prefix) && !PUBLIC_ROUTES.includes(pathname) && !CATCH_ALL_PUBLIC_ROUTES_PREFIXES.some(publicPrefix => pathname.startsWith(publicPrefix))) {
          currentPathIsPortal = true
          break
        }
      }

      if (currentPathIsPortal) {
        // If the user tries to navigate back out of a portal,
        // push the current state back to history to prevent leaving
        window.history.pushState({ appNavLock: true }, '', window.location.href)
      }
    }

    window.addEventListener('popstate', handlePopstate)

    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [pathname]) // Re-run effect if pathname changes
}
