export type AdminNavItem = { href: string; label: string }

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Overview', href: '/admin/dashboard' },
  { label: 'Centres', href: '/admin/tenants' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Revenue', href: '/admin/revenue' },
  { label: 'Parent Reliability', href: '/admin/parent-reliability' },
  { label: 'Analytics', href: '/admin/analytics' },
  { label: 'Command Tower', href: '/admin/command' },
  { label: 'Support', href: '/admin/support' },
]
