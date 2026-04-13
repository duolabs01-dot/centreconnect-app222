import {
  Bot,
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Terminal,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AdminNavItem = {
  href: string
  label: string
  icon?: LucideIcon
}

export type AdminNavSection = {
  id: 'core' | 'advanced'
  label: string
  items: AdminNavItem[]
}

/** Primary nav — 6 items covering 90% of daily use */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Centres', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/revenue', label: 'Revenue', icon: CreditCard },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/command', label: 'Command', icon: Terminal },
  { href: '/admin/ai-os', label: 'Founder Advisor', icon: Bot },
]

/** Advanced tools — accessible via Overview dashboard drill-down, not primary nav */
export const ADMIN_ADVANCED_ITEMS: AdminNavItem[] = [
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/invites', label: 'Invites' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/parent-reliability', label: 'Parent Reliability' },
  { href: '/admin/ai-os', label: 'Founder Advisor' },
  { href: '/admin/openclaw', label: 'OpenClaw Ops' },
  { href: '/admin/webhook-failures', label: 'Webhook Failures' },
  { href: '/admin/audit-trail', label: 'Audit Trail' },
  { href: '/admin/runbooks/payment-incidents', label: 'Payment Runbook' },
]

/**
 * Sections used by sidebar — now a single flat "core" section.
 * Advanced pages are linked from the Overview dashboard instead.
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'core',
    label: 'Navigation',
    items: ADMIN_NAV_ITEMS,
  },
]

export const ADMIN_TASK_ROUTER: Array<{ task: string; href: string; label: string }> = [
  { task: 'Onboard a centre', href: '/admin/tenants', label: 'Open Centres' },
  { task: 'Fix a parent issue', href: '/admin/parent-reliability', label: 'Open Parent Reliability' },
  { task: 'Handle support tickets', href: '/admin/support', label: 'Open Support' },
  { task: 'Check revenue status', href: '/admin/revenue', label: 'Open Revenue' },
  { task: 'Review notification operations', href: '/admin/notifications', label: 'Open Notifications' },
  { task: 'Review AI founder brief', href: '/admin/ai-os', label: 'Open Founder Advisor' },
  { task: 'Check automation runtime', href: '/admin/openclaw', label: 'Open OpenClaw Ops' },
]