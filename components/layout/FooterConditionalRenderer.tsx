'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
import { GlobalBottomNav } from '@/components/nav/GlobalBottomNav'
import { PageTransition } from '@/components/ui/page-transition'

interface FooterConditionalRendererProps {
  children: ReactNode
}

export function FooterConditionalRenderer({ children }: FooterConditionalRendererProps) {
  const pathname = usePathname()
  const hideFooter =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/ecd') ||
    pathname?.startsWith('/parent')

  return (
    <>
      <PageTransition>{children}</PageTransition>
      {!hideFooter && <GlobalMobileLegalStrip />}
      {!hideFooter && <GlobalDesktopFooter />}
      <GlobalBottomNav />
    </>
  )
}
