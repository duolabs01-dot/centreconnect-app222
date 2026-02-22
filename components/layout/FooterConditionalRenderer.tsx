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
  const isAdminPath = pathname.startsWith('/admin')

  return (
    <>
      {children}
      {!isAdminPath && <GlobalMobileLegalStrip />}
      {!isAdminPath && <GlobalDesktopFooter />}
      {!isAdminPath && <GlobalBottomNav />}
    </>
  )
}
