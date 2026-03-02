'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
import { BottomNav } from './bottom-nav'
import { PARENT_NAV_ITEMS, ADMIN_MOBILE_NAV_ITEMS } from '@/lib/navigation-config'

interface FooterConditionalRendererProps {
  children: ReactNode
}

function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().startsWith('sb-') && c.includes('-auth-token'))
}

function useIsSignedIn(pathname: string): boolean {
  const [isSignedIn, setIsSignedIn] = useState(() => hasAuthCookie())

  useEffect(() => {
    setIsSignedIn(hasAuthCookie())
  }, [pathname])

  return isSignedIn
}

export function FooterConditionalRenderer({ children }: FooterConditionalRendererProps) {
  const pathname = usePathname()
  const isSignedIn = useIsSignedIn(pathname)

  const isParentPortal = pathname?.startsWith('/parent') || pathname?.startsWith('/directory') || pathname?.startsWith('/c/') || pathname?.startsWith('/apply/')
  const isEcdPortal = pathname?.startsWith('/ecd') && !pathname?.startsWith('/ecd/login') && !pathname?.startsWith('/ecd/register')
  const isAdminPortal = pathname?.startsWith('/admin')
  const hideFooter = isParentPortal || isEcdPortal || isAdminPortal

  return (
    <>
      {children}

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
