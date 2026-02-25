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
      <div className="rounded-md border border-border bg-card/80 p-4 text-sm text-muted-foreground">
        <p>No applications yet - complete your profile to attract parents.</p>
        <div className="mt-3">
          <Button size="sm" asChild>
            <Link href="/ecd/website">Complete profile</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {applications.map((application) => {
          const child = normalizeOne(application.children)
          const parent = normalizeOne(application.parents)
          const parentProfile = normalizeOne(parent?.user_profiles ?? null)
          const childName = child ? `${child.first_name} ${child.last_name}` : 'Unknown child'
          const parentName = parentProfile?.full_name ?? 'Unknown parent'
          const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? 'No phone'
          return (
            <Card key={application.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{childName}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {parentName} | {formatDate(application.submitted_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Parent phone: {parentPhone}</p>
                    <div className="mt-2">
                      <StatusBadge status={application.status} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/ecd/applications/${application.id}`}>Open application</Link>
                    </Button>
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
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Child</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.application_number}</TableCell>
                  <TableCell>{childName}</TableCell>
                  <TableCell>{parentName}</TableCell>
                  <TableCell>
                    <StatusBadge status={application.status} />
                  </TableCell>
                  <TableCell>{formatDate(application.submitted_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/ecd/applications/${application.id}`}>Open application</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export default async function EcdApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
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
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="mb-4">
        <p className="text-sm text-slate-600">{centre?.name ?? 'Your centre'}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card/90 p-4 sm:p-6 text-foreground">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-card border-border bg-card/80 p-3 text-foreground">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending review</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{filteredCounts.pending}</p>
          </div>
          <div className="glass-card border-amber-400/30 bg-amber-100 p-3 text-amber-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Awaiting parent response</p>
            <p className="mt-1 text-2xl font-semibold text-amber-800">{filteredCounts.awaitingOfferResponse}</p>
          </div>
          <div className="glass-card border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Enrolled</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{filteredCounts.enrolled}</p>
          </div>
          <div className="glass-card border-border bg-card/80 p-3 text-foreground">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total filtered</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {filteredCounts.pending + filteredCounts.approved + filteredCounts.enrolled + filteredCounts.waitlisted + filteredCounts.rejected}
            </p>
          </div>
        </div>

        <form method="get" action="/ecd/applications" className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          {selectedTab !== 'pending' ? <input type="hidden" name="tab" value={selectedTab} /> : null}
          <Input name="q" defaultValue={searchParams?.q ?? ''} placeholder="Search by child, parent, or application" />
          <Button type="submit">Apply filter</Button>
        </form>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'pending', label: `Pending (${filteredCounts.pending})` },
            { key: 'awaiting_offer_response', label: `Awaiting response (${filteredCounts.awaitingOfferResponse})` },
            { key: 'approved', label: `Approved (${filteredCounts.approved})` },
            { key: 'enrolled', label: `Enrolled (${filteredCounts.enrolled})` },
            { key: 'waitlisted', label: `Waitlisted (${filteredCounts.waitlisted})` },
            { key: 'rejected', label: `Rejected (${filteredCounts.rejected})` },
          ].map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={selectedTab === tab.key ? 'default' : 'outline'}
              asChild
            >
              <Link href={buildApplicationsHref({ tab: tab.key as TabKey, page: 1 })}>
                {tab.label}
              </Link>
            </Button>
          ))}
        </div>
        {selectedTab === 'pending' && blockedPendingApplications.length > 0 ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              {blockedPendingApplications.length} application{blockedPendingApplications.length === 1 ? '' : 's'} moved
              back to parents for missing details
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Ask parents to update their profile/documents. These applications reappear once required details are complete.
            </p>
            <div className="mt-2 space-y-1">
              {blockedPendingApplications.slice(0, 3).map((item) => {
                const child = normalizeOne(item.application.children)
                const parent = normalizeOne(item.application.parents)
                const profile = normalizeOne(parent?.user_profiles ?? null)
                const childName = child ? `${child.first_name} ${child.last_name}` : 'Child profile'
                return (
                  <p key={item.application.id} className="text-xs text-amber-900">
                    {childName} ({profile?.full_name ?? 'Parent'}): {item.missing.join(', ')}
                  </p>
                )
              })}
            </div>
          </div>
        ) : null}
        {renderApplicationList(selectedApplications, {
          ecdId,
          centreName: centre?.name ?? 'Your centre',
          templates,
        })}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Page {currentPage} of {totalPages} | {totalForSelected} results
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild disabled={!canPrev}>
              <Link href={buildApplicationsHref({ page: currentPage - 1 })}>Previous</Link>
            </Button>
            <Button size="sm" variant="outline" asChild disabled={!canNext}>
              <Link href={buildApplicationsHref({ page: currentPage + 1 })}>Next</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="details" className="mt-6 rounded-2xl border border-border bg-card/90 p-4 sm:p-6 text-foreground">
        <h2 className="text-lg font-semibold">Application details</h2>
        {focusedApplication ? (
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Application:</span> {focusedApplication.application_number}
            </p>
            <p>
              <span className="font-medium text-slate-900">Status:</span> {focusedApplication.status}
            </p>
            <p>
              <span className="font-medium text-slate-900">Child:</span>{' '}
              {focusedChild ? `${focusedChild.first_name} ${focusedChild.last_name}` : 'Unknown child'}
            </p>
            <p>
              <span className="font-medium text-slate-900">Parent:</span>{' '}
              {focusedParentProfile?.full_name ?? 'Unknown parent'}
            </p>
            <p>
              <span className="font-medium text-slate-900">Parent phone:</span>{' '}
              {focusedParentProfile?.phone ?? focusedParent?.alt_phone ?? 'No phone'}
            </p>
            <p>
              <span className="font-medium text-slate-900">Submitted:</span>{' '}
              {formatDate(focusedApplication.submitted_at)}
            </p>
            {focusedApplication.parent_message ? (
              <p>
                <span className="font-medium text-slate-900">Parent message:</span> {focusedApplication.parent_message}
              </p>
            ) : null}
            {focusedApplication.admin_notes ? (
              <p>
                <span className="font-medium text-slate-900">Admin notes:</span> {focusedApplication.admin_notes}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Select an application to view full details.</p>
        )}
      </section>
    </EcdOsShell>
  )
}



