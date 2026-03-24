'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Container } from '@/components/layout/container'
import { BrandMark } from '@/components/ecd/BrandMark'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BadgeCheck, LogOut, ChevronDown, Sparkles, FileText, Lock as LockIcon, Home, Search, ClipboardList, Zap, GraduationCap, User } from 'lucide-react'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { LiteImage } from '@/components/ui/LiteImage'
import { createClient } from '@/lib/supabase/client'
import { useParentLayout } from './parent-layout-provider'
import { robustSignOut } from '@/lib/auth/client-sign-out'
import { shouldHideParentBottomNav } from '@/lib/navigation/parent-bottom-nav'
import { ParentNotificationBell } from '@/components/notifications/parent-notification-bell'
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs'
import { getBreadcrumbClassName, shouldShowBreadcrumbs } from '@/lib/navigation/breadcrumb-visibility'

type ParentAppShellProps = {
  children: React.ReactNode
}

const DESKTOP_PARENT_TABS: Array<{ href: string; label: string; icon: React.ElementType }> = [
  { href: '/parent/dashboard',    label: 'Home',         icon: Home },
  { href: '/parent/discover',     label: 'Discover',     icon: Search },
  { href: '/parent/applications', label: 'Applications', icon: ClipboardList },
  { href: '/parent/daily-reports',label: 'Daily Reports',icon: Zap },
  { href: '/parent/report-cards', label: 'Report Cards', icon: GraduationCap },
  { href: '/parent/profile',      label: 'Profile',      icon: User },
]

function getTitle(pathname: string) {
  if (pathname.startsWith('/parent/applications')) return 'Applications'
  if (pathname.startsWith('/parent/report-cards')) return 'Report Cards'
  if (pathname.startsWith('/parent/support')) return 'Support'
  if (pathname.startsWith('/parent/preferences')) return 'Preferences'
  if (pathname.startsWith('/parent/profile/security')) return 'Security'
  if (pathname.startsWith('/parent/profile/documents')) return 'Documents'
  if (pathname.startsWith('/parent/profile')) return 'Profile'
  if (pathname.startsWith('/parent/children')) return 'Children'
  if (pathname.startsWith('/parent/notifications')) return 'Inbox'
  return 'Home'
}

function shouldShowMobileBack(pathname: string) {
  if (pathname === '/parent/profile') return false
  if (shouldHideParentBottomNav(pathname)) return true
  const topLevelTabs = new Set(['/parent/discover', '/parent/dashboard', '/directory'])
  if (topLevelTabs.has(pathname)) return false
  return true
}

function getMobileBackTarget(pathname: string) {
  if (pathname.startsWith('/parent/profile/')) return '/parent/profile'
  if (pathname.startsWith('/parent/applications/')) return '/parent/applications'
  if (pathname.startsWith('/parent/children/')) return '/parent/children'
  if (pathname.startsWith('/parent/report-cards/')) return '/parent/report-cards'
  if (pathname.startsWith('/parent/notifications/')) return '/parent/notifications'
  if (pathname.startsWith('/parent/')) return '/parent/dashboard'
  return '/parent/dashboard'
}

