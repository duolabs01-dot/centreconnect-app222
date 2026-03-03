import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApplicationDetailClient from './ApplicationDetailClient'
import { canShowMultipleApplicationsFlag } from '@/lib/utils/applications/privacy'

type ApplicationDetailPageProps = {
  params: {
    id: string
  }
}

type StatusHistoryRow = {
  new_status: string
  created_at: string
  notes: string | null
}

type ApplicationRow = {
  id: string
  application_number: string
  status: string
  missing_documents: unknown
  submitted_at: string
  child_id: string
  ecd_id: string
  start_date: string | null
  parent_message: string | null
  admin_notes: string | null
  offer_breakdown: unknown
  offer_conditions: string | null
  offer_penalties: string | null
  offer_legal_agreement: string | null
  offer_expires_at: string | null
  rejection_reason_code: string | null
  rejection_reason_note: string | null
  offer_accepted_at: string | null
  share_multiple_flag: boolean | null
  ecd_centres:
    | { name: string; suburb: string; slug: string }
    | Array<{ name: string; suburb: string; slug: string }>
    | null
  children:
    | { first_name: string; last_name: string }
    | Array<{ first_name: string; last_name: string }>
    | null
  application_status_history: StatusHistoryRow[] | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeMissingDocuments(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

type OfferBreakdownItem = {
  key: string
  label: string
  amount_cents: number
  frequency: 'monthly' | 'once'
}

function parseOfferBreakdown(value: unknown): OfferBreakdownItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const key = typeof record.key === 'string' ? record.key.trim() : ''
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const amount = Number(record.amount_cents)
      const frequency = record.frequency === 'once' ? 'once' : record.frequency === 'monthly' ? 'monthly' : null
      if (!key || !label || !Number.isFinite(amount) || !frequency) return null
      return {
        key,
        label,
        amount_cents: Math.max(0, Math.round(amount)),
        frequency,
      }
    })
    .filter((item): item is OfferBreakdownItem => Boolean(item))
}

export default async function ParentApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: application } = await supabase
    .from('applications')
    .select(`
      id, application_number, status, missing_documents, submitted_at, child_id, ecd_id,
      start_date, parent_message, admin_notes, offer_breakdown, offer_conditions, offer_penalties,
      offer_legal_agreement, offer_expires_at, rejection_reason_code, rejection_reason_note,
      offer_accepted_at, share_multiple_flag,
      ecd_centres (name, suburb, slug),
      children (first_name, last_name),
      application_status_history (new_status, created_at, notes)
    `)
    .eq('id', params.id)
    .eq('parent_id', user.id)
    .single()

  if (!application) notFound()

  const appRow = application as ApplicationRow
  const centre = normalizeOne(appRow.ecd_centres)
  const child = normalizeOne(appRow.children)
  const childFallback = child
    ? null
    : await supabase
        .from('children')
        .select('first_name,last_name')
        .eq('id', appRow.child_id)
        .maybeSingle()
  const resolvedChildFirstName = child?.first_name ?? childFallback?.data?.first_name ?? 'Child'
  const resolvedChildLastName = child?.last_name ?? childFallback?.data?.last_name ?? ''
  const history = [...(appRow.application_status_history ?? [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((h) => ({ status: h.new_status as any, created_at: h.created_at, notes: h.notes ?? undefined }))
  const showMultipleApplicationsNotice = await canShowMultipleApplicationsFlag(user.id, appRow.child_id, appRow.ecd_id)

  return (
    <ApplicationDetailClient
      id={appRow.id}
      applicationNumber={appRow.application_number}
      status={appRow.status}
      submittedAt={appRow.submitted_at}
      childId={appRow.child_id}
      ecdId={appRow.ecd_id}
      parentId={user.id}
      startDate={appRow.start_date}
      parentMessage={appRow.parent_message ?? null}
      adminNotes={appRow.admin_notes}
      offerBreakdown={parseOfferBreakdown(appRow.offer_breakdown)}
      offerConditions={appRow.offer_conditions}
      offerPenalties={appRow.offer_penalties}
      offerAgreement={appRow.offer_legal_agreement}
      offerExpiresAt={appRow.offer_expires_at}
      rejectionReasonCode={appRow.rejection_reason_code}
      rejectionReasonNote={appRow.rejection_reason_note}
      acceptedAt={appRow.offer_accepted_at}
      centreName={centre?.name ?? 'Unknown crèche'}
      centreSuburb={centre?.suburb ?? 'Unknown suburb'}
      centreSlug={centre?.slug ?? ''}
      childFirstName={resolvedChildFirstName}
      childLastName={resolvedChildLastName}
      history={history}
      missingDocuments={normalizeMissingDocuments(appRow.missing_documents)}
      showMultipleApplicationsNotice={showMultipleApplicationsNotice}
    />
  )
}

