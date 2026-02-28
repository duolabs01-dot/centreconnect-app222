// components/cc-admin/DashboardShell.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Container } from '@/components/cc-admin/Container'
import { CyberSidebar } from './CyberSidebar'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'

type NavItem = {
  href: string
  label: string
}

type DashboardShellProps = {
  title: string
  description: string
  roleLabel: string
  userEmail: string
  navItems?: NavItem[]
  hideSidebar?: boolean
  wide?: boolean
  children: React.ReactNode
}

export function DashboardShell({
  title,
  description,
  roleLabel,
  userEmail,
  hideSidebar = false,
  wide = false,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const showSidebar = !hideSidebar

  return (
    <div className="admin-shell admin-theme min-h-screen flex overflow-hidden bg-admin-bg text-admin-text">
      {/* Sidebar - Desktop */}
      {showSidebar && (
        <div className="hidden lg:block">
          <CyberSidebar userEmail={userEmail} />
        </div>
      )}

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {showSidebar && sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <CyberSidebar userEmail={userEmail} onSelect={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-admin-border bg-admin-bg/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-30">
          <div className="flex items-center gap-4">
            {showSidebar && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-admin-text-muted hover:text-admin-text transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-admin-text tracking-widest uppercase">
                {title}
              </h2>
              <p className="text-[10px] text-admin-text-muted font-bold uppercase tracking-wider">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-admin-accent uppercase tracking-widest">
                {roleLabel}
              </span>
              <span className="text-[9px] text-admin-text-muted font-mono">
                SECURE_NODE_0V2
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-admin-accent-glow border border-admin-accent/20 flex items-center justify-center text-xs font-bold text-admin-accent">
              {userEmail[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Container className={cn("px-6 py-6", wide ? "max-w-none" : "")}>
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {children}
            </motion.div>
          </Container>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2A2A3A;
          border-radius: var(--radius-sm);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #F59E0B;
        }
      `}</style>
    </div>
  )
}
