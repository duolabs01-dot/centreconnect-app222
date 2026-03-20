import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
  Globe,
  MessagesSquare,
  FileText,
  LineChart,
  FileCheck,
  Briefcase,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import type { InternalTier } from '@/lib/billing/plans'

export type EcdNavItem = Record<'href', string> & {
  label: string
  icon: LucideIcon
  group?: 'daily_ops' | 'admin' | 'grow' | 'settings'
  comingSoon?: boolean
  adminOnly?: boolean
  supervisorAllowed?: boolean
  /** Minimum internal tier required to see this nav item. Undefined = available to all tiers. */
  minTier?: InternalTier
}

/**
 * ECD Portal Navigation — Tier Gating
 *
 * Tier rank: basic=1 (Starter) | standard=2 (Growth) | premium=3 (Pro)
 *
 * Starter (basic) : Home + Children ONLY
 * Growth (standard): Starter + Attendance + Reports + Admissions + Messages
 * Pro (premium)   : Growth + Website Builder (future)
 */
export const ECD_DASHBOARD_NAV: EcdNavItem[] = [
  // ─── STARTER (basic) ───────────────────────────────────────────────
  {
    href: '/ecd/dashboard',
    label: 'Home',
    icon: LayoutDashboard,
    group: 'daily_ops',
    supervisorAllowed: true,
    // minTier undefined = visible to all tiers
  },
  {
    href: '/ecd/children',
    label: 'Children',
    icon: Users,
    group: 'daily_ops',
    supervisorAllowed: true,
    // minTier undefined = visible to all tiers
  },

  // ─── GROWTH+ (standard) ────────────────────────────────────────────
  {
    href: '/ecd/attendance',
    label: 'Attendance',
    icon: UserCheck,
    group: 'daily_ops',
    minTier: 'standard', // Growth+
    supervisorAllowed: true,
  },
  {
    href: '/ecd/daily-reports',
    label: 'Reports',
    icon: Zap,
    group: 'daily_ops',
    minTier: 'standard', // Growth+
    supervisorAllowed: true,
  },
  {
    href: '/ecd/applications',
    label: 'Admissions',
    icon: ClipboardList,
    group: 'grow',
    minTier: 'standard', // Growth+
    supervisorAllowed: true,
  },
  {
    href: '/ecd/communications',
    label: 'Messages',
    icon: MessagesSquare,
    group: 'grow',
    minTier: 'standard', // Growth+
    supervisorAllowed: true,
  },

  // ─── ADMIN AREA (ecd_admin only — not tier-gated, role-gated) ──────
  {
    href: '/ecd/dsd-export',
    label: 'DOE Export',
    icon: FileCheck,
    group: 'admin',
    adminOnly: true,
    supervisorAllowed: true,
    // No minTier — admin-only, tier not relevant
  },
  {
    href: '/ecd/profile',
    label: 'Settings',
    icon: Settings2,
    group: 'settings',
    adminOnly: true,
    // Settings is always visible to ecd_admin regardless of tier
    // No minTier needed since adminOnly=true gates it by role
  },
]
