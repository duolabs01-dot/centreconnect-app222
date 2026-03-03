'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { createClient } from '@/lib/supabase/client'

export function DirectoryAuthCta() {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSignedIn(Boolean(data.session?.user))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setSignedIn(Boolean(session?.user))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (signedIn) {
    return <SignOutButton redirectTo="/directory" variant="outline" className="h-8 px-3 text-xs" />
  }

  return (
    <Button asChild className="h-9 px-4 text-sm">
      <Link href="/login?next=%2Fdirectory">Sign in/ Sign up</Link>
    </Button>
  )
}
