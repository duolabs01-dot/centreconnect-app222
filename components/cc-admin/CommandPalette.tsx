'use client'

import React, { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShieldCheck, 
  CreditCard, 
  Users, 
  BarChart3, 
  LifeBuoy,
  Search,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => setOpen(false)}
        />
      )}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Palette"
        className="animate-fade-in fixed left-1/2 top-[20%] z-[60] w-full max-w-[640px] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 text-white shadow-[var(--shadow-elevation-4)] backdrop-blur-xl"
      >
        <div className="flex items-center border-b border-white/5 px-4 py-3">
          <Search className="mr-3 h-4 w-4 text-slate-400" />
          <Command.Input
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 sm:inline-block">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="px-4 py-6 text-center text-xs text-slate-500">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <Item onSelect={() => runCommand(() => router.push('/admin/command'))}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Command
            </Item>
            <Item onSelect={() => runCommand(() => router.push('/admin/tenants'))}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Centres
            </Item>
            <Item onSelect={() => runCommand(() => router.push('/admin/revenue'))}>
              <CreditCard className="mr-2 h-4 w-4" /> Revenue
            </Item>
            <Item onSelect={() => runCommand(() => router.push('/admin/users'))}>
              <Users className="mr-2 h-4 w-4" /> Operatives
            </Item>
          </Command.Group>

          <Command.Separator className="my-2 h-px bg-white/5" />

          <Command.Group heading="Protocols" className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <Item onSelect={() => runCommand(() => router.push('/admin/analytics'))}>
              <BarChart3 className="mr-2 h-4 w-4" /> Neural Map
            </Item>
            <Item onSelect={() => runCommand(() => router.push('/admin/support'))}>
              <LifeBuoy className="mr-2 h-4 w-4" /> Relay Support
            </Item>
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between border-t border-white/5 bg-white/2 px-4 py-3 text-[10px] text-slate-500">
          <div className="flex gap-3">
            <span><kbd className="rounded bg-white/5 px-1 py-0.5 mr-1 font-bold">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded bg-white/5 px-1 py-0.5 mr-1 font-bold">↵</kbd> Select</span>
          </div>
          <span className="font-orbitron tracking-tighter text-cyber-cyan opacity-50">CC_COMMAND_V1</span>
        </div>
      </Command.Dialog>

      <style jsx global>{`
        [cmdk-group-heading] {
          margin-bottom: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: var(--radius-sm); }
      `}</style>
    </>
  )
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-xs font-medium text-slate-300 transition-colors aria-selected:bg-white/10 aria-selected:text-white aria-selected:shadow-[var(--shadow-elevation-3)]"
    >
      {children}
    </Command.Item>
  )
}


