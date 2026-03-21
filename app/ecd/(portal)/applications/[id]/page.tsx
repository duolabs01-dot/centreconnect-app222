import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, FileText, History, UserRound } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { toApplicationDocumentLabels } from '@/lib/admissions/application-documents'
import { getRejectionReasonLabel } from '@/lib/admissions/rejection-reasons'
import { resolveAgeGroupFeeForDateOfBirth } from '@/lib/pricing/age-group-pricing'
import { buildRegistrationStatusLabel, getRegistrationSnapshot } from '@/lib/admissions/centre-registration'
import { StatusUpdateForm } from './status-update-form'
import { TemplateSendPanel } from './template-send-panel'
import { FeeAgreementCard } from './fee-agreement-card'
import { SendReminderButton } from '../send-reminder-button'
import { CoParentDocumentRequestPanel } from './co-parent-document-request-panel'
import { OfferCreationCard } from './offer-creation-card'
import { RejectApplicationCard } from './reject-application-card'
import { ParentDossierCards } from '@/components/ecd/parent-dossier-cards'
import { buildParentDossierForApplication } from '@/lib/ecd/parent-dossier'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Application Details - CentreConnect',
  description: 'Review child application details and manage admission status.',
  openGraph: { images: ['/og-image.png'] },
}

type ApplicationDetailsPageProps = {
  params: { id: string } | Promise<{ id: string }>
  searchParams?: { lookup?: string } | Promise<{ lookup?: string }>
}

type HistoryItem = {
  id: string
  old_status: string | null
  new_status: string
  notes: string | null
  changed_by: string | null
  created_at: string
}

type Template = { template_key: string; title: string; body: string }

type ChildProfile = {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  allergies: string | string[] | null
  medical_conditions: string | string[] | null
  special_needs: string | null
  intake_documents?: unknown
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
  start_date: string | null
  offer_made_at: string | null
  offer_sent_at: string | null
  offer_expires_at: string | null
  offer_accepted_at: string | null
  offer_breakdown: unknown
  offer_conditions: string | null
  offer_penalties: string | null
  offer_legal_agreement: string | null
  offer_legal_version: string | null
  rejection_reason_code: string | null
  rejection_reason_note: string | null
  rejected_at: string | null
  monthly_fee_cents: number | null
  missing_documents: unknown
  children: unknown
  parents: unknown
}

type OfferBreakdownItem = {
  key: string
  label: string
  amount_cents: number
  frequency: 'monthly' | 'once'
}

type ParticipantOption = { userId: string; label: string; roleLabel: string; guardianId: string | null }

type DbQueryClient = {
  from: (table: string) => any
}

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

function phoneHref(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D+/g, '')
  if (digits.length < 8) return null
  return {
    tel: `tel:${digits}`,
    whatsapp: `https://wa.me/${digits}?text=${encodeURIComponent('Hi, saw your application on CentreConnect and would like to chat.')}`,
  }
}

const parseTextArray = (value: unknown) => (Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [])
const parseMissingDocuments = (value: unknown) => parseTextArray(value)

function parseOfferBreakdown(value: unknown): OfferBreakdownItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const key = typeof record.key === 'string' ? record.key.trim() : label.toLowerCase().replaceAll(/\s+/g, '_')
      const frequency = record.frequency === 'once' ? 'once' : record.frequency === 'monthly' ? 'monthly' : null
      const amountRaw = Number(record.amount_cents)
      if (!label || !frequency || !Number.isFinite(amountRaw)) return null
      return {
        key: key || 'line_item',
        label,
        amount_cents: Math.max(0, Math.round(amountRaw)),
        frequency,
      }
    })
    .filter((entry): entry is OfferBreakdownItem => Boolean(entry))
}

const normalizeName = (value: string | null | undefined, fallback = 'Unknown user') => (value?.trim() ? value.trim() : fallback)

function includesMissingColumnError(errorMessage: string | null | undefined) {
  if (!errorMessage) return false
  const normalized = errorMessage.toLowerCase()
  return normalized.includes('column') && (normalized.includes('does not exist') || normalized.includes('could not find'))
}

function safeDecodeRouteToken(value: string) {
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}

