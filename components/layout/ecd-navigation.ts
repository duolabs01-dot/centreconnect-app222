import {
  Bot,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  Globe,
  LayoutDashboard,
  MessageCircleMore,
  Megaphone,
  MessageSquare,
  Receipt,
  Settings2,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
  Briefcase,
  ShieldAlert,
  Users,
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
  comingSoon?: boolean
  adminOnly?: boolean
  supervisorAllowed?: boolean
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  { href: '/ecd/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/pickup', label: 'Pickup Verification', icon: ShieldCheck, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/children/new', label: 'Children', icon: Users, group: 'daily_operations', supervisorAllowed: true },
  { href: '/ecd/applications', label: 'Applications', icon: ClipboardList, group: 'admissions', supervisorAllowed: true },
  { href: '/ecd/billing', label: 'Billing & Payments', icon: CreditCard, group: 'finance', adminOnly: true },
  { href: '/ecd/communications', label: 'Messages', icon: MessageSquare, group: 'communication', supervisorAllowed: true },
  { href: '/ecd/announcements', label: 'Announcements', icon: Megaphone, group: 'communication', supervisorAllowed: true },
  { href: '/ecd/calendar', label: 'Calendar', icon: CalendarDays, group: 'communication', supervisorAllowed: true },
  { href: '/ecd/compliance', label: 'Compliance Documents', icon: ShieldAlert, group: 'compliance_team', supervisorAllowed: true },
  { href: '/ecd/employment', label: 'Staff & Employment', icon: Briefcase, group: 'compliance_team', supervisorAllowed: true },
  { href: '/ecd/website', label: 'Website', icon: Globe, group: 'growth_tools' },
  { href: '/ecd/marketplace', label: 'Marketplace', icon: Store, group: 'growth_tools', adminOnly: true },
  { href: '/ecd/report-cards', label: 'Report Cards', icon: FileText, group: 'coming_soon', comingSoon: true, supervisorAllowed: true },
  { href: '/ecd/parent-invoicing', label: 'Parent Invoicing', icon: Receipt, group: 'coming_soon', comingSoon: true, supervisorAllowed: true },
  { href: '/ecd/ai-upload', label: 'AI Document Upload', icon: Bot, group: 'coming_soon', comingSoon: true, supervisorAllowed: true },
  { href: '/ecd/whatsapp-alerts', label: 'WhatsApp Alerts', icon: MessageCircleMore, group: 'coming_soon', comingSoon: true, supervisorAllowed: true },
  { href: '/ecd/dsd-export', label: 'DSD Subsidy Export', icon: Download, group: 'coming_soon', comingSoon: true, supervisorAllowed: true },
  { href: '/ecd/transport', label: 'Transport Management', icon: Truck, group: 'coming_soon', comingSoon: true, supervisorAllowed: true },
  { href: '/ecd/profile', label: 'Settings', icon: Settings2, group: 'settings' },
]
