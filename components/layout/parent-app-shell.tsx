'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
// import { SignOutButton } from '@/components/cc-admin/SignOutButton' // Removed admin-specific import
import { Container } from '@/components/layout/container'
import { PageTransition } from '@/components/ui/page-transition'
import { BrandMark } from '@/components/cc-admin/BrandMark'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client' // Import createClient for local SignOutButton

type ParentAppShellProps = {
  userEmail: string
  children: React.ReactNode
}

// Local SignOutButton component to use the generic UI Button
function LocalSignOutButton({
  redirectTo = '/',
  className,
  variant,
  size,
}: {
  redirectTo?: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
  size?: "default" | "sm" | "lg" | "icon" | null | undefined
}) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    if (isLoading) return
    setIsLoading(true)
    await supabase.auth.signOut()
    router.push(redirectTo)
    router.refresh()
    setIsLoading(false)
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}

const navItems = [
  { href: '/parent/dashboard', label: 'Home' },
  { href: '/directory', label: 'Find' },
  { href: '/parent/applications', label: 'Applications' },
  { href: '/parent/profile', label: 'Profile' },
]

function getTitle(pathname: string) {
  if (pathname.startsWith('/parent/applications')) return 'Application Journey'
  if (pathname.startsWith('/parent/profile/security')) return 'Security & Sign-in Activity'
  if (pathname.startsWith('/parent/profile/documents')) return 'Documents Vault'
  if (pathname.startsWith('/parent/profile/emergency')) return 'Emergency Contacts'
  if (pathname.startsWith('/parent/profile/guardians')) return 'Co-Guardians'
  if (pathname.startsWith('/parent/profile/edit')) return 'Profile Studio'
  if (pathname.startsWith('/parent/profile')) return 'Parent Profile'
  if (pathname.startsWith('/parent/children/new')) return 'Add Child Profile'
  if (pathname.startsWith('/parent/children')) return 'Child Profiles'
  if (pathname.startsWith('/parent/shortlist')) return 'Saved Centres'
  if (pathname.startsWith('/parent/notifications')) return 'Message Centre'
  if (pathname.startsWith('/parent/compare')) return 'Centre Comparison'
  return 'Parent Command Centre'
}

export function ParentAppShell({ userEmail, children }: ParentAppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const pullStartY = useRef<number | null>(null)

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (window.scrollY > 0) return
    pullStartY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (pullStartY.current === null || window.scrollY > 0) return
    const currentY = e.touches[0]?.clientY ?? pullStartY.current
    const distance = Math.max(0, currentY - pullStartY.current)
    setPullDistance(Math.min(distance, 120))
  }

  function onTouchEnd() {
    if (pullDistance >= 90 && window.scrollY <= 0) {
      router.refresh()
    }
    setPullDistance(0)
    pullStartY.current = null
  }

  useEffect(() => {
    // Warm likely next routes so parent navigation feels instant.
    router.prefetch('/parent/applications')
    router.prefetch('/parent/profile')
    router.prefetch('/directory')
    router.prefetch('/parent/notifications')
  }, [router])

  return (
    <div
      data-parent-theme="true"
      className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,rgba(14,165,233,0.16),transparent_55%),linear-gradient(to_bottom,#f0f9ff,#f8fafc_35%,#ffffff)]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-[58px] z-40 mx-auto w-fit rounded-full border border-cyan-200/70 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-sm backdrop-blur transition-opacity',
          pullDistance > 8 ? 'opacity-100' : 'opacity-0'
        )}
      >
        {pullDistance >= 90 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      <header className="cc-glass-nav sticky top-0 z-30 border-b border-cyan-100/60">
        <Container className="flex items-center justify-between gap-3 py-3 sm:py-4">
          <div className="min-w-0 flex-1">
            <BrandMark compact className="mb-1 max-[360px]:hidden" />
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-sm">{getTitle(pathname)}</p>
            <p className="truncate text-[11px] text-slate-500 max-[360px]:hidden sm:block">{userEmail}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <LocalSignOutButton redirectTo="/" variant="outline" size="sm" className="h-8 px-3 text-xs" />
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Button key={item.href} variant={active ? 'default' : 'ghost'} size="sm" asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              )
            })}
            <LocalSignOutButton redirectTo="/" variant="outline" className="ml-1" />
          </nav>
        </Container>
      </header>

      <main className="py-4 sm:py-6">
        <Container>
          <PageTransition>
            <div className="parent-theme-content parent-page-shell">{children}</div>
          </PageTransition>
        </Container>
      </main>
    </div>
  )
}
