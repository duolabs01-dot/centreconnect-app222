'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { createClient } from '@/lib/supabase/client'

export function DirectoryAuthCta() {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled) setSignedIn(Boolean(user))
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (signedIn) {
    return <SignOutButton redirectTo="/directory" variant="outline" className="h-8 px-3 text-xs" />
  }

  return (
    <Button asChild className="h-9 px-4 text-sm">
      <Link href="/login">Sign in</Link>
    </Button>
  )
}
