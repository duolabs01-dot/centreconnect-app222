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
    <div className="flex min-h-screen bg-[#0B0E14] text-slate-200">
      {/* Sidebar - Persistent on desktop, bottom nav on mobile */}
      <AdminSidebar />

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        "pb-20 md:pb-0 md:pl-64", // Space for mobile bottom nav and desktop sidebar
        className
      )}>
        <div className="flex-1 px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
