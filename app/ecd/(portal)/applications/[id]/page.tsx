import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, FileText, History, Phone, UserRound, Users } from 'lucide-react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { toApplicationDocumentLabels } from '@/lib/admissions/application-documents'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatusUpdateForm } from './status-update-form'
import { TemplateSendPanel } from './template-send-panel'
import { FeeAgreementCard } from './fee-agreement-card'
import { QuickDecisionActions } from './quick-decision-actions'
import { SendReminderButton } from '../send-reminder-button'
import { CoParentDocumentRequestPanel } from './co-parent-document-request-panel'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Application Details - CentreConnect',
  description: 'Review child application details and manage admission status.',
  openGraph: { images: ['/og-image.png'] },
}

type ApplicationDetailsPageProps = {
  params: { id: string }
  searchParams?: { lookup?: string }
}

type HistoryItem = {
  id: string
  old_status: string | null
  new_status: string
  notes: string | null
  changed_by: string | null
  created_at: string
}

type ParentDocument = {
  id: string
  doc_type: string | null
  file_name: string | null
  verification_status: string | null
  created_at: string
}

type Template = { template_key: string; title: string; body: string }

type ChildProfile = {
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  allergies: string | string[] | null
  medical_conditions: string | string[] | null
  special_needs: string | null
}

type ParentProfile = {
  id: string
  alt_phone: string | null
  billing_email: string | null
  address: string | null
  suburb: string | null
  city: string | null
  province: string | null
  guardian_relationship: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  id_verification_status: string | null
  user_profiles: { full_name: string; phone: string | null } | Array<{ full_name: string; phone: string | null }> | null
}

type ApplicationRow = {
  id: string
  application_number: string
  status: string
  submitted_at: string
  parent_message: string | null
  admin_notes: string | null
  ecd_id: string
  parent_id: string
  child_id: string
  reviewed_at: string | null
  decided_at: string | null
  offer_accepted_at: string | null
  monthly_fee_cents: number | null
  fee_notes: string | null
  missing_documents: unknown
  children: unknown
  parents: unknown
}

type GuardianLinkRow = {
  id: string
  full_name: string | null
  relationship: string | null
  phone: string | null
  email: string | null
  linked_user_id: string | null
  invite_sent_at: string | null
  invite_accepted_at: string | null
  invite_link_viewed_at: string | null
  invite_link_clicked_at: string | null
  invite_registered_at: string | null
  invite_claimed_at: string | null
  invite_token_expires_at: string | null
}

type ParticipantOption = { userId: string; label: string; roleLabel: string; guardianId: string | null }
type DocumentRequestHistoryRow = {
  id: string
  requested_by_user_id: string
  requested_for_user_id: string
  requested_by_label: string | null
  requested_for_label: string | null
  document_codes: string[]
  message: string
  status: string
  requested_at: string
  acknowledged_at: string | null
  completed_at: string | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const parseTextArray = (value: unknown) => (Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [])
const parseMissingDocuments = (value: unknown) => parseTextArray(value)
const normalizeName = (value: string | null | undefined, fallback = 'Unknown user') => (value?.trim() ? value.trim() : fallback)
const formatEventDate = (value: string | null | undefined) => (value ? formatDate(value) : 'Not yet')

function includesMissingColumnError(errorMessage: string | null | undefined) {
  if (!errorMessage) return false
  const normalized = errorMessage.toLowerCase()
  return normalized.includes('column') && (normalized.includes('does not exist') || normalized.includes('could not find'))
}

async function fetchApplicationForRoute(
  supabase: Awaited<ReturnType<typeof requireEcdPortalSession>>['supabase'],
  ecdId: string,
  routeToken: string,
  preferNumberLookup: boolean
) {
  const selectVariants = [
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,offer_accepted_at,monthly_fee_cents,fee_notes,missing_documents,children(id,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,special_needs),parents(id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))',
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,offer_accepted_at,monthly_fee_cents,fee_notes,missing_documents,children(id,first_name,last_name,date_of_birth,gender),parents(id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,user_profiles(full_name,phone))',
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,offer_accepted_at,monthly_fee_cents,fee_notes,missing_documents,children(id,first_name,last_name,date_of_birth,gender),parents(id,alt_phone,user_profiles(full_name,phone))',
  ] as const

  for (const selectClause of selectVariants) {
    const byId = () =>
      supabase.from('applications').select(selectClause).eq('ecd_id', ecdId).eq('id', routeToken).maybeSingle()
    const byNumber = () =>
      supabase.from('applications').select(selectClause).eq('ecd_id', ecdId).eq('application_number', routeToken).maybeSingle()

    const primary = preferNumberLookup ? await byNumber() : await byId()
    if (primary.data) return primary.data as ApplicationRow

    const fallback = preferNumberLookup ? await byId() : await byNumber()
    if (fallback.data) return fallback.data as ApplicationRow

    const canRetryWithLeanSelect =
      includesMissingColumnError(primary.error?.message) || includesMissingColumnError(fallback.error?.message)
    if (!canRetryWithLeanSelect) {
      break
    }
  }

  return null
}

