'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
const BottomNav = dynamic(() => import('./bottom-nav').then((mod) => mod.BottomNav), { ssr: false })
import { PARENT_NAV_ITEMS, ADMIN_MOBILE_NAV_ITEMS } from '@/lib/navigation-config'
import { shouldHideParentBottomNav } from '@/lib/navigation/parent-bottom-nav'

interface FooterConditionalRendererProps {
  children: ReactNode
}

function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().startsWith('sb-') && c.includes('-auth-token'))
}

function useIsSignedIn(pathname: string): boolean {
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    setIsSignedIn(hasAuthCookie())
  }, [pathname])

  return isSignedIn
}

export function FooterConditionalRenderer({ children }: FooterConditionalRendererProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const isSignedIn = useIsSignedIn(pathname)
  const hideParentBottomNav = shouldHideParentBottomNav(pathname ?? '')

  useEffect(() => {
    setMounted(true)
  }, [])

  const isParentPortal = pathname?.startsWith('/parent') || pathname?.startsWith('/directory') || pathname?.startsWith('/c/') || pathname?.startsWith('/apply/')
  const isEcdPortal = pathname?.startsWith('/ecd') && !pathname?.startsWith('/ecd/login') && !pathname?.startsWith('/ecd/register')
  const isAdminPortal = pathname?.startsWith('/admin')
  const hideFooter = isParentPortal || isEcdPortal || isAdminPortal

  return (
    <>
      {children}

      {mounted && isSignedIn && (
        <>
          {isParentPortal && !hideParentBottomNav && <BottomNav items={PARENT_NAV_ITEMS} pathname={pathname} />}
          {isAdminPortal && <BottomNav items={ADMIN_MOBILE_NAV_ITEMS} pathname={pathname} />}
        </>
      )}

      {!hideFooter && <GlobalMobileLegalStrip />}
      {!hideFooter && <GlobalDesktopFooter />}
    </>
  )
}
