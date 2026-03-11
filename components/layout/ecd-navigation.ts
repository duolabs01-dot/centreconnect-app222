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
  type LucideIcon,
} from 'lucide-react'

export type EcdNavItem = {
  href: string
  label: string
  icon: LucideIcon
  group?: 'daily_ops' | 'admin' | 'grow' | 'settings'
  comingSoon?: boolean
  adminOnly?: boolean
  supervisorAllowed?: boolean
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  // DAILY OPS
  { href: '/ecd/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/pickup', label: 'Pickup Verification', icon: ShieldCheck, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/daily-reports', label: 'Daily Reports', icon: Zap, group: 'daily_ops', supervisorAllowed: true },
  { href: '/ecd/calendar', label: 'Calendar', icon: CalendarDays, group: 'daily_ops', supervisorAllowed: true },

  // ADMIN
  { href: '/ecd/children', label: 'Children', icon: Users, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/billing', label: 'Billing & Payments', icon: CreditCard, group: 'admin', adminOnly: true },
  { href: '/ecd/financials', label: 'Financials', icon: LineChart, group: 'admin', adminOnly: true },
  { href: '/ecd/compliance', label: 'Compliance', icon: FileText, group: 'admin', adminOnly: true },
  { href: '/ecd/report-cards', label: 'Report Cards', icon: FileText, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/dsd-export', label: 'DSD Export', icon: FileText, group: 'admin', adminOnly: true, comingSoon: true },

  // GROW
  { href: '/ecd/website', label: 'Website Builder', icon: Globe, group: 'grow', adminOnly: true },
  { href: '/ecd/applications', label: 'Admissions', icon: ClipboardList, group: 'grow', supervisorAllowed: true },
  { href: '/ecd/communications', label: 'Parent Comms', icon: MessagesSquare, group: 'grow', supervisorAllowed: true },
  { href: '/ecd/whatsapp-alerts', label: 'WhatsApp Alerts', icon: Zap, group: 'grow', adminOnly: true },

  // SETTINGS
  { href: '/ecd/profile', label: 'Settings', icon: Settings2, group: 'settings' },
]
