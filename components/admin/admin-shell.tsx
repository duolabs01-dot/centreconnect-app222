'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './admin-sidebar'
import { cn } from '@/lib/utils'
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs'
import { AdminAudienceProvider } from '@/components/admin/admin-audience-context'
import { AdminAudienceToggle } from '@/components/admin/admin-audience-toggle'
import { getBreadcrumbClassName, shouldShowBreadcrumbs } from '@/lib/navigation/breadcrumb-visibility'

interface AdminShellProps {
  children: React.ReactNode
  className?: string
}

export function AdminShell({ children, className }: AdminShellProps) {
  const pathname = usePathname()
  const showBreadcrumbs = shouldShowBreadcrumbs(pathname, 'admin')

  return (
    <AdminAudienceProvider>
      <div className="flex min-h-screen bg-[var(--cyber-bg)] text-slate-200 selection:bg-cyan-500/30">
        <AdminSidebar />

        <main
          className={cn(
            'flex-1 flex flex-col min-w-0 transition-all duration-500',
            'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-72',
            className
          )}
        >
          <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-[60]" />

          <div className="flex-1 mt-16 px-4 py-6 sm:px-6 sm:py-8 md:mt-0 lg:px-8 lg:py-10 xl:px-10">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {showBreadcrumbs ? (
                  <AppBreadcrumbs
                    rootHref="/admin/hq"
                    rootLabel="Admin"
                    tone="dark"
                    className={getBreadcrumbClassName('admin')}
                  />
                ) : null}
                <AdminAudienceToggle />
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </AdminAudienceProvider>
  )
}
