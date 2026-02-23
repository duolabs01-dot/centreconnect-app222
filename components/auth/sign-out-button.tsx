'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type SignOutButtonProps = {
  redirectTo?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
}

export function SignOutButton({
  redirectTo = '/',
  className,
  variant = 'outline',
}: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    if (isLoading) return
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message || 'Could not sign out')
      setIsLoading(false)
      return
    }

    if (pathname === redirectTo) {
      router.refresh()
    } else {
      router.push(redirectTo)
      router.refresh()
    }
    setIsLoading(false)
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}
