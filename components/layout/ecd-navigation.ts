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
  // HOME — all tiers
  { href: '/ecd/dashboard',     label: 'Home',       icon: LayoutDashboard, group: 'daily_ops', supervisorAllowed: true },

  // CHILDREN — all tiers
  { href: '/ecd/children',      label: 'Children',   icon: Users,           group: 'daily_ops', supervisorAllowed: true },

  // ATTENDANCE — STARTER gets this now (it's the core value — replaces paper registers)
  { href: '/ecd/attendance',    label: 'Attendance', icon: UserCheck,       group: 'daily_ops', supervisorAllowed: true },

  // REPORTS — Growth+ only (built on attendance data)
  { href: '/ecd/daily-reports', label: 'Reports',    icon: Zap,             group: 'daily_ops', supervisorAllowed: true, minTier: 'standard' },

  // ADMISSIONS — Growth+ only
  { href: '/ecd/applications',  label: 'Admissions', icon: ClipboardList,   group: 'grow',      supervisorAllowed: true, minTier: 'standard' },

  // MESSAGES — Growth+ only
  { href: '/ecd/communications', label: 'Messages',  icon: MessagesSquare,  group: 'grow',      supervisorAllowed: true, minTier: 'standard' },

  // SETTINGS — admin only (all tiers see settings, no tier gate)
  { href: '/ecd/profile',       label: 'Settings',   icon: Settings2,       group: 'settings',  adminOnly: true },

  // DOE EXPORT — Pro only (DOE compliance reporting is a premium feature)
  { href: '/ecd/dsd-export',   label: 'DOE Export', icon: FileCheck,       group: 'admin',     adminOnly: true, minTier: 'premium' },
]
