import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QuickSendTemplate } from './quick-send-template'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { cn } from '@/lib/utils'
import { Search, Filter, ChevronLeft, ChevronRight, FileText, ShieldAlert, Info } from 'lucide-react'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Admissions Inbox - CentreConnect',
  description: 'Prioritized admissions inbox for pending reviews and approved offers awaiting parent confirmation.',
}

type ApplicationsPageProps = {
  searchParams?: {
    focus?: string
    tab?: string
    q?: string
    page?: string
  }
}

type TabKey = 'pending' | 'awaiting_offer_response' | 'approved' | 'enrolled' | 'waitlisted' | 'rejected'

type ApplicationRow = {
  id: string
  parent_id: string
  child_id: string
  application_number: string
  status: string
  submitted_at: string
  offer_accepted_at: string | null
  parent_message: string | null
  admin_notes: string | null
  children:
    | {
        first_name: string
        last_name: string
        date_of_birth: string | null
        gender: string | null
      }
    | Array<{
        first_name: string
        last_name: string
        date_of_birth: string | null
        gender: string | null
      }>
    | null
  parents:
    | {
        id: string
        alt_phone: string | null
        guardian_relationship: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        id_verification_status: string | null
        user_profiles:
          | {
              full_name: string
              phone: string | null
            }
          | Array<{
              full_name: string
              phone: string | null
            }>
          | null
      }
    | Array<{
        id: string
        alt_phone: string | null
        guardian_relationship: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        id_verification_status: string | null
        user_profiles:
          | {
              full_name: string
              phone: string | null
            }
          | Array<{
              full_name: string
              phone: string | null
            }>
          | null
      }>
    | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

type Template = {
  template_key: string
  title: string
  body: string
}

type IntakeBlockedApplication = {
  application: ApplicationRow
  missing: string[]
}

async function partitionPendingForReview(applications: ApplicationRow[]) {
  if (applications.length === 0) {
    return {
      ready: [] as ApplicationRow[],
      blocked: [] as IntakeBlockedApplication[],
    }
  }

  const admin = (() => {
    try {
      return createAdminClient()
    } catch {
      return null
    }
  })()
  if (!admin) return { ready: applications, blocked: [] as IntakeBlockedApplication[] }
  const parentIds = Array.from(new Set(applications.map((application) => application.parent_id).filter(Boolean)))
  const { data: docsRows, error: docsError } =
    parentIds.length > 0
      ? await admin.from('parent_documents').select('parent_id,doc_type').in('parent_id', parentIds).limit(500)
      : { data: [] as Array<{ parent_id: string; doc_type: string | null }> }

  if (docsError) {
    return { ready: applications, blocked: [] as IntakeBlockedApplication[] }
  }

  const docTypesByParent = new Map<string, string[]>()
  for (const row of docsRows ?? []) {
    const list = docTypesByParent.get(row.parent_id) ?? []
    if (row.doc_type) list.push(row.doc_type)
    docTypesByParent.set(row.parent_id, list)
  }

  const ready: ApplicationRow[] = []
  const blocked: IntakeBlockedApplication[] = []

  for (const application of applications) {
    const parent = normalizeOne(application.parents)
    const parentProfile = normalizeOne(parent?.user_profiles ?? null)
    const child = normalizeOne(application.children)

    const readiness = evaluateApplicationIntakeReadiness({
      parent: {
        fullName: parentProfile?.full_name ?? null,
        phone: parentProfile?.phone ?? parent?.alt_phone ?? null,
        guardianRelationship: parent?.guardian_relationship ?? null,
        emergencyContactName: parent?.emergency_contact_name ?? null,
        emergencyContactPhone: parent?.emergency_contact_phone ?? null,
        idVerificationStatus: parent?.id_verification_status ?? null,
      },
      child: {
        firstName: child?.first_name ?? null,
        lastName: child?.last_name ?? null,
        dateOfBirth: child?.date_of_birth ?? null,
        gender: child?.gender ?? null,
      },
      docTypes: docTypesByParent.get(application.parent_id) ?? [],
    })

    if (readiness.ready) {
      ready.push(application)
      continue
    }

    blocked.push({ application, missing: readiness.missing.slice(0, 4) })
  }

  return { ready, blocked }
}

function renderApplicationList(
  applications: ApplicationRow[],
  context: {
    ecdId: string
    centreName: string
    templates: Template[]
  }
) {
  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-12 text-center">
        <p className="text-sm text-slate-500">No applications found in this category.</p>
        <div className="mt-4">
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white h-11 px-8 rounded-xl font-bold shadow-sm">
            <Link href="/ecd/website">Complete Profile to attract parents</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="lg:hidden space-y-3">
        {applications.map((application) => {
          const child = normalizeOne(application.children)
          const parent = normalizeOne(application.parents)
          const parentProfile = normalizeOne(parent?.user_profiles ?? null)
          const childName = child ? `${child.first_name} ${child.last_name}` : 'Unknown child'
          const parentName = parentProfile?.full_name ?? 'Unknown parent'
          return (
            <Card key={application.id} className="p-5 shadow-sm border-slate-100 bg-white rounded-3xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{childName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {parentName} • {formatDate(application.submitted_at)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={application.status} />
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-slate-400 hover:text-teal-600 hover:bg-teal-50" asChild>
                  <Link href={`/ecd/applications/${application.id}`} title="View Application">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                <QuickSendTemplate
                  ecdId={context.ecdId}
                  parentId={parent?.id ?? ''}
                  applicationId={application.id}
                  applicationNumber={application.application_number}
                  centreName={context.centreName}
                  childName={childName}
                  parentName={parentName}
                  status={application.status}
                  templates={context.templates}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">No.</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Child</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Parent</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Date</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => {
              const child = normalizeOne(application.children)
              const parent = normalizeOne(application.parents)
              const parentProfile = normalizeOne(parent?.user_profiles ?? null)
              const childName = child ? `${child.first_name} ${child.last_name}` : 'Unknown child'
              const parentName = parentProfile?.full_name ?? 'Unknown parent'
              return (
                <TableRow key={application.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="font-bold text-slate-400 group-hover:text-teal-600 transition-colors pl-6">{application.application_number}</TableCell>
                  <TableCell className="font-bold text-slate-900">{childName}</TableCell>
                  <TableCell className="text-slate-600">{parentName}</TableCell>
                  <TableCell>
                    <StatusBadge status={application.status} />
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{formatDate(application.submitted_at)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <QuickSendTemplate
                        ecdId={context.ecdId}
                        parentId={parent?.id ?? ''}
                        applicationId={application.id}
                        applicationNumber={application.application_number}
                        centreName={context.centreName}
                        childName={childName}
                        parentName={parentName}
                        status={application.status}
                        templates={context.templates}
                      />
                      <Button size="sm" variant="ghost" className="h-9 px-4 text-slate-500 hover:text-teal-700 hover:bg-teal-50 font-bold rounded-lg" asChild>
                        <Link href={`/ecd/applications/${application.id}`}>Open</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default async function EcdApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()
  const { data: templatesData } = await supabase
    .from('communication_templates')
    .select('template_key,title,body')
    .eq('is_active', true)
    .in('template_key', ['missing_documents', 'open_day_invite', 'application_update', 'spot_available'])
    .order('created_at', { ascending: true })

  const templates = (templatesData ?? []) as Template[]
  const selectedTab: TabKey =
    searchParams?.tab === 'awaiting_offer_response' ||
    searchParams?.tab === 'approved' ||
    searchParams?.tab === 'enrolled' ||
    searchParams?.tab === 'waitlisted' ||
    searchParams?.tab === 'rejected'
      ? searchParams.tab
      : 'pending'

  const searchValue = (searchParams?.q ?? '').trim().toLowerCase()
  const pageSize = 25
  const rawPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageFrom = (currentPage - 1) * pageSize
  const pageTo = pageFrom + pageSize - 1

  const countsResult = await supabase.rpc('get_ecd_application_counts', { p_ecd_id: ecdId })
  const counts = (countsResult.data?.[0] ?? {}) as {
    pending_count?: number
    awaiting_offer_response_count?: number
    approved_count?: number
    enrolled_count?: number
    waitlisted_count?: number
    rejected_count?: number
  }

  const dbCounts = {
    pending: counts.pending_count ?? 0,
    awaitingOfferResponse: counts.awaiting_offer_response_count ?? 0,
    approved: counts.approved_count ?? 0,
    enrolled: counts.enrolled_count ?? 0,
    waitlisted: counts.waitlisted_count ?? 0,
    rejected: counts.rejected_count ?? 0,
  }

  let selectedApplications: ApplicationRow[] = []
  let blockedPendingApplications: IntakeBlockedApplication[] = []
  let filteredCounts = dbCounts

  if (searchValue) {
    const { data: searchRows } = await supabase
      .from('applications')
      .select(
        'id,parent_id,child_id,application_number,status,submitted_at,offer_accepted_at,parent_message,admin_notes,children(first_name,last_name,date_of_birth,gender),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
      )
      .eq('ecd_id', ecdId)
      .order('submitted_at', { ascending: false })
      .limit(500)

    const applications = (searchRows ?? []) || []
    const filteredApplications = applications.filter((application) => {
      const child = normalizeOne<{ first_name: string | null; last_name: string | null }>(application.children as any)
      const parent = normalizeOne<{ user_profiles: { full_name: string | null } | { full_name: string | null }[] | null }>(application.parents as any)
      const profile = normalizeOne<{ full_name: string | null }>(parent?.user_profiles ?? null)
      const searchBlob = [
        application.application_number,
        child?.first_name,
        child?.last_name,
        profile?.full_name,
        application.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchBlob.includes(searchValue)
    })

    const grouped: Record<TabKey, ApplicationRow[]> = {
      pending: filteredApplications.filter((app) => app.status === 'submitted' || app.status === 'in_review'),
      awaiting_offer_response: filteredApplications.filter((app) => app.status === 'approved' && !app.offer_accepted_at),
      approved: filteredApplications.filter((app) => app.status === 'approved'),
      enrolled: filteredApplications.filter((app) => app.status === 'enrolled'),
      waitlisted: filteredApplications.filter((app) => app.status === 'waitlisted'),
      rejected: filteredApplications.filter((app) => app.status === 'rejected'),
    }

    if (grouped.pending.length > 0) {
      const pendingPartition = await partitionPendingForReview(grouped.pending)
      grouped.pending = pendingPartition.ready
      blockedPendingApplications = pendingPartition.blocked
    }

    filteredCounts = {
      pending: grouped.pending.length,
      awaiting_offer_response: grouped.awaiting_offer_response.length,
      approved: grouped.approved.length,
      enrolled: grouped.enrolled.length,
      waitlisted: grouped.waitlisted.length,
      rejected: grouped.rejected.length,
    }

    const selectedPool =
      selectedTab === 'pending'
        ? grouped.pending
        : selectedTab === 'awaiting_offer_response'
          ? grouped.awaiting_offer_response
          : selectedTab === 'approved'
            ? grouped.approved
            : selectedTab === 'enrolled'
              ? grouped.enrolled
              : selectedTab === 'waitlisted'
                ? grouped.waitlisted
                : grouped.rejected

    selectedApplications = selectedPool.slice(pageFrom, pageTo + 1)
  } else {
    if (selectedTab === 'pending') {
      const { data: pendingRows } = await supabase
        .from('applications')
        .select(
          'id,parent_id,child_id,application_number,status,submitted_at,offer_accepted_at,parent_message,admin_notes,children(first_name,last_name,date_of_birth,gender),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
        )
        .eq('ecd_id', ecdId)
        .in('status', ['submitted', 'in_review'])
        .order('submitted_at', { ascending: false })
        .limit(500)

      const pendingApplications = ((pendingRows ?? []) as ApplicationRow[]) ?? []
      const pendingPartition = await partitionPendingForReview(pendingApplications)
      blockedPendingApplications = pendingPartition.blocked
      filteredCounts = {
        ...filteredCounts,
        pending: pendingPartition.ready.length,
      }
      selectedApplications = pendingPartition.ready.slice(pageFrom, pageTo + 1)
    } else if (selectedTab === 'awaiting_offer_response') {
      const { data: rows } = await supabase
        .from('applications')
        .select(
          'id,parent_id,child_id,application_number,status,submitted_at,offer_accepted_at,parent_message,admin_notes,children(first_name,last_name,date_of_birth,gender),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
        )
        .eq('ecd_id', ecdId)
        .eq('status', 'approved')
        .is('offer_accepted_at', null)
        .order('submitted_at', { ascending: false })
        .range(pageFrom, pageTo)
      selectedApplications = ((rows ?? []) as ApplicationRow[]) ?? []
    } else {
      const { data: rows } = await supabase
        .from('applications')
        .select(
          'id,parent_id,child_id,application_number,status,submitted_at,offer_accepted_at,parent_message,admin_notes,children(first_name,last_name,date_of_birth,gender),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
        )
        .eq('ecd_id', ecdId)
        .eq('status', selectedTab)
        .order('submitted_at', { ascending: false })
        .range(pageFrom, pageTo)
      selectedApplications = ((rows ?? []) as ApplicationRow[]) ?? []
    }
  }

  const totalForSelected =
    selectedTab === 'pending'
      ? filteredCounts.pending
      : selectedTab === 'awaiting_offer_response'
        ? filteredCounts.awaitingOfferResponse
        : selectedTab === 'approved'
          ? filteredCounts.approved
          : selectedTab === 'enrolled'
            ? filteredCounts.enrolled
            : selectedTab === 'waitlisted'
              ? filteredCounts.waitlisted
              : filteredCounts.rejected

  const totalPages = Math.max(1, Math.ceil(totalForSelected / pageSize))
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  function buildApplicationsHref(next: { tab?: TabKey; page?: number }) {
    const params = new URLSearchParams()
    const tab = next.tab ?? selectedTab
    const page = next.page ?? currentPage
    if (tab !== 'pending') params.set('tab', tab)
    if (searchValue) params.set('q', searchValue)
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    return query ? `/ecd/applications?${query}` : '/ecd/applications'
  }

  let focusedApplication = selectedApplications.find((app) => app.id === searchParams?.focus) ?? null
  if (!focusedApplication && searchParams?.focus) {
    const { data: focusedRow } = await supabase
      .from('applications')
      .select(
        'id,parent_id,child_id,application_number,status,submitted_at,offer_accepted_at,parent_message,admin_notes,children(first_name,last_name,date_of_birth,gender),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
      )
      .eq('ecd_id', ecdId)
      .eq('id', searchParams.focus)
      .maybeSingle()
    focusedApplication = (focusedRow as ApplicationRow | null) ?? null
  }
  const focusedChild = normalizeOne(focusedApplication?.children ?? null)
  const focusedParent = normalizeOne(focusedApplication?.parents ?? null)
  const focusedParentProfile = normalizeOne(focusedParent?.user_profiles ?? null)

  return (
    <EcdOsShell
      title="Admissions Inbox"
      description="Prioritize pending reviews and approved offers awaiting parent acceptance."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="mb-8 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600">{centre?.name ?? 'Admissions'}</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pipeline Management</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Filter</span>
        </div>
      </section>

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-teal-600">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{filteredCounts.pending}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-amber-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Offers Out</p>
            <p className="mt-2 text-3xl font-black text-amber-600">{filteredCounts.awaitingOfferResponse}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-emerald-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enrolled</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{filteredCounts.enrolled}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-slate-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Filtered</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {filteredCounts.pending + filteredCounts.approved + filteredCounts.enrolled}
            </p>
          </div>
        </div>

        <Card className="p-1 border-slate-100 shadow-sm rounded-3xl">
          <CardContent className="p-6 space-y-8">
            <form method="get" action="/ecd/applications" className="flex gap-3">
              {selectedTab !== 'pending' ? <input type="hidden" name="tab" value={selectedTab} /> : null}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  name="q" 
                  defaultValue={searchParams?.q ?? ''} 
                  placeholder="Search applications..." 
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-sm text-slate-900 focus:border-teal-400 focus:ring-4 focus:ring-teal-500/5 outline-none transition-all"
                />
              </div>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white h-12 px-8 rounded-2xl font-bold transition-all active:scale-95 shadow-sm">Search</Button>
            </form>

            <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-100 w-fit">
              {[
                { key: 'pending', label: 'Pending', count: filteredCounts.pending },
                { key: 'awaiting_offer_response', label: 'Offers', count: filteredCounts.awaitingOfferResponse },
                { key: 'approved', label: 'Approved', count: filteredCounts.approved },
                { key: 'enrolled', label: 'Enrolled', count: filteredCounts.enrolled },
                { key: 'waitlisted', label: 'Waitlist', count: filteredCounts.waitlisted },
                { key: 'rejected', label: 'Rejected', count: filteredCounts.rejected },
              ].map((tab) => (
                <Link
                  key={tab.key}
                  href={buildApplicationsHref({ tab: tab.key as TabKey, page: 1 })}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedTab === tab.key 
                      ? "bg-white text-teal-700 shadow-sm border border-slate-100" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab.label} ({tab.count})
                </Link>
              ))}
            </div>

            {selectedTab === 'pending' && blockedPendingApplications.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 flex items-start gap-4 shadow-sm shadow-amber-100/50">
                <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    {blockedPendingApplications.length} Blocked Applications
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80 leading-relaxed font-medium">
                    Some parents haven&apos;t finished their profile or document uploads. Ask them to update their details to resume the process.
                  </p>
                </div>
              </div>
            )}

            {renderApplicationList(selectedApplications, {
              ecdId,
              centreName: centre?.name ?? 'Your centre',
              templates,
            })}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Showing Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-11 px-5 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 rounded-xl shadow-sm" asChild disabled={!canPrev}>
                  <Link href={buildApplicationsHref({ page: currentPage - 1 })}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Link>
                </Button>
                <Button variant="outline" className="h-11 px-5 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 rounded-xl shadow-sm" asChild disabled={!canNext}>
                  <Link href={buildApplicationsHref({ page: currentPage + 1 })}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <section id="details" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Application Intelligence
            </h2>
          </div>
          <div className="p-0">
            {focusedApplication ? (
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</p>
                      <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{focusedApplication.application_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                      <div className="mt-2"><StatusBadge status={focusedApplication.status} /></div>
                    </div>
                  </div>
                  
                  <div className="h-px bg-slate-100" />
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Child Profile</p>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-lg">
                          {focusedChild?.first_name?.[0] ?? 'C'}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{focusedChild ? `${focusedChild.first_name} ${focusedChild.last_name}` : 'N/A'}</p>
                          <p className="text-xs text-slate-500 font-medium">Applicant</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Primary Guardian</p>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-lg">
                          {focusedParentProfile?.full_name?.[0] ?? 'P'}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{focusedParentProfile?.full_name ?? 'N/A'}</p>
                          <p className="text-xs text-teal-600 font-bold">{focusedParentProfile?.phone ?? focusedParent?.alt_phone ?? 'No phone'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-80 bg-slate-50/50 border-l border-slate-50 p-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Internal Notes</p>
                  <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm min-h-[120px]">
                    <p className="text-sm text-slate-600 italic leading-relaxed">
                      {focusedApplication.admin_notes || 'No private notes added yet.'}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full mt-4 h-12 rounded-xl font-bold text-slate-600 border-slate-200 hover:bg-white hover:text-teal-700 hover:border-teal-200" asChild>
                    <Link href={`/ecd/applications/${focusedApplication.id}`}>Full Case File →</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 shadow-sm">
                  <Info className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400 max-w-xs uppercase tracking-widest leading-relaxed">Select an application from the table above to view deep-dive details.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </EcdOsShell>
  )
}
