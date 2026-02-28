export type AdminNavItem = { href: string; label: string }

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Overview', href: '/admin/dashboard' },
  { label: 'ECD Network', href: '/admin/tenants' },
  { label: 'Directory', href: '/admin/users' },
  { label: 'Revenue Ops', href: '/admin/revenue' },
  { label: 'Platform Stats', href: '/admin/analytics' },
  { label: 'Command Tower', href: '/admin/command' },
  { label: 'Support', href: '/admin/support' },
]
