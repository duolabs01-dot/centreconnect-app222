'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './Button'
import { toast } from 'sonner'
import { robustSignOut } from '@/lib/auth/client-sign-out'

type SignOutButtonProps = {
  redirectTo?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
}

export function SignOutButton({
  redirectTo = '/',
  className,
  variant = 'outline',
}: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { clientError, serverError } = await robustSignOut(supabase)
      if (clientError && serverError) {
        toast.error('Could not sign out. Please try again.')
        return
      }
      if (clientError || serverError) {
        toast.warning('Signed out with warnings. Redirecting...')
      }

      router.replace(redirectTo)
      router.refresh()

      if (typeof window !== 'undefined') {
        window.location.replace(redirectTo)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out. Please try again.')
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
