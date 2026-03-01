'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
import { PageTransition } from '@/components/ui/page-transition'
import { BottomNav } from './bottom-nav'
import { PARENT_NAV_ITEMS, ECD_MOBILE_NAV_ITEMS, ADMIN_MOBILE_NAV_ITEMS } from '@/lib/navigation-config'

interface FooterConditionalRendererProps {
  children: ReactNode
}

export function FooterConditionalRenderer({ children }: FooterConditionalRendererProps) {
  const pathname = usePathname()
  
  const isParentPortal = pathname?.startsWith('/parent') || pathname?.startsWith('/directory') || pathname?.startsWith('/c/') || pathname?.startsWith('/apply/')
  const isEcdPortal = pathname?.startsWith('/ecd') && !pathname?.startsWith('/ecd/login') && !pathname?.startsWith('/ecd/register')
  const isAdminPortal = pathname?.startsWith('/admin')

  const hideFooter = isParentPortal || isEcdPortal || isAdminPortal

  return (
    <>
      <PageTransition>{children}</PageTransition>
      
      {/* 
        IMPORTANT: BottomNav MUST be rendered here, OUTSIDE of PageTransition.
        PageTransition uses transforms which creates a new containing block, 
        breaking 'fixed' positioning and causing nav to sit at bottom of page.
      */}
      {isParentPortal && <BottomNav items={PARENT_NAV_ITEMS} pathname={pathname} />}
      {isEcdPortal && <BottomNav items={ECD_MOBILE_NAV_ITEMS} pathname={pathname} />}
      {isAdminPortal && <BottomNav items={ADMIN_MOBILE_NAV_ITEMS} pathname={pathname} />}

      {!hideFooter && <GlobalMobileLegalStrip />}
      {!hideFooter && <GlobalDesktopFooter />}
    </>
  )
}
