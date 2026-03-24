import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  ClipboardList,
  UserPlus2,
  Users,
} from 'lucide-react'
import { ProfileCompleteness } from '@/components/ecd/TodayWidgets'
import { OnboardingChecklistCard, TrialStatusBanner } from '@/components/ecd/trial-status-banner'
import { FeatureBanner } from '@/components/ui/feature-banner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { formatDate, getJohannesburgGreeting, cn } from '@/lib/utils'

export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
  const { supabase, ecdId } = await requireEcdPortalSession()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()
  const centreName = centre?.name ?? 'Crèche'

  return {
    title: `${centreName} Dashboard | CentreConnect`,
    description: 'Today-first dashboard for attendance, admissions, family follow-up, and DSD readiness.',
  }
}

type PendingApplicationRow = {
  id: string
  status: string | null
  submitted_at: string
  children: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
  parents: { user_profiles: { full_name: string | null } | { full_name: string | null }[] | null } | { user_profiles: { full_name: string | null } | { full_name: string | null }[] | null }[] | null
}

type EcdNotificationRow = {
  id: string
  title: string | null
  message: string | null
  created_at: string
}

type ParentLinkRow = {
  id: string
  status: string | null
  parent_name: string | null
  parent_email: string | null
  sent_at: string | null
  opened_at: string | null
  children: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined, fallback = '') {
  const next = String(value ?? '').trim()
  return next || fallback
}

function PendingApplicationItem({ row }: { row: PendingApplicationRow }) {
  const child = normalizeOne(row.children)
  const parent = normalizeOne(row.parents)
  const parentProfile = normalizeOne(parent?.user_profiles ?? null)
  const childName = `${normalizeText(child?.first_name)} ${normalizeText(child?.last_name)}`.trim() || 'Child'
  const parentName = normalizeText(parentProfile?.full_name, 'Parent')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{childName}</p>
          <p className="mt-1 text-sm text-slate-600">{parentName}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDate(row.submitted_at)}</p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-700">
          {normalizeText(row.status, 'submitted').replaceAll('_', ' ')}
        </span>
      </div>
    </div>
  )
}

function NotificationItem({ row }: { row: EcdNotificationRow }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{normalizeText(row.title, 'New update')}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{normalizeText(row.message, 'Open notifications to read the latest update.')}</p>
      <p className="mt-2 text-xs text-slate-500">{formatDate(row.created_at)}</p>
    </div>
  )
}

