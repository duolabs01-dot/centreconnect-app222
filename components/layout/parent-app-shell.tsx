'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image' // Keep Image for badge, but use LiteImage for main images
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Container } from '@/components/layout/container'
import { BrandMark } from '@/components/ecd/BrandMark'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BadgeCheck, LayoutDashboard, Compass, Bell, User } from 'lucide-react'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { OfflineBanner } from '@/components/public/OfflineBanner'
import { LiteImage } from '@/components/ui/LiteImage' // Import LiteImage
import { InstallPrompt } from '@/components/public/InstallPrompt' // Import InstallPrompt
import { createClient } from '@/lib/supabase/client' // Import Supabase client

type ParentAppShellProps = {
  userName: string
  isVerified?: boolean
  profileNudge?: {
    completionPct: number
    missing: string[]
  } | null
  children: React.ReactNode
}

const navItems = [
  { href: '/parent/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/directory', label: 'Discover', icon: Compass },
  { href: '/parent/notifications', label: 'Inbox', icon: Bell },
  { href: '/parent/profile', label: 'Me', icon: User },
]

function getTitle(pathname: string) {
  if (pathname.startsWith('/parent/applications')) return 'Application Journey'
  if (pathname.startsWith('/parent/support')) return 'Support'
  if (pathname.startsWith('/parent/preferences')) return 'Preferences'
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
  if (pathname.startsWith('/parent/preferences')) return true
  if (pathname.startsWith('/parent/support')) return true
  if (pathname.startsWith('/parent/children')) return true
  if (pathname.startsWith('/parent/notifications')) return true
  if (pathname.startsWith('/parent/shortlist')) return true
  if (pathname.startsWith('/parent/compare')) return true

  return false
}

function isMeTab(pathname: string) {
  return pathname === '/parent/profile' || pathname.startsWith('/parent/profile/')
}

export function ParentAppShell({ userName, isVerified = false, profileNudge = null, children }: ParentAppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  useAppNavLock()
  const [pullDistance, setPullDistance] = useState(0)
  const [hideProfileNudge, setHideProfileNudge] = useState(false)
  const pullStartY = useRef<number | null>(null)
  const [hasSubmittedFirstApplication, setHasSubmittedFirstApplication] = useState(false); // State for application check

  useEffect(() => {
    const checkApplications = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count, error } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', user.id);
        if (error) {
          console.error('Error checking applications for install prompt:', error);
          return;
        }
        setHasSubmittedFirstApplication((count ?? 0) > 0);
      }
    };
    checkApplications();
  }, []);

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
    // Prefetch only critical routes
    router.prefetch('/directory')
    router.prefetch('/parent/dashboard')
  }, [router])

  function handleMobileBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(getBackFallback(pathname))
  }

  const showMobileBack = shouldShowMobileBack(pathname)
  const onMeTab = isMeTab(pathname)
  const showProfileNudge = Boolean(profileNudge && !hideProfileNudge && !pathname.startsWith('/parent/profile'))

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
          'pointer-events-none fixed inset-x-0 top-3 z-40 mx-auto w-fit rounded-full border border-cyan-200/70 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-[var(--shadow-elevation-1)] backdrop-blur transition-opacity',
          pullDistance > 8 ? 'opacity-100' : 'opacity-0'
        )}
      >
        {pullDistance >= 90 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      <main className="overflow-x-hidden py-3 pb-24 sm:py-5 md:pb-0">
        <Container className="max-w-3xl">
          <div className="mb-3 px-1 pt-1 sm:mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  {showMobileBack ? (
                    <div className="flex shrink-0 items-center md:hidden">
                      <button
                        type="button"
                        onClick={handleMobileBack}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-200/70 bg-transparent text-slate-700 transition hover:bg-cyan-50/60"
                        aria-label="Go back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <BrandMark href="/parent/dashboard" compact hideLabelOnMobile className="shrink-0" />
                  <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{getTitle(pathname)}</p>
                </div>
                {onMeTab ? (
                  <div className={cn('mt-1 flex items-center gap-2', showMobileBack ? 'ml-10 md:ml-0' : 'ml-[3.5rem] md:ml-0')}>
                    <p className="truncate text-xs font-semibold text-slate-700">{userName}</p>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1" aria-label="Verified badges">
                        <span className="inline-flex h-4 w-4 items-center justify-center" title="X-style verified badge">
                          <BadgeCheck className="h-4 w-4 fill-[#1d9bf0] text-white" />
                        </span>
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-[4px] border border-slate-200 bg-white shadow-sm"
                          title="CentreConnect affiliate badge"
                        >
                          <LiteImage
                            src="/centreconnect-logo.svg"
                            alt="CentreConnect verification badge"
                            width={16}
                            height={16}
                            className="h-full w-full object-cover"
                            sizes="16px"
                          />
                        </span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <nav className="hidden shrink-0 items-center gap-1.5 md:flex">
                {navItems.map((item) => {
                  const active =
                    item.href === '/parent/profile'
                      ? pathname.startsWith('/parent/profile') ||
                        pathname.startsWith('/parent/preferences') ||
                        pathname.startsWith('/parent/support') ||
                        pathname.startsWith('/parent/children')
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Button
                      key={item.href}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        active
                          ? 'bg-cyan-100/80 text-cyan-800 shadow-[var(--shadow-elevation-1)] hover:bg-cyan-100'
                          : 'text-slate-600 hover:bg-cyan-50/70 hover:text-slate-900'
                      )}
                      asChild
                    >
                      <Link href={item.href} aria-current={active ? 'page' : undefined}>
                        {item.label}
                      </Link>
                    </Button>
                  )
                })}
              </nav>
            </div>
          </div>
          {showProfileNudge ? (
            <section className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 sm:mb-4 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Complete your profile</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    You are {profileNudge?.completionPct ?? 0}% ready. Centres respond faster when details are complete.
                  </p>
                  {profileNudge?.missing?.length ? (
                    <p className="mt-1 text-xs text-amber-800">
                      Missing: {profileNudge.missing.join(', ')}.
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href="/parent/profile">Finish profile</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/parent/profile/documents">Upload documents</Link>
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHideProfileNudge(true)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  aria-label="Dismiss profile reminder"
                >
                  Later
                </button>
              </div>
            </section>
          ) : null}
          <div className="parent-theme-content parent-page-shell">{children}</div>
        </Container>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed sticky bottom-0 z-50 md:hidden flex items-center justify-around min-h-[64px] w-full border-t border-gray-200 bg-white shadow-lg">
        {navItems.map((item) => {
          const active =
            item.href === '/parent/profile'
              ? pathname.startsWith('/parent/profile') ||
                pathname.startsWith('/parent/preferences') ||
                pathname.startsWith('/parent/support') ||
                pathname.startsWith('/parent/children')
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-h-[48px] py-3 text-xs font-medium text-gray-500 hover:text-gray-900",
                active && "border-b-4 border-primary bg-primary/10 text-primary"
              )}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="h-7 w-7" strokeWidth={1.75} />
              <span className="mt-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <OfflineBanner /> {/* Add OfflineBanner */}
      <InstallPrompt hasSubmittedFirstApplication={hasSubmittedFirstApplication} /> {/* Add InstallPrompt */}
    </div>
  )
}
