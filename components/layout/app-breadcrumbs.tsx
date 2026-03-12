'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type AppBreadcrumbsProps = {
  rootHref: string
  rootLabel: string
  className?: string
  tone?: 'light' | 'dark'
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  analytics: 'Analytics',
  command: 'Command',
  dashboard: 'Dashboard',
  invites: 'Invites',
  revenue: 'Revenue',
  support: 'Support',
  tenants: 'Tenants',
  users: 'Users',
  parent: 'Parent',
  applications: 'Applications',
  children: 'Children',
  compare: 'Compare',
  'daily-reports': 'Daily Reports',
  directory: 'Directory',
  notifications: 'Notifications',
  onboarding: 'Onboarding',
  preferences: 'Preferences',
  profile: 'Profile',
  documents: 'Documents',
  emergency: 'Emergency',
  security: 'Security',
  'report-cards': 'Report Cards',
  shortlist: 'Shortlist',
  join: 'Join',
  ecd: 'ECD',
  attendance: 'Attendance',
  billing: 'Billing',
  calendar: 'Calendar',
  communications: 'Communications',
  compliance: 'Compliance',
  employment: 'Employment',
  financials: 'Financials',
  marketplace: 'Marketplace',
  pickup: 'Pickup',
  pipeline: 'Pipeline',
  transport: 'Transport',
  drivers: 'Drivers',
  website: 'Website',
  'whatsapp-alerts': 'WhatsApp Alerts',
  'parent-invoicing': 'Parent Invoicing',
  'ai-upload': 'Attendance Import',
  'for-centres': 'For Centres',
  legal: 'Legal',
  privacy: 'Privacy',
  terms: 'Terms',
  offline: 'Offline',
  apply: 'Apply',
  c: 'Centres',
  centre: 'Centre',
  jobs: 'Jobs',
  login: 'Login',
  register: 'Register',
  'reset-password': 'Reset Password',
  'forgot-password': 'Forgot Password',
}

const DYNAMIC_PARENT_LABELS: Record<string, string> = {
  tenants: 'Tenant',
  applications: 'Application',
  children: 'Child',
  c: 'Centre',
  centre: 'Centre',
  jobs: 'Job',
  driver: 'Driver',
  view: 'Document',
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isDynamicIdentifier(value: string) {
  if (isUuid(value)) return true
  if (/^\d+$/.test(value)) return true
  if (value.length >= 20 && /^[a-z0-9-]+$/i.test(value)) return true
  return false
}

function toTitleCase(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toSegmentLabel(segment: string, previousSegment: string | null) {
  const decoded = decodeURIComponent(segment).trim()
  const key = decoded.toLowerCase()

  if (SEGMENT_LABELS[key]) return SEGMENT_LABELS[key]
  if (previousSegment && DYNAMIC_PARENT_LABELS[previousSegment] && isDynamicIdentifier(decoded)) {
    return DYNAMIC_PARENT_LABELS[previousSegment]
  }
  if (isUuid(decoded)) return `${decoded.slice(0, 8)}...`
  if (/^\d+$/.test(decoded)) return `#${decoded}`
  return toTitleCase(key)
}

const NON_LINKABLE_SEGMENTS = new Set(['c', 'apply', 'for-centres', 'centre'])

export function AppBreadcrumbs({ rootHref, rootLabel, className, tone = 'light' }: AppBreadcrumbsProps) {
  const pathname = usePathname()
  if (!pathname) return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const rootSegments = rootHref.split('/').filter(Boolean)
  const rootMatchesPath =
    rootSegments.length > 0 &&
    rootSegments.every((segment, index) => segments[index]?.toLowerCase() === segment.toLowerCase())

  const breadcrumbSegments = rootMatchesPath ? segments.slice(rootSegments.length) : segments
  const rootNamespace = rootSegments[0]?.toLowerCase() ?? null
  const dedupedSegments =
    !rootMatchesPath && rootNamespace && breadcrumbSegments[0]?.toLowerCase() === rootNamespace
      ? breadcrumbSegments.slice(1)
      : breadcrumbSegments
  if (dedupedSegments.length === 0) return null

  let runningPath = rootMatchesPath ? `/${rootSegments.join('/')}` : ''
  let previousSegment: string | null = rootMatchesPath ? rootSegments[rootSegments.length - 1] ?? null : null
  const items = dedupedSegments.map((segment) => {
    runningPath = `${runningPath}/${segment}`
    const label = toSegmentLabel(segment, previousSegment)
    const isLinkable = !NON_LINKABLE_SEGMENTS.has(segment.toLowerCase())
    previousSegment = segment.toLowerCase()
    return { href: runningPath, label, isLinkable }
  })

  const colorClasses =
    tone === 'dark'
      ? {
          wrapper: 'text-slate-400',
          link: 'text-slate-300 hover:text-cyan-300',
          current: 'text-cyan-300',
          icon: 'text-slate-500',
        }
      : {
          wrapper: 'text-slate-500',
          link: 'text-slate-600 hover:text-teal-700',
          current: 'text-slate-800',
          icon: 'text-slate-400',
        }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('mb-3 flex flex-wrap items-center gap-1 text-xs font-semibold', colorClasses.wrapper, className)}
    >
      <Link href={rootHref} className={cn('transition-colors', colorClasses.link)}>
        {rootLabel}
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const shouldLink = item.isLinkable && !isLast
        return (
          <div key={item.href} className="inline-flex items-center gap-1">
            <ChevronRight className={cn('h-3.5 w-3.5', colorClasses.icon)} />
            {shouldLink ? (
              <Link href={item.href} className={cn('transition-colors', colorClasses.link)}>
                {item.label}
              </Link>
            ) : (
              <span className={cn('font-bold', isLast ? colorClasses.current : colorClasses.wrapper)}>
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
