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
  submitted_at: string
  child_id: string
  ecd_id: string
  start_date: string | null
  parent_message: string | null
  admin_notes: string | null
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

export default async function ParentApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: application } = await supabase
    .from('applications')
    .select(`
      id, application_number, status, submitted_at, child_id, ecd_id,
      start_date, parent_message, admin_notes, offer_accepted_at, share_multiple_flag,
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
      acceptedAt={appRow.offer_accepted_at}
      centreName={centre?.name ?? 'Unknown centre'}
      centreSuburb={centre?.suburb ?? 'Unknown suburb'}
      centreSlug={centre?.slug ?? ''}
      childFirstName={resolvedChildFirstName}
      childLastName={resolvedChildLastName}
      history={history}
      showMultipleApplicationsNotice={showMultipleApplicationsNotice}
    />
  )
}