function isDesktopTabActive(pathname: string, href: string) {
  if (href === '/parent/discover') {
    return pathname === '/parent/discover' || pathname === '/directory' || pathname.startsWith('/c/') || pathname.startsWith('/apply/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ParentAppShell({ children }: ParentAppShellProps) {
  const { userName, avatarUrl, isVerified, userId } = useParentLayout()
  const pathname = usePathname()
  const router = useRouter()
  useAppNavLock()
  
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  useEffect(() => {
    router.prefetch('/parent/discover')
    router.prefetch('/parent/dashboard')
  }, [router])

  useEffect(() => {
    document.documentElement.setAttribute('data-app-shell', 'true')
    return () => document.documentElement.removeAttribute('data-app-shell')
  }, [])

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      const fallbackAuthClient = {
        auth: {
          signOut: async () => ({ error: null }),
        },
      }

      const authClient = (() => {
        try {
          return createClient()
        } catch (error) {
          console.error('Unable to create Supabase browser client for sign out:', error)
          return fallbackAuthClient
        }
      })()

      await robustSignOut(authClient)
      router.replace('/')
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  function handleMobileBack() {
    const target = getMobileBackTarget(pathname)
    if (target === pathname) {
      router.push('/parent/dashboard')
      return
    }
    router.push(target)
  }

  const showMobileBack = shouldShowMobileBack(pathname)
  const hideParentBottomNav = shouldHideParentBottomNav(pathname)
  const showMobileTitle = pathname !== '/parent/dashboard'
  const showBreadcrumbs = shouldShowBreadcrumbs(pathname, 'parent')

  return (
    <div
      data-parent-theme="true"
      className="min-h-screen overflow-x-clip bg-card font-sans text-foreground"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {/* Premium Background Illustration */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03]">
        <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-cyan-500 blur-[120px]" />
        <div className="absolute -right-20 top-1/2 h-[400px] w-[400px] rounded-full bg-teal-500 blur-[100px]" />
      </div>

      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showMobileBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleMobileBack}
                  className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : null}

              <BrandMark href="/parent/dashboard" compact className="shrink-0" />
            </div>

            <div className="flex items-center gap-3">
              <ParentNotificationBell parentId={userId} />
              {/* Social-media style sign out / User menu */}
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="h-10 rounded-full border-slate-200 bg-white p-1 pl-3 group hover:border-cyan-300 hover:bg-white"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-[11px] font-black text-slate-900 leading-none">{userName}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-400">Parent Account</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white shadow-inner">
                    {avatarUrl ? (
                      <LiteImage src={avatarUrl} alt={userName} width={32} height={32} className="h-full w-full object-cover" />
                    ) : (
                      userName[0].toUpperCase()
                    )}
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform group-hover:text-slate-600', showUserDropdown && 'rotate-180')} />
                </Button>

                {showUserDropdown && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setShowUserDropdown(false)} />
                    <div className="absolute right-0 z-[60] mt-2 w-56 origin-top-right animate-in zoom-in-95 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-elevation-1)] duration-100">
                      <div className="mb-1 border-b border-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-400">Signed in</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{userName}</p>
                          {isVerified && <BadgeCheck className="h-4 w-4 fill-cyan-50 text-cyan-500" />}
                        </div>
                      </div>

                      <Link
                        href="/parent/profile/documents"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" />
                        Documents
                      </Link>

                      <Link
                        href="/parent/profile/security"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <LockIcon className="h-4 w-4" />
                        Account Security
                      </Link>

                      <div className="my-1 h-px bg-slate-50" />

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          handleSignOut()
                          setShowUserDropdown(false)
                        }}
                        disabled={isSigningOut}
                        className="h-9 w-full justify-start rounded-2xl px-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        {isSigningOut ? 'Ending Session...' : 'Sign Out'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <nav className="mt-3 hidden items-center gap-1.5 overflow-x-auto pb-1 md:flex">
            {DESKTOP_PARENT_TABS.map((tab) => {
              const active = isDesktopTabActive(pathname, tab.href)
              const Icon = tab.icon
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap',
                    active
                      ? 'border-teal-300 bg-teal-50 text-teal-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main
        className={cn(
          'relative z-10 flex-1 md:pb-12',
          hideParentBottomNav ? 'pb-12' : 'pb-[calc(8rem+env(safe-area-inset-bottom))]'
        )}
      >
        <Container className="max-w-6xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
          {showBreadcrumbs ? (
            <AppBreadcrumbs
              rootHref="/parent/dashboard"
              rootLabel="Home"
              className={getBreadcrumbClassName('parent')}
            />
          ) : null}
          {showMobileTitle ? (
            <div className="mb-6 md:hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-600" />
                <h1 className="text-2xl font-black tracking-tight text-slate-950">{getTitle(pathname)}</h1>
              </div>
            </div>
          ) : null}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              className="parent-page-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

        </Container>
      </main>

    </div>
  )
}


