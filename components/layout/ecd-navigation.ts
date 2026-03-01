import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GitFork,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  TrendingUp,
  UserCheck,
  ClipboardCheck, // For Daily Reports
  FileText, // For Report Cards
  Receipt, // For Parent Invoicing
  Bot, // For AI Upload
  MessageCircleMore, // For WhatsApp Alerts
  Download, // For DSD Export
  type LucideIcon,
} from 'lucide-react'

export type EcdNavItem = {
  href: string
  label: string
  icon: LucideIcon
  group?: 'daily' | 'operations' | 'growth' | 'admin'
  adminOnly?: boolean
  supervisorAllowed?: boolean
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  { href: '/ecd/dashboard', label: 'Today', icon: LayoutDashboard, group: 'daily', supervisorAllowed: true },
  { href: '/ecd/applications', label: 'Applications', icon: ClipboardList, group: 'daily', supervisorAllowed: true },
  { href: '/ecd/pipeline', label: 'Pipeline', icon: GitFork, group: 'daily', supervisorAllowed: true },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck, group: 'daily', supervisorAllowed: true },
  { href: '/ecd/daily-reports', label: 'Daily Reports', icon: ClipboardCheck, group: 'daily', supervisorAllowed: true },
  { href: '/ecd/pickup', label: 'Pickup Verify', icon: ShieldCheck, group: 'daily', supervisorAllowed: true },
  { href: '/ecd/billing', label: 'Billing', icon: CreditCard, group: 'daily', adminOnly: true },
  { href: '/ecd/profile', label: 'Settings', icon: Settings2, group: 'daily' },
  { href: '/ecd/report-cards', label: 'Report Cards', icon: FileText, group: 'operations', supervisorAllowed: true }, // New
  { href: '/ecd/parent-invoicing', label: 'Parent Invoicing', icon: Receipt, group: 'operations', supervisorAllowed: true }, // New
  { href: '/ecd/communications', label: 'Messages', icon: MessageSquare, group: 'operations', supervisorAllowed: true },
  { href: '/ecd/calendar', label: 'Calendar', icon: CalendarDays, group: 'operations', supervisorAllowed: true },
  { href: '/ecd/transport', label: 'Transport', icon: Truck, group: 'operations', supervisorAllowed: true },
  { href: '/ecd/announcements', label: 'Announcements', icon: Megaphone, group: 'operations', supervisorAllowed: true },
  { href: '/ecd/website', label: 'Website', icon: Globe, group: 'growth' },
  { href: '/ecd/marketplace', label: 'Marketplace', icon: Store, group: 'growth', adminOnly: true },
  { href: '/ecd/employment', label: 'Employment', icon: Briefcase, group: 'growth', supervisorAllowed: true },
  { href: '/ecd/ai-upload', label: 'AI Upload', icon: Bot, group: 'admin', supervisorAllowed: true }, // New
  { href: '/ecd/whatsapp-alerts', label: 'WhatsApp Alerts', icon: MessageCircleMore, group: 'admin', supervisorAllowed: true }, // New
  { href: '/ecd/dsd-export', label: 'DSD Export', icon: Download, group: 'admin', supervisorAllowed: true }, // New
  { href: '/ecd/financials', label: 'Financials', icon: TrendingUp, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/compliance', label: 'Compliance', icon: ShieldAlert, group: 'admin', supervisorAllowed: true },
  { href: '/ecd/support', label: 'Support', icon: LifeBuoy, group: 'admin', supervisorAllowed: true },
]
