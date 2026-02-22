'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'
import { SignOutButton } from './SignOutButton'

type NavItem = {
  href: string
  label: string
}

type SidebarProps = {
  userEmail: string
  navItems: NavItem[]
  roleLabel: string
}

export function Sidebar({ userEmail, navItems, roleLabel }: SidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-slate-900 border-r border-white/10">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <BrandMark compact />
        <div>
          <p className="text-base font-bold text-white tracking-tight">{roleLabel}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Platform</p>
        </div>
      </div>

      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-1 mt-6">
        Navigation
      </p>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
              isActive(item.href)
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/6"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Signed in as</p>
          <p className="text-sm font-semibold text-white truncate">{userEmail}</p>
        </div>
        <SignOutButton redirectTo="/" className="w-full" />
      </div>
    </aside>
  )
}