function extractFeeNoteFromAdminNotes(value: string | null | undefined) {
  if (!value) return null
  const feeNoteLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => line.startsWith('Fee note: '))

  return feeNoteLine ? feeNoteLine.slice('Fee note: '.length).trim() : null
}

async function fetchApplicationForRoute(
  client: DbQueryClient,
  ecdId: string,
  routeToken: string,
  preferNumberLookup: boolean
) {
  const selectVariants: string[] = [
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,start_date,offer_made_at,offer_sent_at,offer_expires_at,offer_accepted_at,offer_breakdown,offer_conditions,offer_penalties,offer_legal_agreement,offer_legal_version,rejection_reason_code,rejection_reason_note,rejected_at,monthly_fee_cents,missing_documents,children(id,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,special_needs,intake_documents),parents(id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))',
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,start_date,offer_made_at,offer_sent_at,offer_expires_at,offer_accepted_at,offer_breakdown,offer_conditions,offer_penalties,offer_legal_agreement,offer_legal_version,rejection_reason_code,rejection_reason_note,rejected_at,monthly_fee_cents,missing_documents,children(id,first_name,last_name,date_of_birth,gender,intake_documents),parents(id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,user_profiles(full_name,phone))',
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,offer_accepted_at,monthly_fee_cents,missing_documents,children(id,first_name,last_name,date_of_birth,gender,intake_documents),parents(id,alt_phone,user_profiles(full_name,phone))',
  ]

  for (const selectClause of selectVariants) {
    const byId = () =>
      client.from('applications').select(selectClause).eq('ecd_id', ecdId).eq('id', routeToken).maybeSingle()
    const byNumber = () =>
      client.from('applications').select(selectClause).eq('ecd_id', ecdId).eq('application_number', routeToken).maybeSingle()

    const primary = preferNumberLookup ? await byNumber() : await byId()
    if (primary.data) return primary.data as unknown as ApplicationRow

    const fallback = preferNumberLookup ? await byId() : await byNumber()
    if (fallback.data) return fallback.data as unknown as ApplicationRow

    const canRetryWithLeanSelect =
      includesMissingColumnError(primary.error?.message) || includesMissingColumnError(fallback.error?.message)
    if (!canRetryWithLeanSelect) break
  }

  return null
}

