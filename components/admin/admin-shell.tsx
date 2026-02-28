'use client'

import React from 'react'
import { AdminSidebar } from './admin-sidebar'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  children: React.ReactNode
  className?: string
}

export function AdminShell({ children, className }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-[#04070D] text-slate-200 selection:bg-cyan-500/30">
      {/* Sidebar - Fixed on desktop, Bottom nav on mobile */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-500",
        "pb-24 md:pb-0 md:pl-72", // Space for mobile nav and desktop sidebar (72px width)
        className
      )}>
        {/* Top subtle glow for futuristic feel */}
        <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-[60]" />
        
        <div className="flex-1 px-4 py-8 md:px-12 md:py-16">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
