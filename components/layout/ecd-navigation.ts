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
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react'

export type EcdNavItem = {
  href: string
  label: string
  icon: LucideIcon
  group?: 'daily' | 'operations' | 'growth' | 'admin'
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  { href: '/ecd/dashboard', label: 'Today', icon: LayoutDashboard, group: 'daily' },
  { href: '/ecd/applications', label: 'Applications', icon: ClipboardList, group: 'daily' },
  { href: '/ecd/pipeline', label: 'Pipeline', icon: GitFork, group: 'daily' },
  { href: '/ecd/billing', label: 'Billing', icon: CreditCard, group: 'daily' },
  { href: '/ecd/profile', label: 'Settings', icon: Settings2, group: 'daily' },
  { href: '/ecd/communications', label: 'Messages', icon: MessageSquare, group: 'operations' },
  { href: '/ecd/calendar', label: 'Calendar', icon: CalendarDays, group: 'operations' },
  { href: '/ecd/transport', label: 'Transport', icon: Truck, group: 'operations' },
  { href: '/ecd/announcements', label: 'Announcements', icon: Megaphone, group: 'operations' },
  { href: '/ecd/website', label: 'Website', icon: Globe, group: 'growth' },
  { href: '/ecd/marketplace', label: 'Marketplace', icon: Store, group: 'growth' },
  { href: '/ecd/employment', label: 'Employment', icon: Briefcase, group: 'growth' },
  { href: '/ecd/support', label: 'Support', icon: LifeBuoy, group: 'admin' },
]
