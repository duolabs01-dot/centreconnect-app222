'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { GlobalDesktopFooter } from './global-desktop-footer'
import { GlobalMobileLegalStrip } from './global-mobile-legal-strip'
import { GlobalBottomNav } from '@/components/nav/GlobalBottomNav'

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
      {children}
      {!hideFooter && <GlobalMobileLegalStrip />}
      {!hideFooter && <GlobalDesktopFooter />}
      {!hideFooter && <GlobalBottomNav />}
    </>
  )
}
