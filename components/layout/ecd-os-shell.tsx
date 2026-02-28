import type { EcdNavItem } from './ecd-navigation'

type EcdOsShellProps = {
  title: string
  description: string
  roleLabel: string
  userEmail: string
  navItems?: EcdNavItem[]
  children: React.ReactNode
}

export function EcdOsShell({ children }: EcdOsShellProps) {
  return (
    <div className="ecd-page-shell min-h-screen bg-[#F8FAFC] text-slate-900">{children}</div>
  )
}
