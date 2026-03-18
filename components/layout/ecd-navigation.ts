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
  // 1 — HOME
  { href: '/ecd/dashboard',     label: 'Home',       icon: LayoutDashboard, group: 'daily_ops', supervisorAllowed: true },

  // 2 — CHILDREN (replaces Children + DOE Report + Report Cards)
  { href: '/ecd/children',      label: 'Children',   icon: Users,           group: 'daily_ops', supervisorAllowed: true },

  // 3 — ATTENDANCE (replaces Attendance + Pickup as primary; pickup accessible from attendance)
  { href: '/ecd/attendance',    label: 'Attendance', icon: UserCheck,       group: 'daily_ops', supervisorAllowed: true },

  // 4 — REPORTS (replaces Daily Reports + Report Cards)
  { href: '/ecd/daily-reports', label: 'Reports',    icon: Zap,             group: 'daily_ops', supervisorAllowed: true },

  // 5 — ADMISSIONS (replaces Applications/Pipeline + Messages)
  { href: '/ecd/applications',  label: 'Admissions', icon: ClipboardList,   group: 'grow',      supervisorAllowed: true },

  // 6 — MESSAGES
  { href: '/ecd/communications',label: 'Messages',   icon: MessagesSquare,  group: 'grow',      supervisorAllowed: true },

  // 7 — ADMIN (replaces Employment + Billing + Financials + Compliance + Calendar + Website)
  { href: '/ecd/profile',       label: 'Admin',      icon: Settings2,       group: 'settings',  adminOnly: true },

  // 8 — DOE EXPORT (highly visible for compliance — keep top-level)
  { href: '/ecd/dsd-export',    label: 'DOE Export', icon: FileCheck,       group: 'admin',     supervisorAllowed: true },
]


