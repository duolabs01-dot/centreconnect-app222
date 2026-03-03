// ⚠️ CC SUPER ADMIN ONLY
// Allowed imports: components/admin/* + components/cc-admin/* + components/ui/*
// NEVER import from components/ecd/*

import './admin-theme.css'
import type { ReactNode } from 'react'
import { CommandPalette } from '@/components/cc-admin/CommandPalette'
import { AdminShell } from '@/components/admin/admin-shell'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-root platform-admin-dark-theme min-h-screen bg-[#04070D] text-slate-100">
      <CommandPalette />
      <AdminShell>
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      </AdminShell>
    </div>
  )
}
