'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

export function ThemeRouteSync() {
  const pathname = usePathname()
  const { setTheme } = useTheme()

  useEffect(() => {
    const shouldUseDark = pathname?.startsWith('/admin') ?? false
    // Route default: admin -> dark, non-admin -> light.
    // Do not re-force on every manual toggle while staying on the same route.
    setTheme(shouldUseDark ? 'dark' : 'light')
  }, [pathname, setTheme])

  return null
}
