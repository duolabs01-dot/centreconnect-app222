'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MobileNavMenu } from './mobile-nav-menu'
import { Search, Building2, LogIn } from 'lucide-react'

type PublicShellProps = {
  children: React.ReactNode
}

const publicNavItems = [
  { href: '/directory', label: 'Find a Centre', icon: Search },
  { href: '/for-centres', label: 'For ECDs', icon: Building2 },
  { href: '/login', label: 'Sign In', icon: LogIn },
]

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Premium Sticky Glass Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <MobileNavMenu 
              items={publicNavItems} 
              type="public"
            />
            <Link href="/" className="flex items-center gap-1.5">
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">CentreConnect</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1" />
            </Link>
          </div>
          
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Find a Centre</Link>
            <Link href="/for-centres" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">For ECDs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="default" className="font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-full px-6" asChild>
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="animate-in fade-in duration-500">
        {children}
      </div>
    </div>
  )
}