async function fetchApplicationWithSplitQueries(
  client: DbQueryClient,
  ecdId: string,
  routeToken: string,
  preferNumberLookup: boolean
) {
  const baseSelect =
    'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,parent_id,child_id,reviewed_at,decided_at,start_date,offer_made_at,offer_sent_at,offer_expires_at,offer_accepted_at,offer_breakdown,offer_conditions,offer_penalties,offer_legal_agreement,offer_legal_version,rejection_reason_code,rejection_reason_note,rejected_at,monthly_fee_cents,missing_documents'
  const byId = () =>
    client.from('applications').select(baseSelect).eq('ecd_id', ecdId).eq('id', routeToken).maybeSingle()
  const byNumber = () =>
    client.from('applications').select(baseSelect).eq('ecd_id', ecdId).eq('application_number', routeToken).maybeSingle()

  const primary = preferNumberLookup ? await byNumber() : await byId()
  const fallback = primary.data ? null : preferNumberLookup ? await byId() : await byNumber()
  const baseRecord = ((primary.data ?? fallback?.data) as Record<string, unknown> | null) ?? null
  if (!baseRecord) return null

  const childId = typeof baseRecord.child_id === 'string' ? baseRecord.child_id : null
  const parentId = typeof baseRecord.parent_id === 'string' ? baseRecord.parent_id : null

  const [childResult, parentResult] = await Promise.all([
    childId
      ? client
          .from('children')
          .select('id,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,special_needs,intake_documents')
          .eq('id', childId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    parentId
      ? client
          .from('parents')
          .select(
            'id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone)'
          )
          .eq('id', parentId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    ...baseRecord,
    children: childResult.data ?? null,
    parents: parentResult.data ?? null,
  } as unknown as ApplicationRow
}

export default async function ApplicationDetailsPage({ params, searchParams }: ApplicationDetailsPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    Promise.resolve(params),
    Promise.resolve(searchParams),
  ])
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const adminClient = createAdminClient()
  const routeToken = safeDecodeRouteToken(id)
  const application =
    (await fetchApplicationForRoute(supabase, ecdId, routeToken, resolvedSearchParams?.lookup === 'number')) ??
    (await fetchApplicationForRoute(adminClient, ecdId, routeToken, resolvedSearchParams?.lookup === 'number')) ??
    (await fetchApplicationWithSplitQueries(supabase, ecdId, routeToken, resolvedSearchParams?.lookup === 'number')) ??
    (await fetchApplicationWithSplitQueries(adminClient, ecdId, routeToken, resolvedSearchParams?.lookup === 'number'))

  if (!application) {
    return (
      <>
        <div className="mx-auto max-w-2xl py-8">
          <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900">We couldn&apos;t load this application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-amber-900">
              <p>This record may have been moved, archived, or is missing some older profile fields.</p>
              <Button asChild className="h-11 rounded-2xl bg-teal-600 px-5 font-bold text-white hover:bg-teal-700">
                <Link href="/ecd/applications" prefetch={false}>
                  Back to Applications
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const child = normalizeOne(application.children as ChildProfile | ChildProfile[] | null)
  const parent = normalizeOne(application.parents as ParentProfile | ParentProfile[] | null)
  const parentProfile = normalizeOne(parent?.user_profiles ?? null)
  const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? ''
  const parentName = normalizeName(parentProfile?.full_name, 'Primary parent')
  const childName = child ? `${child.first_name} ${child.last_name}` : 'Child'
  const registrationSnapshot = getRegistrationSnapshot(child?.intake_documents)
  const registrationStatusLabel = buildRegistrationStatusLabel(registrationSnapshot)
  const registrationStatusClasses = registrationSnapshot?.submittedAt
    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border border-amber-200 bg-amber-50 text-amber-800'

  const [centreResult, templatesResult, historyResult, requestHistoryRaw] = await Promise.all([
    supabase.from('ecd_centres').select('name,age_group_pricing,monthly_fee_min').eq('id', ecdId).maybeSingle(),
    supabase.from('communication_templates').select('template_key,title,body').eq('is_active', true).order('title'),
    supabase
      .from('application_status_history')
      .select('id,old_status,new_status,notes,changed_by,created_at')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('child_document_requests')
      .select(
        'id,requested_by_user_id,requested_for_user_id,requested_by_label,requested_for_label,document_codes,message,status,requested_at,acknowledged_at,completed_at'
      )
      .eq('application_id', application.id)
      .order('requested_at', { ascending: false })
      .limit(40),
  ])

  const dossier = await buildParentDossierForApplication({
    supabase,
    ecdId,
    childId: application.child_id,
    childName,
    parentId: application.parent_id ?? parent?.id ?? null,
    parentSnapshot: parent ?? null,
  })

  const centreName = centreResult.data?.name ?? 'Your creche'
  const contactName = dossier.primaryParent.fullName
  const contactPhone = dossier.primaryParent.phone ?? dossier.primaryParent.alternatePhone ?? parentPhone ?? null
  const contactLinks = phoneHref(contactPhone)
  const templates = (templatesResult.data ?? []) as Template[]
  const history = (historyResult.data ?? []) as HistoryItem[]
  const requestHistory =
    ((requestHistoryRaw.data ?? []) as DocumentRequestHistoryRow[]).map((item) => ({
      ...item,
      document_codes: parseTextArray(item.document_codes),
    })) || []
  const documentRequestError =
    requestHistoryRaw.error?.message?.toLowerCase().includes('child_document_requests') ? null : requestHistoryRaw.error?.message ?? null

  const participants: ParticipantOption[] = [
    {
      userId: application.parent_id,
      label: dossier.primaryParent.fullName,
      roleLabel: 'Primary parent',
      guardianId: null,
    },
    ...dossier.coParents
      .filter((guardian) => guardian.linkedUserId)
      .map((guardian) => ({
        userId: guardian.linkedUserId!,
        label: guardian.fullName,
        roleLabel: guardian.relationship?.trim() || 'Co-parent',
        guardianId: guardian.id,
      })),
  ]

  const missingCodes = parseMissingDocuments(application.missing_documents)
  const missingLabels = toApplicationDocumentLabels(missingCodes)
  const readiness = evaluateApplicationIntakeReadiness({
    parent: {
      fullName: dossier.primaryParent.fullName,
      phone: dossier.primaryParent.phone ?? dossier.primaryParent.alternatePhone,
      guardianRelationship: dossier.primaryParent.relationship,
      emergencyContactName: dossier.primaryParent.emergencyContactName,
      emergencyContactPhone: dossier.primaryParent.emergencyContactPhone,
      idVerificationStatus: dossier.primaryParent.verificationStatus,
    },
    child: {
      firstName: child?.first_name ?? null,
      lastName: child?.last_name ?? null,
      dateOfBirth: child?.date_of_birth ?? null,
      gender: child?.gender ?? null,
    },
    docTypes: dossier.documents.map((doc) => doc.docType),
  })
  const resolvedAgeFee = resolveAgeGroupFeeForDateOfBirth({
    dateOfBirth: child?.date_of_birth ?? null,
    ageGroupPricing: centreResult.data?.age_group_pricing,
    fallbackMonthlyFeeRand: centreResult.data?.monthly_fee_min ?? null,
  })
  const effectiveMonthlyFeeCents =
    typeof application.monthly_fee_cents === 'number' && application.monthly_fee_cents > 0
      ? application.monthly_fee_cents
      : resolvedAgeFee?.monthlyFeeCents ?? 0
  const offerBreakdown = parseOfferBreakdown(application.offer_breakdown)
  const offerMonthlyTotalCents = offerBreakdown
    .filter((item) => item.frequency === 'monthly')
    .reduce((sum, item) => sum + item.amount_cents, 0)
  const offerOnceOffTotalCents = offerBreakdown
    .filter((item) => item.frequency === 'once')
    .reduce((sum, item) => sum + item.amount_cents, 0)
  const rejectionReasonLabel = getRejectionReasonLabel(application.rejection_reason_code)
  const communicationsHref = dossier.primaryParent.userId
    ? `/ecd/communications?recipient=${encodeURIComponent(dossier.primaryParent.userId)}&contextType=application&contextId=${encodeURIComponent(application.id)}`
    : null

  return (
    <>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/ecd/applications" prefetch={false} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Back to applications
          </Link>
          <StatusBadge status={application.status} />
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-slate-900">Case file {application.application_number}</CardTitle>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="font-bold text-slate-800">Submitted:</span> {formatDate(application.submitted_at)}</p>
              <p><span className="font-bold text-slate-800">Reviewed:</span> {application.reviewed_at ? formatDate(application.reviewed_at) : 'Not yet'}</p>
              <p><span className="font-bold text-slate-800">Decision:</span> {application.decided_at ? formatDate(application.decided_at) : 'Pending'}</p>
              <p><span className="font-bold text-slate-800">Offer accepted:</span> {application.offer_accepted_at ? formatDate(application.offer_accepted_at) : 'No'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${registrationStatusClasses}`}>
                {registrationStatusLabel}
              </span>
              {missingLabels.length > 0 ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  Missing docs: {missingLabels.slice(0, 3).join(', ')}{missingLabels.length > 3 ? '…' : ''}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  Docs ready
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SendReminderButton applicationId={application.id} />
              <Button asChild variant="outline" className="h-11 rounded-2xl" disabled={!contactLinks?.tel}>
                <a href={contactLinks?.tel ?? '#'} aria-disabled={!contactLinks?.tel}>Call parent</a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl" disabled={!contactLinks?.whatsapp}>
                <a href={contactLinks?.whatsapp ?? '#'} target="_blank" rel="noreferrer" aria-disabled={!contactLinks?.whatsapp}>WhatsApp</a>
              </Button>
              {communicationsHref ? (
                <Button asChild variant="outline" className="h-11 rounded-2xl">
                  <Link prefetch={false} href={communicationsHref}>
                    Send message
                  </Link>
                </Button>
              ) : null}
            </div>
            {offerBreakdown.length > 0 ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
                <p className="font-semibold">
                  Offer breakdown: Monthly R{(offerMonthlyTotalCents / 100).toFixed(2)} | Once-off R{(offerOnceOffTotalCents / 100).toFixed(2)}
                </p>
                {application.offer_expires_at ? <p className="mt-1">Offer expires on {formatDate(application.offer_expires_at)}.</p> : null}
              </div>
            ) : null}
            {application.status === 'rejected' ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <p className="font-semibold">Rejection reason: {rejectionReasonLabel}</p>
                {application.rejection_reason_note ? <p className="mt-1">{application.rejection_reason_note}</p> : null}
              </div>
            ) : null}
            <div className={`rounded-2xl border p-3 text-xs ${readiness.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-semibold">Readiness: {readiness.completionPct}% complete</p>
              {!readiness.ready && readiness.missing.length > 0 ? <p className="mt-1">Missing: {readiness.missing.slice(0, 5).join(', ')}</p> : null}
              {missingLabels.length > 0 ? <p className="mt-1">Flagged missing documents: {missingLabels.join(', ')}</p> : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <UserRound className="h-4 w-4 text-teal-600" />
                  Child info
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-900">Name:</span> {childName}</p>
                <p><span className="font-semibold text-slate-900">DOB:</span> {child?.date_of_birth ? formatDate(child.date_of_birth) : 'Not provided'}</p>
                <p><span className="font-semibold text-slate-900">Gender:</span> {child?.gender ?? 'Not provided'}</p>
                <p><span className="font-semibold text-slate-900">Allergies:</span> {Array.isArray(child?.allergies) ? child?.allergies.join(', ') : child?.allergies || 'None listed'}</p>
                <p><span className="font-semibold text-slate-900">Conditions:</span> {Array.isArray(child?.medical_conditions) ? child?.medical_conditions.join(', ') : child?.medical_conditions || 'None listed'}</p>
                <p><span className="font-semibold text-slate-900">Special needs:</span> {child?.special_needs || 'None listed'}</p>
                <p><span className="font-semibold text-slate-900">Registration:</span> {registrationStatusLabel}</p>
              </CardContent>
            </Card>

            <ParentDossierCards dossier={dossier} communicationsHref={communicationsHref} />

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <History className="h-4 w-4 text-teal-600" />
                  Status history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-600">No status history entries yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((entry) => (
                      <li key={entry.id} className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.old_status ? `${entry.old_status} -> ${entry.new_status}` : entry.new_status}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDate(entry.created_at)}{entry.changed_by ? ` | by ${entry.changed_by}` : ''}
                        </p>
                        {entry.notes ? <p className="mt-1 text-xs text-slate-700">{entry.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <OfferCreationCard
              applicationId={application.id}
              currentStatus={application.status}
              offerAcceptedAt={application.offer_accepted_at}
              childName={childName}
              parentName={contactName}
              initialStartDate={application.start_date}
              initialOfferExpiresAt={application.offer_expires_at}
              initialOfferConditions={application.offer_conditions}
              initialOfferPenalties={application.offer_penalties}
              initialOfferBreakdown={offerBreakdown}
              initialMonthlyFeeCents={effectiveMonthlyFeeCents}
            />

            <RejectApplicationCard
              applicationId={application.id}
              currentStatus={application.status}
              offerAcceptedAt={application.offer_accepted_at}
            />

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Update status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusUpdateForm
                  applicationId={application.id}
                  currentStatus={application.status}
                  currentNotes={application.admin_notes}
                  currentOfferAcceptedAt={application.offer_accepted_at}
                />
              </CardContent>
            </Card>

            {['approved', 'enrolled'].includes(application.status) && offerBreakdown.length === 0 ? (
              <FeeAgreementCard
                applicationId={application.id}
                initialMonthlyFeeCents={effectiveMonthlyFeeCents}
                initialFeeNotes={extractFeeNoteFromAdminNotes(application.admin_notes)}
              />
            ) : null}

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Template message</CardTitle>
              </CardHeader>
              <CardContent>
                <TemplateSendPanel
                  ecdId={application.ecd_id}
                  parentId={application.parent_id ?? ''}
                  applicationId={application.id}
                  centreName={centreName}
                  childName={childName}
                  parentName={contactName}
                  applicationNumber={application.application_number}
                  status={application.status}
                  parentPhone={contactPhone}
                  templates={templates}
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Request document upload (linked parents)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documentRequestError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Unable to load request history right now: {documentRequestError}
                  </div>
                ) : null}
                <CoParentDocumentRequestPanel applicationId={application.id} childId={application.child_id} participants={participants} initialHistory={requestHistory} />
              </CardContent>
            </Card>

            {missingLabels.length > 0 ? (
              <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    Outstanding documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-900">{missingLabels.join(', ')}</CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  )
}



