import {
  Home,
  ClipboardList,
  User,
  UserCheck,
  LayoutDashboard,
  Building2,
  CreditCard,
  ShieldCheck,
  LifeBuoy,
  Search,
  Bell,
  Sun,
  Inbox,
} from 'lucide-react'
import { type NavItem } from '@/components/layout/bottom-nav'

/** Bottom nav for parents before enrollment (discover + pending states) */
export const PARENT_NAV_ITEMS_PRE_ENROLLMENT: NavItem[] = [
  { href: '/parent/discover', label: 'Find', icon: Search },
  { href: '/parent/applications', label: 'Applied', icon: ClipboardList },
  { href: '/parent/notifications', label: 'Updates', icon: Bell },
  { href: '/parent/profile', label: 'Profile', icon: User },
]

/** Bottom nav for parents after enrollment (enrolled state) */
export const PARENT_NAV_ITEMS_ENROLLED: NavItem[] = [
  { href: '/parent/daily-reports', label: 'Today', icon: Sun },
  { href: '/parent/notifications', label: 'Inbox', icon: Inbox },
  { href: '/parent/children', label: 'Pickup', icon: ShieldCheck },
  { href: '/parent/profile', label: 'Profile', icon: User },
]

/** @deprecated Use PARENT_NAV_ITEMS_PRE_ENROLLMENT or PARENT_NAV_ITEMS_ENROLLED */
export const PARENT_NAV_ITEMS: NavItem[] = PARENT_NAV_ITEMS_PRE_ENROLLMENT

export const ECD_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/ecd/dashboard', label: 'Home', icon: Home },
  { href: '/ecd/applications', label: 'Admissions', icon: ClipboardList },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck },
  { href: '/ecd/profile', label: 'Profile', icon: User },
]

export const ADMIN_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Centres', icon: Building2 },
  { href: '/admin/revenue', label: 'Revenue', icon: CreditCard },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
]
