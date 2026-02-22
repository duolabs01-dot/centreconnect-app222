export type AdminNavItem = { href: string; label: string }

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin/command', label: 'Control Tower' },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/revenue', label: 'Revenue' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/support', label: 'Support' },
]
