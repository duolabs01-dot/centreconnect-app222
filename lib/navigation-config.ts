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
  Heart,
} from 'lucide-react'
import { type NavItem } from '@/components/layout/bottom-nav'

export const PARENT_NAV_ITEMS: NavItem[] = [
  { href: '/parent/dashboard', label: 'Home', icon: Home },
  { href: '/directory', label: 'Search', icon: Search },
  { href: '/parent/saved', label: 'Saved', icon: Heart },
  { href: '/parent/applications', label: 'Applications', icon: ClipboardList },
  { href: '/parent/profile', label: 'Profile', icon: User },
]

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