async function fetchParentDocuments(
  supabase: Awaited<ReturnType<typeof requireEcdPortalSession>>['supabase'],
  parentId: string | null
) {
  if (!parentId) return { rows: [] as ParentDocument[], error: null as string | null }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('parent_documents')
      .select('id,doc_type,file_name,verification_status,created_at')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return { rows: [] as ParentDocument[], error: error.message }
    return { rows: (data ?? []) as ParentDocument[], error: null as string | null }
  } catch {
    const fallback = await supabase
      .from('parent_documents')
      .select('id,doc_type,file_name,verification_status,created_at')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (fallback.error) return { rows: [] as ParentDocument[], error: 'Document access is unavailable right now.' }
    return { rows: (fallback.data ?? []) as ParentDocument[], error: null as string | null }
  }
}

export default async function ApplicationDetailsPage({ params, searchParams }: ApplicationDetailsPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const routeToken = decodeURIComponent(params.id).trim()
  const application = await fetchApplicationForRoute(supabase, ecdId, routeToken, searchParams?.lookup === 'number')
  if (!application) {
    return (
      <EcdOsShell
        title="Application Details"
        description="Review full child enrollment details and take quick action."
        roleLabel={role === 'ecd_admin' ? 'Creche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
        userEmail={user.email ?? 'Unknown email'}
      >
        <div className="mx-auto max-w-2xl py-8">
          <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900">We couldn&apos;t load this application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-amber-900">
              <p>
                This record may have been moved, archived, or is missing some older profile fields.
              </p>
              <Button asChild className="h-11 rounded-2xl bg-teal-600 px-5 font-bold text-white hover:bg-teal-700">
                <Link href="/ecd/applications" prefetch={false}>
                  Back to Applications
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </EcdOsShell>
    )
  }

  const child = normalizeOne(application.children as ChildProfile | ChildProfile[] | null)
  const parent = normalizeOne(application.parents as ParentProfile | ParentProfile[] | null)
  const parentProfile = normalizeOne(parent?.user_profiles ?? null)
  const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? ''
  const parentName = normalizeName(parentProfile?.full_name, 'Primary parent')
  const childName = child ? `${child.first_name} ${child.last_name}` : 'Child'

  const [centreResult, templatesResult, historyResult, documentsResult, guardiansRaw, requestHistoryRaw] = await Promise.all([
    supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
    supabase.from('communication_templates').select('template_key,title,body').eq('is_active', true).order('title'),
    supabase
      .from('application_status_history')
      .select('id,old_status,new_status,notes,changed_by,created_at')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false })
      .limit(40),
    fetchParentDocuments(supabase, parent?.id ?? null),
    supabase
      .from('guardians')
      .select(
        'id,full_name,relationship,phone,email,linked_user_id,invite_sent_at,invite_accepted_at,invite_link_viewed_at,invite_link_clicked_at,invite_registered_at,invite_claimed_at,invite_token_expires_at'
      )
      .eq('child_id', application.child_id)
      .eq('parent_id', application.parent_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('child_document_requests')
      .select(
        'id,requested_by_user_id,requested_for_user_id,requested_by_label,requested_for_label,document_codes,message,status,requested_at,acknowledged_at,completed_at'
      )
      .eq('application_id', application.id)
      .order('requested_at', { ascending: false })
      .limit(40),
  ])

  const centreName = centreResult.data?.name ?? 'Your creche'
  const templates = (templatesResult.data ?? []) as Template[]
  const history = (historyResult.data ?? []) as HistoryItem[]
  const parentDocs = documentsResult.rows
  const docsError = documentsResult.error
  const guardians = ((guardiansRaw.data ?? []) as GuardianLinkRow[]) || []
  const guardiansError = guardiansRaw.error?.message ?? null
  const requestHistory =
    ((requestHistoryRaw.data ?? []) as DocumentRequestHistoryRow[]).map((item) => ({
      ...item,
      document_codes: parseTextArray(item.document_codes),
    })) || []
  const documentRequestError =
    requestHistoryRaw.error?.message?.toLowerCase().includes('child_document_requests') ? null : requestHistoryRaw.error?.message ?? null

  const linkedUserIds = Array.from(new Set(guardians.map((g) => g.linked_user_id).filter((v): v is string => Boolean(v))))
  const profileIds = Array.from(new Set([application.parent_id, ...linkedUserIds]))
  const linkedProfiles =
    profileIds.length > 0
      ? await supabase.from('user_profiles').select('id,full_name').in('id', profileIds)
      : { data: [] as Array<{ id: string; full_name: string | null }> }
  const profileById = new Map((linkedProfiles.data ?? []).map((profile) => [profile.id, profile]))

  const participants: ParticipantOption[] = [
    { userId: application.parent_id, label: normalizeName(profileById.get(application.parent_id)?.full_name, parentName), roleLabel: 'Primary parent', guardianId: null },
  ]
  for (const guardian of guardians) {
    if (!guardian.linked_user_id) continue
    if (participants.some((p) => p.userId === guardian.linked_user_id)) continue
    participants.push({
      userId: guardian.linked_user_id,
      label: normalizeName(profileById.get(guardian.linked_user_id)?.full_name, guardian.full_name ?? 'Co-parent'),
      roleLabel: guardian.relationship?.trim() || 'Co-parent',
      guardianId: guardian.id,
    })
  }

  const missingCodes = parseMissingDocuments(application.missing_documents)
  const missingLabels = toApplicationDocumentLabels(missingCodes)
  const readiness = evaluateApplicationIntakeReadiness({
    parent: {
      fullName: parentProfile?.full_name ?? null,
      phone: parentPhone || null,
      guardianRelationship: parent?.guardian_relationship ?? null,
      emergencyContactName: parent?.emergency_contact_name ?? null,
      emergencyContactPhone: parent?.emergency_contact_phone ?? null,
      idVerificationStatus: parent?.id_verification_status ?? null,
    },
    child: { firstName: child?.first_name ?? null, lastName: child?.last_name ?? null, dateOfBirth: child?.date_of_birth ?? null, gender: child?.gender ?? null },
    docTypes: docsError ? [] : parentDocs.map((doc) => doc.doc_type),
  })

  return (
    <EcdOsShell
      title="Application Details"
      description="Review full child enrollment details and take quick action."
      roleLabel={role === 'ecd_admin' ? 'Creche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/ecd/applications" prefetch={false} className="text-sm font-semibold text-teal-700 hover:text-teal-800">Back to applications</Link>
          <StatusBadge status={application.status} />
        </div>
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-slate-900">Case File {application.application_number}</CardTitle>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="font-bold text-slate-800">Submitted:</span> {formatDate(application.submitted_at)}</p>
              <p><span className="font-bold text-slate-800">Reviewed:</span> {application.reviewed_at ? formatDate(application.reviewed_at) : 'Not yet'}</p>
              <p><span className="font-bold text-slate-800">Decision:</span> {application.decided_at ? formatDate(application.decided_at) : 'Pending'}</p>
              <p><span className="font-bold text-slate-800">Offer Accepted:</span> {application.offer_accepted_at ? formatDate(application.offer_accepted_at) : 'No'}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuickDecisionActions applicationId={application.id} currentStatus={application.status} currentNotes={application.admin_notes} currentOfferAcceptedAt={application.offer_accepted_at} />
            <div className="flex flex-wrap gap-2">
              <SendReminderButton applicationId={application.id} />
              {parentPhone ? <Button asChild variant="outline" className="h-11 rounded-2xl"><a href={`tel:${parentPhone}`}>Call Parent</a></Button> : <Button variant="outline" className="h-11 rounded-2xl" disabled>Call Parent</Button>}
              {parent?.id ? <Button asChild variant="outline" className="h-11 rounded-2xl"><Link prefetch={false} href={`/ecd/communications?recipient=${encodeURIComponent(parent.id)}&contextType=application&contextId=${encodeURIComponent(application.id)}`}>Send Message</Link></Button> : null}
            </div>
            <div className={`rounded-2xl border p-3 text-xs ${readiness.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-semibold">Readiness: {readiness.completionPct}% complete</p>
              {!readiness.ready && readiness.missing.length > 0 ? <p className="mt-1">Missing: {readiness.missing.slice(0, 5).join(', ')}</p> : null}
              {missingLabels.length > 0 ? <p className="mt-1">Flagged missing documents: {missingLabels.join(', ')}</p> : null}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-900"><UserRound className="h-4 w-4 text-teal-600" />Child Info</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p><span className="font-semibold text-slate-900">Name:</span> {childName}</p><p><span className="font-semibold text-slate-900">DOB:</span> {child?.date_of_birth ? formatDate(child.date_of_birth) : 'Not provided'}</p><p><span className="font-semibold text-slate-900">Gender:</span> {child?.gender ?? 'Not provided'}</p><p><span className="font-semibold text-slate-900">Allergies:</span> {Array.isArray(child?.allergies) ? child?.allergies.join(', ') : child?.allergies || 'None listed'}</p><p><span className="font-semibold text-slate-900">Conditions:</span> {Array.isArray(child?.medical_conditions) ? child?.medical_conditions.join(', ') : child?.medical_conditions || 'None listed'}</p><p><span className="font-semibold text-slate-900">Special needs:</span> {child?.special_needs || 'None listed'}</p></CardContent></Card>
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-900"><Phone className="h-4 w-4 text-teal-600" />Parent Info</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p><span className="font-semibold text-slate-900">Parent:</span> {parentName}</p><p><span className="font-semibold text-slate-900">Phone:</span> {parentPhone || 'Not provided'}</p><p><span className="font-semibold text-slate-900">Billing email:</span> {parent?.billing_email || 'Not provided'}</p><p><span className="font-semibold text-slate-900">Relationship:</span> {parent?.guardian_relationship || 'Not provided'}</p><p className="sm:col-span-2"><span className="font-semibold text-slate-900">Address:</span> {[parent?.address, parent?.suburb, parent?.city, parent?.province].filter(Boolean).join(', ') || 'Not provided'}</p></CardContent></Card>
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-900"><Users className="h-4 w-4 text-teal-600" />Co-Parent Invite Progress</CardTitle></CardHeader><CardContent className="space-y-3">{guardiansError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Unable to load co-parent links right now: {guardiansError}</div> : guardians.length === 0 ? <p className="text-sm text-slate-600">No co-parent records linked to this child yet.</p> : <ul className="space-y-3">{guardians.map((guardian) => (<li key={guardian.id} className="rounded-2xl border border-slate-200 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">{normalizeName(profileById.get(guardian.linked_user_id ?? '')?.full_name, guardian.full_name ?? 'Co-parent contact')}</p><p className="mt-1 text-xs text-slate-600">{(guardian.relationship || 'Co-parent') + (guardian.phone ? ` | ${guardian.phone}` : '')}</p></div>{guardian.linked_user_id ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Linked</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Pending</span>}</div><div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><p><span className="font-semibold text-slate-800">Sent:</span> {formatEventDate(guardian.invite_sent_at)}</p><p><span className="font-semibold text-slate-800">Viewed:</span> {formatEventDate(guardian.invite_link_viewed_at)}</p><p><span className="font-semibold text-slate-800">Clicked:</span> {formatEventDate(guardian.invite_link_clicked_at)}</p><p><span className="font-semibold text-slate-800">Registered:</span> {formatEventDate(guardian.invite_registered_at)}</p><p><span className="font-semibold text-slate-800">Claimed:</span> {formatEventDate(guardian.invite_claimed_at ?? guardian.invite_accepted_at)}</p><p><span className="font-semibold text-slate-800">Expires:</span> {formatEventDate(guardian.invite_token_expires_at)}</p></div></li>))}</ul>}</CardContent></Card>
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-900"><FileText className="h-4 w-4 text-teal-600" />Documents</CardTitle></CardHeader><CardContent className="space-y-3">{docsError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Unable to load documents right now: {docsError}</div> : parentDocs.length > 0 ? <ul className="space-y-2">{parentDocs.map((doc) => (<li key={doc.id} className="rounded-2xl border border-slate-200 p-3"><p className="text-sm font-semibold text-slate-900">{doc.file_name?.trim() || doc.doc_type?.replace(/_/g, ' ') || 'Document'}</p><p className="mt-1 text-xs text-slate-600">Type: {doc.doc_type ?? 'unknown'} | Status: {doc.verification_status ?? 'uploaded'} | Uploaded: {formatDate(doc.created_at)}</p></li>))}</ul> : <p className="text-sm text-slate-600">No uploaded documents found for this parent profile yet.</p>}</CardContent></Card>
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-900"><History className="h-4 w-4 text-teal-600" />Status History</CardTitle></CardHeader><CardContent className="space-y-2">{history.length === 0 ? <p className="text-sm text-slate-600">No status history entries yet.</p> : <ul className="space-y-2">{history.map((entry) => (<li key={entry.id} className="rounded-2xl border border-slate-200 p-3"><p className="text-sm font-semibold text-slate-900">{entry.old_status ? `${entry.old_status} -> ${entry.new_status}` : entry.new_status}</p><p className="mt-1 text-xs text-slate-600">{formatDate(entry.created_at)}{entry.changed_by ? ` | by ${entry.changed_by}` : ''}</p>{entry.notes ? <p className="mt-1 text-xs text-slate-700">{entry.notes}</p> : null}</li>))}</ul>}</CardContent></Card>
          </div>
          <aside className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base text-slate-900">Update Status</CardTitle></CardHeader><CardContent><StatusUpdateForm applicationId={application.id} currentStatus={application.status} currentNotes={application.admin_notes} currentOfferAcceptedAt={application.offer_accepted_at} /></CardContent></Card>
            {['approved', 'enrolled'].includes(application.status) ? <FeeAgreementCard applicationId={application.id} initialMonthlyFeeCents={application.monthly_fee_cents ?? 0} initialFeeNotes={application.fee_notes} /> : null}
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base text-slate-900">Template Message</CardTitle></CardHeader><CardContent><TemplateSendPanel ecdId={application.ecd_id} parentId={parent?.id ?? ''} applicationId={application.id} centreName={centreName} childName={childName} parentName={parentName} applicationNumber={application.application_number} status={application.status} parentPhone={parentPhone || null} templates={templates} /></CardContent></Card>
            <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base text-slate-900">Request Document Upload (Linked Parents)</CardTitle></CardHeader><CardContent className="space-y-3">{documentRequestError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Unable to load request history right now: {documentRequestError}</div> : null}<CoParentDocumentRequestPanel applicationId={application.id} childId={application.child_id} participants={participants} initialHistory={requestHistory} /></CardContent></Card>
            {missingLabels.length > 0 ? <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-amber-900"><AlertCircle className="h-4 w-4" />Outstanding Documents</CardTitle></CardHeader><CardContent className="text-sm text-amber-900">{missingLabels.join(', ')}</CardContent></Card> : null}
          </aside>
        </div>
      </div>
    </EcdOsShell>
  )
}
