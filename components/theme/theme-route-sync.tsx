'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

export function ThemeRouteSync() {
  const pathname = usePathname()
  const { setTheme } = useTheme()
  const prevZone = useRef<'admin' | 'public' | null>(null)

  useEffect(() => {
    const zone = pathname?.startsWith('/admin') ? 'admin' : 'public'
    if (zone !== prevZone.current) {
      setTheme(zone === 'admin' ? 'dark' : 'light')
      prevZone.current = zone
    }
  }, [pathname, setTheme])

  return null
}
