import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type EcdNavItem = {
  href: string
  label: string
  icon: LucideIcon
  group?:
  | 'daily_operations'
  | 'admissions'
  | 'finance'
  | 'communication'
  | 'compliance_team'
  | 'growth_tools'
  | 'coming_soon'
  | 'settings'
  | 'admin'
  comingSoon?: boolean
  adminOnly?: boolean
  supervisorAllowed?: boolean
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  { href: '/ecd/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/pickup', label: 'Pickup Verification', icon: ShieldCheck, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/daily-reports', label: 'Daily Reports', icon: Zap, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/children', label: 'Children', icon: Users, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/applications', label: 'Applications', icon: ClipboardList, group: 'admissions', supervisorAllowed: true },
  { href: '/ecd/billing', label: 'Billing & Payments', icon: CreditCard, group: 'finance', adminOnly: true },
  { href: '/ecd/profile', label: 'Settings', icon: Settings2, group: 'settings' },
]

