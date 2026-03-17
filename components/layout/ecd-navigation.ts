import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
  Globe,
  MessagesSquare,
  FileText,
  LineChart,
  FileCheck,
  Briefcase,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import type { InternalTier } from '@/lib/billing/plans'

export type EcdNavItem = {
  href: string
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
  { href: '/ecd/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/pickup', label: 'Pickup', icon: ShieldCheck, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/daily-reports', label: 'Daily Reports', icon: Zap, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/calendar', label: 'Calendar', icon: CalendarDays, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/team-plans', label: 'Staff Plan', icon: ListChecks, group: 'daily_ops', supervisorAllowed: true },

  // PEOPLE & RECORDS
  { href: '/ecd/children', label: 'Children', icon: Users, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/employment', label: 'Employment', icon: Briefcase, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/dsd-export', label: 'DOE Report', icon: FileCheck, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/billing', label: 'Billing', icon: CreditCard, group: 'admin', adminOnly: true },
  { href: '/ecd/financials', label: 'Financials', icon: LineChart, group: 'admin', adminOnly: true, minTier: 'standard' },
  { href: '/ecd/compliance', label: 'Compliance', icon: FileText, group: 'admin', adminOnly: true, minTier: 'standard' },
  { href: '/ecd/report-cards', label: 'Report Cards', icon: FileText, group: 'admin', supervisorAllowed: true, minTier: 'standard' },

  // ADMISSIONS & GROWTH
  { href: '/ecd/applications', label: 'Admissions', icon: ClipboardList, group: 'grow', supervisorAllowed: true },
  { href: '/ecd/communications', label: 'Messages', icon: MessagesSquare, group: 'grow', supervisorAllowed: true },
  { href: '/ecd/website', label: 'Website', icon: Globe, group: 'grow', adminOnly: true, minTier: 'standard' },

  // SETTINGS
  { href: '/ecd/profile', label: 'Settings', icon: Settings2, group: 'settings' },
]
