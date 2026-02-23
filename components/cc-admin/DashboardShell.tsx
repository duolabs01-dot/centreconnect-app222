// components/cc-admin/DashboardShell.tsx
'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Container } from '@/components/cc-admin/Container'
import { CyberSidebar } from './CyberSidebar'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

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
  navItems = [],
  hideSidebar = false,
  wide = false,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const showSidebar = !hideSidebar

  return (
    <div className="admin-shell min-h-screen flex overflow-hidden">
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
              <CyberSidebar userEmail={userEmail} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-cyber-bg/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-30">
          <div className="flex items-center gap-4">
            {showSidebar && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-orbitron text-sm font-bold text-white tracking-widest uppercase">
                {title}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-cyber-cyan uppercase tracking-widest">
                {roleLabel}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                SECURE_NODE_0V2
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-cyan/20 to-cyber-violet/20 border border-white/10 flex items-center justify-center font-orbitron text-xs text-white">
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
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 242, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
