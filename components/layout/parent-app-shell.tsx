'use client'

import { useRef, useState, type TouchEvent, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Container } from '@/components/layout/container'
import { BrandMark } from '@/components/ecd/BrandMark'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BadgeCheck, Home, Search, ClipboardList, User, LogOut, ChevronDown, Sparkles } from 'lucide-react'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { LiteImage } from '@/components/ui/LiteImage'
import { BottomNav, type NavItem } from './bottom-nav'
import { createClient } from '@/lib/supabase/client'
import { useParentLayout } from './parent-layout-provider'

type ParentAppShellProps = {
  children: React.ReactNode
}

const navItems: NavItem[] = [
  { href: '/parent/dashboard', label: 'Home', icon: Home },
  { href: '/directory', label: 'Search', icon: Search },
  { href: '/parent/applications', label: 'Applications', icon: ClipboardList },
  { href: '/parent/profile', label: 'Profile', icon: User },
]

function getTitle(pathname: string) {
  if (pathname.startsWith('/parent/applications')) return 'My Applications'
  if (pathname.startsWith('/parent/support')) return 'Support'
  if (pathname.startsWith('/parent/preferences')) return 'Preferences'
  if (pathname.startsWith('/parent/profile/security')) return 'Security'
  if (pathname.startsWith('/parent/profile/documents')) return 'Vault'
  if (pathname.startsWith('/parent/profile')) return 'Profile'
  if (pathname.startsWith('/parent/children')) return 'Children'
  if (pathname.startsWith('/parent/notifications')) return 'Inbox'
  return 'Home'
}

function getBackFallback(pathname: string) {
  if (pathname.startsWith('/directory')) return '/directory'
  if (pathname.startsWith('/parent')) return '/parent/dashboard'
  return '/'
}

function shouldShowMobileBack(pathname: string) {
  const topLevelTabs = new Set(['/directory', '/parent/dashboard', '/parent/applications', '/parent/profile'])
  if (topLevelTabs.has(pathname)) return false
  return true
}

export function ParentAppShell({ children }: ParentAppShellProps) {
  const { userName, avatarUrl, isVerified, profileNudge } = useParentLayout()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  useAppNavLock()
  
  const [pullDistance, setPullDistance] = useState(0)
  const [hideProfileNudge, setHideProfileNudge] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
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
    router.prefetch('/directory')
    router.prefetch('/parent/dashboard')
  }, [router])

  async function handleSignOut() {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const showMobileBack = shouldShowMobileBack(pathname)
  const showProfileNudge = Boolean(profileNudge && !hideProfileNudge && !pathname.startsWith('/parent/profile'))

  return (
    <div
      data-parent-theme="true"
      className="min-h-screen bg-white font-sans text-slate-950"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Premium Background Illustration */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03]">
        <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-cyan-500 blur-[120px]" />
        <div className="absolute -right-20 top-1/2 h-[400px] w-[400px] rounded-full bg-teal-500 blur-[100px]" />
      </div>

      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto w-fit rounded-full border border-cyan-200/70 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-xl backdrop-blur transition-opacity',
          pullDistance > 8 ? 'opacity-100' : 'opacity-0'
        )}
      >
        {pullDistance >= 90 ? 'Release to refresh' : 'Pull to refresh'}
      </div>

      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-4">
            {showMobileBack ? (
              <button
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 transition-all md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            
            <BrandMark href="/parent/dashboard" compact className="shrink-0" />
            
            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {navItems.map((item) => {
                const isActive = item.href === '/parent/dashboard'
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                      isActive 
                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20" 
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Social-media style sign out / User menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 pl-3 rounded-full border border-slate-200 bg-white hover:border-cyan-300 hover:shadow-md transition-all group"
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
              </button>

              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl animate-in zoom-in-95 duration-100 z-10">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Operative</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-bold text-slate-900">{userName}</p>
                        {isVerified && <BadgeCheck className="h-4 w-4 text-cyan-500 fill-cyan-50" />}
                      </div>
                    </div>
                    <Link href="/parent/profile" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                      <User className="h-4 w-4" />
                      Manage Profile
                    </Link>
                    <button 
                      onClick={() => { handleSignOut(); setShowUserDropdown(false); }}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {isSigningOut ? 'Ending Session...' : 'Sign Out'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 pb-28 md:pb-12">
        <Container className="max-w-4xl px-4 pt-6 sm:px-6">
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
                    <Button size="sm" className="h-10 rounded-xl bg-slate-900 text-white font-bold" asChild>
                      <Link href="/parent/profile">Finish Profile</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="h-10 rounded-xl border-amber-200 bg-white text-amber-700 font-bold" asChild>
                      <Link href="/parent/profile/documents">Upload IDs</Link>
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHideProfileNudge(true)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors text-amber-700"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </section>
          ) : null}

          <div className="parent-page-content animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</div>
        </Container>
      </main>

      <BottomNav items={navItems} />
    </div>
  )
}
