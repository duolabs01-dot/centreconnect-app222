'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useMemo } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
import { PageTransition } from '@/components/ui/page-transition'
import { BottomNav } from './bottom-nav'
import { PARENT_NAV_ITEMS, ECD_MOBILE_NAV_ITEMS, ADMIN_MOBILE_NAV_ITEMS } from '@/lib/navigation-config'

interface FooterConditionalRendererProps {
  children: ReactNode
}

/** Synchronous check — reads the Supabase auth cookie that the browser already has.
 *  No async call, no state, no flash. Middleware already protects portal routes so
 *  if we're rendering this on a portal path, the user is authenticated. */
function useIsSignedIn(): boolean {
  return useMemo(() => {
    if (typeof document === 'undefined') return false
    return document.cookie.split(';').some(c => c.trim().startsWith('sb-') && c.includes('-auth-token'))
  }, [])
}

export function FooterConditionalRenderer({ children }: FooterConditionalRendererProps) {
  const pathname = usePathname()
  const isSignedIn = useIsSignedIn()

  const isParentPortal = pathname?.startsWith('/parent') || pathname?.startsWith('/directory') || pathname?.startsWith('/c/') || pathname?.startsWith('/apply/')
  const isEcdPortal = pathname?.startsWith('/ecd') && !pathname?.startsWith('/ecd/login') && !pathname?.startsWith('/ecd/register')
  const isAdminPortal = pathname?.startsWith('/admin')
  const hideFooter = isParentPortal || isEcdPortal || isAdminPortal

  return (
    <>
      <PageTransition>{children}</PageTransition>

      {isSignedIn && (
        <>
          {isParentPortal && <BottomNav items={PARENT_NAV_ITEMS} pathname={pathname} />}
          {isAdminPortal && <BottomNav items={ADMIN_MOBILE_NAV_ITEMS} pathname={pathname} />}
        </>
      )}

      {!hideFooter && <GlobalMobileLegalStrip />}
      {!hideFooter && <GlobalDesktopFooter />}
    </>
  )
}
