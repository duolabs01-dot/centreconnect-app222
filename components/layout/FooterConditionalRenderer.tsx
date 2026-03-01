'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
import { PageTransition } from '@/components/ui/page-transition'
import { BottomNav } from './bottom-nav'
import { PARENT_NAV_ITEMS, ECD_MOBILE_NAV_ITEMS, ADMIN_MOBILE_NAV_ITEMS } from '@/lib/navigation-config'
import { createClient } from '@/lib/supabase/client'

interface FooterConditionalRendererProps {
  children: ReactNode
}

export function FooterConditionalRenderer({ children }: FooterConditionalRendererProps) {
  const pathname = usePathname()
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  
  useEffect(() => {
    const supabase = createClient()
    
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])
  
  const isParentPortal = pathname?.startsWith('/parent') || pathname?.startsWith('/directory') || pathname?.startsWith('/c/') || pathname?.startsWith('/apply/')
  const isEcdPortal = pathname?.startsWith('/ecd') && !pathname?.startsWith('/ecd/login') && !pathname?.startsWith('/ecd/register')
  const isAdminPortal = pathname?.startsWith('/admin')

  const hideFooter = isParentPortal || isEcdPortal || isAdminPortal

  return (
    <>
      <PageTransition>{children}</PageTransition>
      
      {/* 
        IMPORTANT: BottomNav MUST be rendered here, OUTSIDE of PageTransition.
        User Mandate: NEVER show BottomNav if user is not signed in.
      */}
      {isSignedIn && (
        <>
          {isParentPortal && <BottomNav items={PARENT_NAV_ITEMS} pathname={pathname} />}
          {isEcdPortal && <BottomNav items={ECD_MOBILE_NAV_ITEMS} pathname={pathname} />}
          {isAdminPortal && <BottomNav items={ADMIN_MOBILE_NAV_ITEMS} pathname={pathname} />}
        </>
      )}

      {!hideFooter && <GlobalMobileLegalStrip />}
      {!hideFooter && <GlobalDesktopFooter />}
    </>
  )
}
