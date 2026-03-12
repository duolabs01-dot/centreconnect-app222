export type AdminNavItem = {
  href: string
  label: string
}

export type AdminNavSection = {
  id: 'home' | 'operations' | 'finance' | 'system'
  label: string
  items: AdminNavItem[]
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'home',
    label: 'Start here',
    items: [
      { label: 'Company HQ', href: '/admin/hq' },
      { label: 'Home Dashboard', href: '/admin/dashboard' },
      { label: 'Centres', href: '/admin/tenants' },
      { label: 'Support', href: '/admin/support' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { label: 'Users', href: '/admin/users' },
      { label: 'Invites', href: '/admin/invites' },
      { label: 'Parent Reliability', href: '/admin/parent-reliability' },
      { label: 'Analytics', href: '/admin/analytics' },
    ],
  },
  {
    id: 'finance',
    label: 'Revenue',
    items: [
      { label: 'Revenue', href: '/admin/revenue' },
      { label: 'Operations Queue', href: '/admin/command' },
    ],
  },
  {
    id: 'system',
    label: 'System & AI',
    items: [
      { label: 'AI Company OS', href: '/admin/ai-os' },
      { label: 'OpenClaw Ops', href: '/admin/openclaw' },
      { label: 'Webhook Failures', href: '/admin/webhook-failures' },
      { label: 'Audit Trail', href: '/admin/audit-trail' },
      { label: 'Payment Runbook', href: '/admin/runbooks/payment-incidents' },
    ],
  },
]

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap((section) => section.items)

export const ADMIN_TASK_ROUTER: Array<{ task: string; href: string; label: string }> = [
  { task: 'Onboard a centre', href: '/admin/tenants', label: 'Open Centres' },
  { task: 'Fix a parent issue', href: '/admin/parent-reliability', label: 'Open Parent Reliability' },
  { task: 'Handle support tickets', href: '/admin/support', label: 'Open Support' },
  { task: 'Check revenue status', href: '/admin/revenue', label: 'Open Revenue' },
  { task: 'Review AI founder brief', href: '/admin/ai-os', label: 'Open AI Company OS' },
  { task: 'Check automation runtime', href: '/admin/openclaw', label: 'Open OpenClaw Ops' },
]