'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/nav/BottomNav'
import { createClient } from '@/lib/supabase/client'

const HIDDEN_PREFIXES = ['/api', '/admin', '/ecd', '/login', '/register', '/forgot-password', '/reset-password', '/auth', '/for-centres']
const HIDDEN_EXACT = ['/']

export function GlobalBottomNav() {
  const pathname = usePathname()
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setIsSignedIn(Boolean(data.session))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setIsSignedIn(Boolean(session))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (!pathname) return null
  if (HIDDEN_EXACT.includes(pathname)) return null
  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null
  }

  const isDiscoverRoute =
    pathname === '/directory' ||
    pathname.startsWith('/directory/') ||
    pathname === '/centre' ||
    pathname.startsWith('/centre/') ||
    pathname === '/c' ||
    pathname.startsWith('/c/')
  if (isDiscoverRoute && isSignedIn !== true) return null

  const mode = pathname.startsWith('/parent') ? 'parent' : 'public'
  if (mode === 'public' && isSignedIn !== true) return null

  return (
    <>
      <div className="cc-nav-spacer md:hidden" aria-hidden />
      <BottomNav mode={mode} />
      <style jsx>{`
        .cc-nav-spacer {
          height: calc(env(safe-area-inset-bottom) + 108px);
        }
      `}</style>
    </>
  )
}
