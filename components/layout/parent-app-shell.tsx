'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
// import { SignOutButton } from '@/components/cc-admin/SignOutButton' // Removed admin-specific import
import { Container } from '@/components/layout/container'
import { BrandMark } from '@/components/ecd/BrandMark'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client' // Import createClient for local SignOutButton
import { ArrowLeft, Check } from 'lucide-react'

type ParentAppShellProps = {
  userName: string
  userEmail: string
  isVerified?: boolean
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
  { href: '/directory', label: 'Discover' },
  { href: '/parent/notifications', label: 'Inbox' },
  { href: '/parent/profile', label: 'Me' },
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
  if (pathname.startsWith('/parent/children') && pathname.includes('/edit')) return 'Edit Child Profile'
  if (pathname.startsWith('/parent/children')) return 'Child Profiles'
  if (pathname.startsWith('/parent/shortlist')) return 'Saved Centres'
  if (pathname.startsWith('/parent/notifications')) return 'Family Inbox'
  if (pathname.startsWith('/parent/compare')) return 'Centre Comparison'
  return 'Parent Command Centre'
}

function getBackFallback(pathname: string) {
  if (pathname.startsWith('/directory')) return '/directory'
  if (pathname.startsWith('/parent')) return '/parent/dashboard'
  return '/'
}

function shouldShowMobileBack(pathname: string) {
  const topLevelTabs = new Set(['/directory', '/parent/dashboard', '/parent/applications', '/parent/profile'])
  if (topLevelTabs.has(pathname)) return false

  if (pathname.startsWith('/directory/')) return true
  if (pathname.startsWith('/parent/dashboard/')) return true
  if (pathname.startsWith('/parent/applications/')) return true
  if (pathname.startsWith('/parent/profile/')) return true
  if (pathname.startsWith('/parent/children')) return true
  if (pathname.startsWith('/parent/notifications')) return true
  if (pathname.startsWith('/parent/shortlist')) return true
  if (pathname.startsWith('/parent/compare')) return true

  return false
}

export function ParentAppShell({ userName, userEmail, isVerified = false, children }: ParentAppShellProps) {
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

  function handleMobileBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(getBackFallback(pathname))
  }

  const showMobileBack = shouldShowMobileBack(pathname)

  return (
    <div
      data-parent-theme="true"
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_20%_-10%,rgba(14,165,233,0.16),transparent_55%),linear-gradient(to_bottom,#f0f9ff,#f8fafc_35%,#ffffff)]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-[58px] z-40 mx-auto w-fit rounded-full border border-cyan-200/70 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-[var(--shadow-elevation-1)] backdrop-blur transition-opacity',
          pullDistance > 8 ? 'opacity-100' : 'opacity-0'
        )}
      >
        {pullDistance >= 90 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      <header className="glass-nav sticky top-0 z-30 border-b border-cyan-100/60">
        <Container className="max-w-3xl flex items-center justify-between gap-3 py-3 sm:py-4">
          {showMobileBack ? (
            <div className="flex shrink-0 items-center md:hidden">
              <button
                type="button"
                onClick={handleMobileBack}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-700 shadow-[var(--shadow-elevation-1)] transition hover:bg-white"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <BrandMark compact className="mb-1 max-[360px]:hidden" />
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-sm">{getTitle(pathname)}</p>
            <div className="max-[360px]:hidden sm:block">
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="truncate text-[11px] font-semibold text-slate-700">{userName}</p>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1" aria-label="Verified badges">
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1d9bf0] text-white shadow-sm"
                      title="Verified"
                    >
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-200 bg-white shadow-sm"
                      title="CentreConnect verified"
                    >
                      <Image
                        src="/Logo.jpeg"
                        alt="CentreConnect verification badge"
                        width={12}
                        height={12}
                        className="rounded-full object-cover"
                      />
                    </span>
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
            </div>
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

      <main className="overflow-x-hidden py-3 pb-24 sm:py-5 md:pb-0">
        <Container className="max-w-3xl">
          <div className="parent-theme-content parent-page-shell">{children}</div>
        </Container>
      </main>
    </div>
  )
}



