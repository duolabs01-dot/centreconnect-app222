'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Container } from '@/components/layout/container'
import { BrandMark } from '@/components/ecd/BrandMark'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BadgeCheck, LogOut, ChevronDown, Sparkles, FileText, Lock as LockIcon } from 'lucide-react'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { LiteImage } from '@/components/ui/LiteImage'
import { createClient } from '@/lib/supabase/client'
import { useParentLayout } from './parent-layout-provider'
import { robustSignOut } from '@/lib/auth/client-sign-out'
import { shouldHideParentBottomNav } from '@/lib/navigation/parent-bottom-nav'

type ParentAppShellProps = {
  children: React.ReactNode
}

function getTitle(pathname: string) {
  if (pathname.startsWith('/parent/applications')) return 'My Applications'
  if (pathname.startsWith('/parent/report-cards')) return 'Report Cards'
  if (pathname.startsWith('/parent/support')) return 'Support'
  if (pathname.startsWith('/parent/preferences')) return 'Preferences'
  if (pathname.startsWith('/parent/profile/security')) return 'Security'
  if (pathname.startsWith('/parent/profile/documents')) return 'Vault'
  if (pathname.startsWith('/parent/profile')) return 'Profile'
  if (pathname.startsWith('/parent/children')) return 'Children'
  if (pathname.startsWith('/parent/notifications')) return 'Inbox'
  return 'Home'
}

function shouldShowMobileBack(pathname: string) {
  if (pathname === '/parent/profile') return false
  if (shouldHideParentBottomNav(pathname)) return true
  const topLevelTabs = new Set(['/directory', '/parent/dashboard'])
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

export function ParentAppShell({ children }: ParentAppShellProps) {
  const { userName, avatarUrl, isVerified, profileNudge, userId } = useParentLayout()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  useAppNavLock()
  
  const [hideProfileNudge, setHideProfileNudge] = useState(false)
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  useEffect(() => {
    router.prefetch('/directory')
    router.prefetch('/parent/dashboard')
  }, [router])

  useEffect(() => {
    document.documentElement.setAttribute('data-app-shell', 'true')
    return () => document.documentElement.removeAttribute('data-app-shell')
  }, [])

  useEffect(() => {
    if (!profileNudge) return
    if (pathname.startsWith('/parent/profile')) return
    if (typeof window === 'undefined') return

    const dayKey = new Date().toISOString().slice(0, 10)
    const storageKey = `cc:profile-nudge-popup:${userId}:${dayKey}`
    if (window.sessionStorage.getItem(storageKey)) return

    const timer = window.setTimeout(() => {
      setShowProfilePrompt(true)
    }, 700)
    window.sessionStorage.setItem(storageKey, 'shown')

    return () => window.clearTimeout(timer)
  }, [pathname, profileNudge, userId])

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await robustSignOut(supabase)
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
  const showProfileNudge = Boolean(profileNudge && !hideProfileNudge && !pathname.startsWith('/parent/profile'))

  return (
    <div
      data-parent-theme="true"
      className="min-h-screen bg-card font-sans text-foreground"
    >
      {/* Premium Background Illustration */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03]">
        <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-cyan-500 blur-[120px]" />
        <div className="absolute -right-20 top-1/2 h-[400px] w-[400px] rounded-full bg-teal-500 blur-[100px]" />
      </div>

      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
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
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Parent Account</p>
                </div>
                <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                  {avatarUrl ? (
                    <LiteImage src={avatarUrl} alt={userName} width={32} height={32} className="h-full w-full object-cover" />
                  ) : (
                    userName[0].toUpperCase()
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform", showUserDropdown && "rotate-180")} />
              </Button>

              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute right-0 z-[60] mt-2 w-56 origin-top-right animate-in zoom-in-95 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-elevation-1)] duration-100">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                      <p className="text-xs font-semibold text-slate-400">Signed in</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-bold text-slate-900">{userName}</p>
                        {isVerified && <BadgeCheck className="h-4 w-4 text-cyan-500 fill-cyan-50" />}
                      </div>
                    </div>
                    
                    <Link href="/parent/profile/documents" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                      <FileText className="h-4 w-4" />
                      Documents Vault
                    </Link>
                    
                    <Link href="/parent/profile/security" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                      <LockIcon className="h-4 w-4" />
                      Account Security
                    </Link>

                    <div className="h-px bg-slate-50 my-1" />

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { handleSignOut(); setShowUserDropdown(false); }}
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
      </header>

      <main
        className={cn(
          'relative z-10 flex-1 md:pb-12',
          hideParentBottomNav ? 'pb-12' : 'pb-[calc(8rem+env(safe-area-inset-bottom))]'
        )}
      >
        <Container className="max-w-6xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
          {/* Mobile Title View */}
          <div className="md:hidden mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <h1 className="text-2xl font-black tracking-tight text-slate-950">{getTitle(pathname)}</h1>
            </div>
          </div>

          {showProfileNudge ? (
            <section className="mb-6 overflow-hidden rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-xl shadow-amber-900/5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Priority Action Required</p>
                  </div>
                  <p className="text-base font-black text-slate-900 tracking-tight">
                    Complete your profile to unlock faster admissions.
                  </p>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    You are {profileNudge?.completionPct ?? 0}% ready. Centres are <span className="font-bold text-slate-900">3x more likely</span> to respond to complete profiles.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="h-10 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-500" asChild>
                      <Link href="/parent/profile">Finish Profile</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="h-10 rounded-2xl border-amber-200 bg-white text-amber-700 font-bold" asChild>
                      <Link href="/parent/profile/documents">Upload IDs</Link>
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setHideProfileNudge(true)}
                  className="h-8 w-8 rounded-full text-amber-700 hover:bg-amber-100"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </section>
          ) : null}

          <div className="parent-page-content">{children}</div>
        </Container>
      </main>

      {showProfilePrompt ? (
        <section className="fixed inset-x-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[70] rounded-3xl border border-teal-200 bg-white/95 p-4 shadow-[var(--shadow-elevation-3)] md:inset-x-auto md:bottom-6 md:right-6 md:w-[360px]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Quick boost</p>
          <p className="mt-1 text-sm font-bold text-slate-900">Complete your profile for faster responses.</p>
          <p className="mt-1 text-xs text-slate-600">
            You are {profileNudge?.completionPct ?? 0}% ready. Add missing info to help crèches review quicker.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="h-9 rounded-2xl bg-teal-600 text-white hover:bg-teal-500" asChild>
              <Link
                href="/parent/profile"
                onClick={() => {
                  setShowProfilePrompt(false)
                }}
              >
                Complete profile
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-2xl border-slate-200 bg-white text-slate-700"
              onClick={() => setShowProfilePrompt(false)}
            >
              Remind me later
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