function ParentLinkItem({ row }: { row: ParentLinkRow }) {
  const child = normalizeOne(row.children)
  const childName = `${normalizeText(child?.first_name)} ${normalizeText(child?.last_name)}`.trim() || 'Child'
  const status = normalizeText(row.status, 'pending')
  const tone =
    status === 'opened'
      ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
      : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{childName}</p>
          <p className="mt-1 text-sm text-slate-600">{normalizeText(row.parent_name, normalizeText(row.parent_email, 'Parent details captured'))}</p>
          <p className="mt-1 text-xs text-slate-500">
            {row.opened_at ? `Opened ${formatDate(row.opened_at)}` : row.sent_at ? `Sent ${formatDate(row.sent_at)}` : 'Ready for follow-up'}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${tone}`}>
          {status === 'opened' ? 'Opened' : 'Sent'}
        </span>
      </div>
    </div>
  )
}

export default async function EcdDashboardPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const admin = createAdminClient()
  const nowJhb = getJohannesburgGreeting()
  const todayDate = new Date().toISOString().slice(0, 10)

  const [
    centreResult,
    snapshotResult,
    pendingCountResult,
    pendingRowsResult,
    unreadNotificationCountResult,
    unreadNotificationRowsResult,
    parentLinkCountResult,
    parentLinkRowsResult,
    complianceMissingCountResult,
    complianceVerifiedCountResult,
    subscriptionResult,
    childrenCountResult,
    staffCountResult,
  ] = await Promise.all([
    supabase
      .from('ecd_centres')
      .select('name,is_active,logo_url,cover_image_url,description,phone,address,suburb')
      .eq('id', ecdId)
      .maybeSingle(),
    supabase.rpc('get_ecd_dashboard_snapshot', { p_ecd_id: ecdId, p_today: todayDate }),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .in('status', ['submitted', 'in_review', 'partial', 'draft']),
    supabase
      .from('applications')
      .select('id,status,submitted_at,children(first_name,last_name),parents(user_profiles(full_name))')
      .eq('ecd_id', ecdId)
      .in('status', ['submitted', 'in_review', 'partial', 'draft'])
      .order('submitted_at', { ascending: true })
      .limit(4),
    admin.from('ecd_notifications').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId).eq('is_read', false),
    admin
      .from('ecd_notifications')
      .select('id,title,message,created_at')
      .eq('ecd_id', ecdId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(3),
    admin.from('parent_link_requests').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId).in('status', ['pending', 'opened']),
    admin
      .from('parent_link_requests')
      .select('id,status,parent_name,parent_email,sent_at,opened_at,children(first_name,last_name)')
      .eq('ecd_id', ecdId)
      .in('status', ['pending', 'opened'])
      .order('created_at', { ascending: false })
      .limit(4),
    admin.from('compliance_documents').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId).in('status', ['missing', 'expired']),
    admin.from('compliance_documents').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId).eq('status', 'verified'),
    supabase
      .from('subscriptions')
      .select('tier,status,monthly_price,trial_ends_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('ecd_id', ecdId),
    supabase.from('ecd_admins').select('user_id', { count: 'exact', head: true }).eq('ecd_id', ecdId),
  ])

  const centre = centreResult.data
  const snapshot = (snapshotResult.data?.[0] ?? {}) as {
    attendance_today_count?: number
    picked_up_today_count?: number
    active_pickup_codes_count?: number
    submitted_count?: number
    in_review_count?: number
  }
  const pendingCount = pendingCountResult.count ?? 0
  const unreadNotifications = unreadNotificationCountResult.count ?? 0
  const familyFollowUps = parentLinkCountResult.count ?? 0
  const complianceNeedsAttention = complianceMissingCountResult.count ?? 0
  const verifiedDocs = complianceVerifiedCountResult.count ?? 0
  const childrenCount = childrenCountResult.count ?? 0
  const staffCount = staffCountResult.count ?? 0
  const pendingRows = (pendingRowsResult.data ?? []) as unknown as PendingApplicationRow[]
  const unreadRows = (unreadNotificationRowsResult.data ?? []) as EcdNotificationRow[]
  const parentLinkRows = (parentLinkRowsResult.data ?? []) as unknown as ParentLinkRow[]

  const profileItems = [
    { id: 'logo', label: 'Upload crèche logo', done: !!centre?.logo_url, href: '/ecd/website#brand-media' },
    { id: 'cover', label: 'Add cover image', done: !!centre?.cover_image_url, href: '/ecd/website#brand-media' },
    { id: 'desc', label: 'Write a warm bio', done: !!centre?.description, href: '/ecd/website' },
    { id: 'phone', label: 'Add phone number', done: !!centre?.phone, href: '/ecd/profile' },
    { id: 'address', label: 'Complete address', done: !!(centre?.address && centre?.suburb), href: '/ecd/profile' },
  ]

  const onboardingChecklistItems = [
    { id: 'children', label: 'Add your first 5 children', done: childrenCount > 0, href: '/ecd/children/new#quick-add' },
    { id: 'family-links', label: 'Send your first family email', done: familyFollowUps === 0 && childrenCount > 0, href: '/ecd/children' },
    { id: 'attendance', label: 'Mark attendance today', done: (snapshot.attendance_today_count ?? 0) > 0, href: '/ecd/attendance' },
    { id: 'pickup', label: 'Turn on safe pickup', done: (snapshot.active_pickup_codes_count ?? 0) > 0, href: '/ecd/pickup' },
    { id: 'publish', label: 'Publish your creche page', done: Boolean(centre?.is_active), href: '/ecd/website' },
  ]

    const startHereActions = [
      pendingCount > 0
        ? {
            title: 'Review new applications',
            detail: `${pendingCount} ${pendingCount === 1 ? 'application is' : 'applications are'} waiting for you.`,
            href: '/ecd/applications',
            tone: 'border-amber-200 bg-amber-50/80',
          }
        : null,
      !centre?.logo_url || !centre?.cover_image_url
        ? {
            title: 'Finish your website photos',
            detail: 'Add your logo and hero image so parents trust your page faster.',
            href: '/ecd/website#brand-media',
            tone: 'border-teal-200 bg-teal-50/80',
          }
        : null,
      (snapshot.attendance_today_count ?? 0) === 0
        ? {
            title: 'Take attendance',
            detail: 'Start the day by marking who is in class.',
            href: '/ecd/attendance',
            tone: 'border-cyan-200 bg-cyan-50/80',
          }
        : null,
      unreadNotifications > 0
        ? {
            title: 'Check unread messages',
            detail: `${unreadNotifications} message${unreadNotifications === 1 ? '' : 's'} still need attention.`,
            href: '/ecd/communications',
            tone: 'border-slate-200 bg-white/90',
          }
        : null,
      // Always show calendar quick action
      {
        title: 'View calendar',
        detail: 'See your centre\'s events and schedule.',
        href: '/ecd/calendar',
        tone: 'border-purple-200 bg-purple-50/80',
      },
    ].filter(Boolean) as Array<{ title: string; detail: string; href: string; tone: string }>

  return (
    <>
      <div className="space-y-6 pb-10">
        <Card className="rounded-[2.2rem] border-slate-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_62%,#f8fafc_100%)] shadow-sm">
          <CardContent className="space-y-5 p-6 sm:p-7">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">{nowJhb}</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{centre?.name ?? 'Your creche'}</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Here is what needs your attention today. Everything else — we have covered.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Children here today', value: snapshot.attendance_today_count ?? 0, icon: '✓', subtext: 'marked in' },
                { label: 'Applications', value: pendingCount, icon: pendingCount > 0 ? '!' : '—', subtext: 'waiting for review', urgent: pendingCount > 0 },
                { label: 'Messages', value: unreadNotifications, icon: unreadNotifications > 0 ? '●' : '—', subtext: 'unread', urgent: unreadNotifications > 0 },
                { label: 'Family links', value: familyFollowUps, icon: familyFollowUps > 0 ? '→' : '✓', subtext: familyFollowUps > 0 ? 'need connecting' : 'all connected' },
              ].map((item) => (
                <div key={item.label} className={cn(
                  'rounded-2xl border p-4 shadow-sm transition-all',
                  item.urgent 
                    ? 'border-amber-200 bg-amber-50/70' 
                    : 'border-white bg-white/90'
                )}>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={cn('text-3xl font-black', item.urgent ? 'text-amber-700' : 'text-slate-900')}>
                      {item.value}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{item.subtext}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                <Link href="/ecd/attendance">Take attendance</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href="/ecd/applications">Review applications</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href="/ecd/dsd-export">DSD pack</Link>
              </Button>
            </div>
            {startHereActions.length > 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Start here today</p>
                <p className="mt-1 text-sm text-slate-600">The fastest next steps for running your crèche well today.</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {startHereActions.map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className={cn(
                        'group rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                        action.tone
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{action.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <FeatureBanner context="ecd" />

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <CalendarCheck2 className="h-5 w-5 text-cyan-600" />
                Today&apos;s rhythm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Checked in</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{snapshot.attendance_today_count ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Collected</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{snapshot.picked_up_today_count ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Pickup codes</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{snapshot.active_pickup_codes_count ?? 0}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                  <Link href="/ecd/attendance">Take attendance</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/ecd/pickup">Collection</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/ecd/daily-reports">Daily updates</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <ClipboardList className="h-5 w-5 text-cyan-600" />
                New applications
              </CardTitle>
              <Link href="/ecd/applications" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRows.length > 0 ? pendingRows.map((row: any) => <PendingApplicationItem key={row.id} row={row} />) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No new applications waiting. When families apply, they appear here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <UserPlus2 className="h-5 w-5 text-cyan-600" />
                Family connections
              </CardTitle>
              <Link href="/ecd/children" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                All children
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {parentLinkRows.length > 0 ? parentLinkRows.map((row: any) => <ParentLinkItem key={row.id} row={row} />) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No family email follow-ups are waiting right now. Once a parent needs linking, that action shows here clearly.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <BellRing className="h-5 w-5 text-cyan-600" />
                Messages & compliance
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="h-9 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/ecd/communications">Announce</Link>
                </Button>
                <Button asChild variant="outline" className="h-9 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/ecd/compliance">Compliance</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={cn(
                  'rounded-2xl border p-4',
                  unreadNotifications > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
                )}>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Unread messages</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{unreadNotifications}</p>
                </div>
                <div className={cn(
                  'rounded-2xl border p-4',
                  complianceNeedsAttention > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
                )}>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Documents needed</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{complianceNeedsAttention}</p>
                  <p className="mt-1 text-xs text-slate-500">{verifiedDocs} on file</p>
                </div>
              </div>
              {unreadRows.length > 0 ? unreadRows.map((row: any) => <NotificationItem key={row.id} row={row} />) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  All caught up. No unread messages.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                  <Link href="/ecd/communications">View messages</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <TrialStatusBanner
          subscription={{
            tier: subscriptionResult.data?.tier ?? 'basic',
            status: subscriptionResult.data?.status ?? 'trial',
            monthlyPrice: subscriptionResult.data?.monthly_price ?? null,
            trialEndsAt: subscriptionResult.data?.trial_ends_at ?? null,
          }}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <ProfileCompleteness items={profileItems} />
          <OnboardingChecklistCard items={onboardingChecklistItems} />
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Users className="h-5 w-5 text-cyan-600" />
                Your creche at a glance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-700">Children enrolled</p>
                <p className="text-2xl font-black text-slate-900">{childrenCount}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-700">Team members</p>
                <p className="text-2xl font-black text-slate-900">{staffCount}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-700">Documents verified</p>
                <p className="text-2xl font-black text-slate-900">{verifiedDocs}</p>
              </div>
              <Link href="/ecd/website" className="inline-flex items-center gap-2 font-semibold text-cyan-700 hover:text-cyan-800">
                Your public page
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

