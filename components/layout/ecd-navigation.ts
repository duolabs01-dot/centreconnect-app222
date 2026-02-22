export type EcdNavItem = {
  href: string
  label: string
  group?: 'daily' | 'operations' | 'growth' | 'admin'
}

export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  { href: '/ecd/dashboard', label: 'Today', group: 'daily' },
  { href: '/ecd/applications', label: 'Applications', group: 'daily' },
  { href: '/ecd/pipeline', label: 'Children Journey (Pipeline)', group: 'daily' },
  { href: '/ecd/billing', label: 'Billing', group: 'daily' },
  { href: '/ecd/profile', label: 'Settings', group: 'daily' },
  { href: '/ecd/communications', label: 'Messages', group: 'operations' },
  { href: '/ecd/calendar', label: 'Calendar', group: 'operations' },
  { href: '/ecd/transport', label: 'Transport', group: 'operations' },
  { href: '/ecd/announcements', label: 'Announcements', group: 'operations' },
  { href: '/ecd/website', label: 'Website', group: 'growth' },
  { href: '/ecd/marketplace', label: 'Marketplace', group: 'growth' },
  { href: '/ecd/employment', label: 'Employment', group: 'growth' },
  { href: '/ecd/support', label: 'Support', group: 'admin' },
]
