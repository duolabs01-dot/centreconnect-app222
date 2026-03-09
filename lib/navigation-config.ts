import {
  Home,
  Search,
  ClipboardList,
  User,
  UserCheck,
  LayoutDashboard,
  Building2,
  CreditCard,
  ShieldCheck,
  LifeBuoy,
} from 'lucide-react'
import { type NavItem } from '@/components/layout/bottom-nav'

export const PARENT_NAV_ITEMS: NavItem[] = [
  { href: '/parent/dashboard', label: 'Home', icon: Home },
  { href: '/directory', label: 'Discover', icon: Search },
  { href: '/parent/applications', label: 'Apply', icon: ClipboardList },
  { href: '/parent/profile', label: 'Profile', icon: User },
]

export const ECD_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/ecd/dashboard', label: 'Home', icon: Home },
  { href: '/ecd/applications', label: 'Admissions', icon: ClipboardList },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck },
  { href: '/ecd/profile', label: 'Profile', icon: User },
]

export const ADMIN_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Centres', icon: Building2 },
  { href: '/admin/revenue', label: 'Revenue', icon: CreditCard },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
]
