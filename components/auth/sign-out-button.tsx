'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { robustSignOut } from '@/lib/auth/client-sign-out'

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
    try {
      const supabase = createClient()
      const { clientError, serverError } = await robustSignOut(supabase)
      if (clientError && serverError) {
        toast.error(clientError || serverError || 'Could not sign out')
        return
      }

      if (pathname === redirectTo) {
        router.refresh()
      } else {
        router.replace(redirectTo)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
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
