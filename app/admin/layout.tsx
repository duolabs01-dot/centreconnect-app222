// ⚠️ CC SUPER ADMIN ONLY
// Allowed imports: components/cc-admin/* + components/ui/*
// NEVER import from components/ecd/*

import './admin-theme.css'
import type { ReactNode } from 'react'
import { CommandPalette } from '@/components/cc-admin/CommandPalette'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell min-h-screen bg-slate-950 text-slate-100">
      <CommandPalette />
      {children}
    </div>
  )
}
