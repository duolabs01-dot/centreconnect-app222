import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { QuickSendTemplate } from './quick-send-template'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { cn } from '@/lib/utils'
import { Search, Filter, ChevronLeft, ChevronRight, FileText, ShieldAlert, Info } from 'lucide-react'

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
      <div className="rounded-xl border border-admin-border bg-admin-surface/50 p-8 text-center">
        <p className="text-sm text-admin-text-muted">No applications found in this category.</p>
        <div className="mt-4">
          <Button asChild className="admin-button-primary h-10 px-6">
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
            <Card key={application.id} className="admin-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-admin-text truncate">{childName}</p>
                  <p className="mt-1 text-xs text-admin-text-muted">
                    {parentName} • {formatDate(application.submitted_at)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={application.status} />
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-admin-text-muted hover:text-admin-accent hover:bg-admin-accent-glow" asChild>
                  <Link href={`/ecd/applications/${application.id}`} title="View Application">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-admin-border flex justify-end">
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

      <div className="hidden lg:block overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
        <Table>
          <TableHeader className="bg-admin-surface-hover/50">
            <TableRow className="hover:bg-transparent border-admin-border">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted h-12">No.</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted h-12">Child</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted h-12">Parent</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted h-12">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted h-12">Date</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-admin-text-muted h-12 pr-6">Actions</TableHead>
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
                <TableRow key={application.id} className="border-admin-border hover:bg-admin-surface-hover/50 transition-colors group">
                  <TableCell className="font-bold text-admin-text-muted group-hover:text-admin-accent transition-colors pl-6">{application.application_number}</TableCell>
                  <TableCell className="font-bold text-admin-text">{childName}</TableCell>
                  <TableCell className="text-admin-text-muted">{parentName}</TableCell>
                  <TableCell>
                    <StatusBadge status={application.status} />
                  </TableCell>
                  <TableCell className="text-admin-text-muted text-xs">{formatDate(application.submitted_at)}</TableCell>
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
                      <Button size="sm" variant="ghost" className="h-9 px-3 text-admin-text-muted hover:text-admin-accent hover:bg-admin-accent-glow font-bold" asChild>
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

    const applications = ((searchRows ?? []) as ApplicationRow[]) || []
    const filteredApplications = applications.filter((application) => {
      const child = normalizeOne(application.children)
      const parent = normalizeOne(application.parents)
      const profile = normalizeOne(parent?.user_profiles ?? null)
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

    const grouped = {
      pending: filteredApplications.filter((app) => app.status === 'submitted' || app.status === 'in_review'),
      awaitingOfferResponse: filteredApplications.filter((app) => app.status === 'approved' && !app.offer_accepted_at),
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
      awaitingOfferResponse: grouped.awaitingOfferResponse.length,
      approved: grouped.approved.length,
      enrolled: grouped.enrolled.length,
      waitlisted: grouped.waitlisted.length,
      rejected: grouped.rejected.length,
    }

    const selectedPool =
      selectedTab === 'pending'
        ? grouped.pending
        : selectedTab === 'awaiting_offer_response'
          ? grouped.awaitingOfferResponse
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
      <section className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-admin-accent">{centre?.name ?? 'Admissions'}</p>
          <h1 className="text-2xl font-black text-admin-text mt-1">Pipeline Management</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-admin-surface border border-admin-border">
          <Filter className="w-4 h-4 text-admin-text-muted" />
          <span className="text-xs font-bold text-admin-text-muted uppercase tracking-widest">Global Filter</span>
        </div>
      </section>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-card p-5 border-t-2 border-t-admin-accent">
            <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Pending</p>
            <p className="mt-2 text-3xl font-black text-admin-text">{filteredCounts.pending}</p>
          </div>
          <div className="admin-card p-5 border-t-2 border-t-admin-warning">
            <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Offers Out</p>
            <p className="mt-2 text-3xl font-black text-admin-warning">{filteredCounts.awaitingOfferResponse}</p>
          </div>
          <div className="admin-card p-5 border-t-2 border-t-admin-success">
            <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Enrolled</p>
            <p className="mt-2 text-3xl font-black text-admin-success">{filteredCounts.enrolled}</p>
          </div>
          <div className="admin-card p-5 border-t-2 border-t-admin-border">
            <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Total Filtered</p>
            <p className="mt-2 text-3xl font-black text-admin-text">
              {filteredCounts.pending + filteredCounts.approved + filteredCounts.enrolled}
            </p>
          </div>
        </div>

        <Card className="admin-card p-1">
          <CardContent className="p-4 space-y-6">
            <form method="get" action="/ecd/applications" className="flex gap-3">
              {selectedTab !== 'pending' ? <input type="hidden" name="tab" value={selectedTab} /> : null}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-text-muted" />
                <input 
                  name="q" 
                  defaultValue={searchParams?.q ?? ''} 
                  placeholder="Search applications..." 
                  className="w-full h-11 bg-admin-bg border border-admin-border rounded-xl pl-10 pr-4 text-sm text-admin-text focus:border-admin-accent focus:ring-1 focus:ring-admin-accent outline-none"
                />
              </div>
              <Button type="submit" className="admin-button-primary h-11 px-6 text-black font-bold">Search</Button>
            </form>

            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-admin-bg border border-admin-border w-fit">
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
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedTab === tab.key 
                      ? "bg-admin-accent text-black shadow-float" 
                      : "text-admin-text-muted hover:text-admin-text hover:bg-admin-surface-hover"
                  )}
                >
                  {tab.label} ({tab.count})
                </Link>
              ))}
            </div>

            {selectedTab === 'pending' && blockedPendingApplications.length > 0 && (
              <div className="rounded-xl bg-admin-warning/10 border border-admin-warning/20 p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-admin-warning flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-sm font-bold text-admin-warning">
                    {blockedPendingApplications.length} Blocked Applications
                  </p>
                  <p className="mt-1 text-xs text-admin-text-muted leading-relaxed">
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-admin-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">
                Showing Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-10 px-4 border-admin-border text-admin-text font-bold hover:bg-admin-surface-hover" asChild disabled={!canPrev}>
                  <Link href={buildApplicationsHref({ page: currentPage - 1 })}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Link>
                </Button>
                <Button variant="outline" className="h-10 px-4 border-admin-border text-admin-text font-bold hover:bg-admin-surface-hover" asChild disabled={!canNext}>
                  <Link href={buildApplicationsHref({ page: currentPage + 1 })}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <section id="details" className="admin-card">
          <div className="p-4 border-b border-admin-border flex items-center justify-between bg-admin-surface-hover/30">
            <h2 className="text-sm font-bold text-admin-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-admin-accent" />
              Application Intelligence
            </h2>
          </div>
          <div className="p-6">
            {focusedApplication ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Reference</p>
                    <p className="text-base font-bold text-admin-text mt-1">{focusedApplication.application_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Status</p>
                    <div className="mt-1"><StatusBadge status={focusedApplication.status} /></div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Child Details</p>
                    <p className="text-base font-bold text-admin-text mt-1">
                      {focusedChild ? `${focusedChild.first_name} ${focusedChild.last_name}` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Parent Contact</p>
                    <p className="text-base font-bold text-admin-text mt-1">{focusedParentProfile?.full_name ?? 'N/A'}</p>
                    <p className="text-sm text-admin-accent mt-0.5">{focusedParentProfile?.phone ?? focusedParent?.alt_phone ?? 'No phone'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">Internal Notes</p>
                    <p className="text-sm text-admin-text-muted italic mt-1 bg-admin-bg p-3 rounded-lg border border-admin-border">
                      {focusedApplication.admin_notes || 'No private notes added yet.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info className="w-8 h-8 text-admin-border mb-3" />
                <p className="text-sm text-admin-text-muted">Select an application from the table above to view deep-dive details.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </EcdOsShell>
  )
}
