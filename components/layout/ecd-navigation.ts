import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  Globe,
  MessagesSquare,
  FileText,
  LineChart,
  FileCheck,
  ListChecks,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import type { InternalTier } from '@/lib/billing/plans'

export type EcdNavItem = Record<'href', string> & {
  label: string
  icon: LucideIcon
  group?: 'daily_ops' | 'admin' | 'grow' | 'settings'
  comingSoon?: boolean
  adminOnly?: boolean
  supervisorAllowed?: boolean
  minTier?: InternalTier
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  // DAILY OPS
  { href: '/ecd/dashboard',     label: 'Home',          icon: LayoutDashboard, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/children',      label: 'Children',      icon: Users,           group: 'daily_ops', supervisorAllowed: true },
  // Starter: attendance (current month), applications (3 free), DOE (1/quarter banner)
  // Pages handle their own tier limits — no nav lock needed for these three
  { href: '/ecd/attendance',    label: 'Attendance',    icon: UserCheck,       group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/daily-reports', label: 'Daily Reports', icon: FileText,        group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/report-cards',  label: 'Report Cards',  icon: BookOpen,        group: 'daily_ops', supervisorAllowed: true, minTier: 'standard' },
  { href: '/ecd/calendar',      label: 'Calendar',      icon: CalendarDays,    group: 'daily_ops', supervisorAllowed: true, minTier: 'standard' },

  // MANAGEMENT
  { href: '/ecd/applications',  label: 'Admissions',    icon: ClipboardList,   group: 'admin',     supervisorAllowed: true },
  { href: '/ecd/communications',label: 'Messages',      icon: MessagesSquare,  group: 'admin',     supervisorAllowed: true },
  { href: '/ecd/dsd-export',    label: 'DOE Report',    icon: FileCheck,       group: 'admin',     supervisorAllowed: true },
  { href: '/ecd/compliance',    label: 'Compliance',    icon: ShieldCheck,     group: 'admin',     adminOnly: true },

  // GROW
  { href: '/ecd/financials',    label: 'Financials',    icon: LineChart,       group: 'grow',      adminOnly: true,  minTier: 'standard' },
  { href: '/ecd/website',       label: 'Website',       icon: Globe,           group: 'grow',      adminOnly: true,  minTier: 'premium' },

  // ACCOUNT
  { href: '/ecd/billing',       label: 'Billing',       icon: CreditCard,      group: 'settings',  adminOnly: true },
  { href: '/ecd/profile',       label: 'Settings',      icon: Settings2,       group: 'settings',  adminOnly: true },
]
