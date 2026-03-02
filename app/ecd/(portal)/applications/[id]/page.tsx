import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertCircle, FileText, History, Phone, UserRound } from 'lucide-react'
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

export const metadata: Metadata = {
  title: 'Application Details - CentreConnect',
  description: 'Review child application details and manage admission status.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

type ApplicationDetailsPageProps = {
  params: {
    id: string
  }
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

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function parseMissingDocuments(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

export default async function ApplicationDetailsPage({ params }: ApplicationDetailsPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()

  const [{ data: centre }, { data: application }, { data: templatesData }] = await Promise.all([
    supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
    supabase
      .from('applications')
      .select(
        'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,reviewed_at,decided_at,offer_made_at,offer_sent_at,offer_accepted_at,enrolled_at,withdrawn_at,monthly_fee_cents,fee_notes,missing_documents,children(id,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,special_needs),parents(id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
      )
      .eq('id', params.id)
      .eq('ecd_id', ecdId)
      .maybeSingle(),
    supabase
      .from('communication_templates')
      .select('template_key,title,body')
      .eq('is_active', true)
      .in('template_key', ['missing_documents', 'open_day_invite', 'application_update', 'spot_available'])
      .order('created_at', { ascending: true }),
  ])

  if (!application) {
    notFound()
  }

  const child = normalizeOne(application.children)
  const parent = normalizeOne(application.parents)
  const parentProfile = normalizeOne(parent?.user_profiles ?? null)
  const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? ''
  const parentName = parentProfile?.full_name ?? 'Parent'
  const childName = child ? `${child.first_name} ${child.last_name}` : 'Child'
  const templates = (templatesData ?? []) as Array<{
    template_key: string
    title: string
    body: string
  }>

  let parentDocs: ParentDocument[] = []
  let docsError: string | null = null
  if (parent?.id) {
    try {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('parent_documents')
        .select('id,doc_type,file_name,verification_status,created_at')
        .eq('parent_id', parent.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        docsError = error.message
      } else {
        parentDocs = (data ?? []) as ParentDocument[]
      }
    } catch (error) {
      docsError = error instanceof Error ? error.message : 'Unable to load parent documents.'
    }
  }

  const { data: historyRows } = await supabase
    .from('application_status_history')
    .select('id,old_status,new_status,notes,changed_by,created_at')
    .eq('application_id', application.id)
    .order('created_at', { ascending: false })
    .limit(40)

  const history = (historyRows ?? []) as HistoryItem[]
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
    child: {
      firstName: child?.first_name ?? null,
      lastName: child?.last_name ?? null,
      dateOfBirth: child?.date_of_birth ?? null,
      gender: child?.gender ?? null,
    },
    docTypes: docsError ? [] : parentDocs.map((doc) => doc.doc_type),
  })

  return (
    <EcdOsShell
      title="Application Details"
      description="Review full child enrollment details and take quick action."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/ecd/applications" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Back to applications
          </Link>
          <StatusBadge status={application.status} />
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-slate-900">Case File {application.application_number}</CardTitle>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <span className="font-bold text-slate-800">Submitted:</span> {formatDate(application.submitted_at)}
              </p>
              <p>
                <span className="font-bold text-slate-800">Reviewed:</span>{' '}
                {application.reviewed_at ? formatDate(application.reviewed_at) : 'Not yet'}
              </p>
              <p>
                <span className="font-bold text-slate-800">Decision:</span>{' '}
                {application.decided_at ? formatDate(application.decided_at) : 'Pending'}
              </p>
              <p>
                <span className="font-bold text-slate-800">Offer Accepted:</span>{' '}
                {application.offer_accepted_at ? formatDate(application.offer_accepted_at) : 'No'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuickDecisionActions
              applicationId={application.id}
              currentStatus={application.status}
              currentNotes={application.admin_notes}
              currentOfferAcceptedAt={application.offer_accepted_at}
            />
            <div className="flex flex-wrap gap-2">
              <SendReminderButton applicationId={application.id} />
              {parentPhone ? (
                <Button asChild variant="outline" className="h-11 rounded-2xl">
                  <a href={`tel:${parentPhone}`}>Call Parent</a>
                </Button>
              ) : (
                <Button variant="outline" className="h-11 rounded-2xl" disabled>
                  Call Parent
                </Button>
              )}
              {parent?.id ? (
                <Button asChild variant="outline" className="h-11 rounded-2xl">
                  <Link
                    href={`/ecd/communications?recipient=${encodeURIComponent(parent.id)}&contextType=application&contextId=${encodeURIComponent(application.id)}`}
                  >
                    Send Message
                  </Link>
                </Button>
              ) : null}
            </div>
            <div
              className={`rounded-2xl border p-3 text-xs ${
                readiness.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <p className="font-semibold">Readiness: {readiness.completionPct}% complete</p>
              {!readiness.ready && readiness.missing.length > 0 ? (
                <p className="mt-1">Missing: {readiness.missing.slice(0, 5).join(', ')}</p>
              ) : null}
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
                  Child Info
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-900">Name:</span> {childName}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">DOB:</span>{' '}
                  {child?.date_of_birth ? formatDate(child.date_of_birth) : 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Gender:</span> {child?.gender ?? 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Allergies:</span> {child?.allergies ?? 'None listed'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Conditions:</span> {child?.medical_conditions ?? 'None listed'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Special needs:</span> {child?.special_needs ?? 'None listed'}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <Phone className="h-4 w-4 text-teal-600" />
                  Parent Info
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-900">Parent:</span> {parentName}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Phone:</span> {parentPhone || 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Billing email:</span>{' '}
                  {parent?.billing_email || 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Relationship:</span>{' '}
                  {parent?.guardian_relationship || 'Not provided'}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold text-slate-900">Address:</span>{' '}
                  {[parent?.address, parent?.suburb, parent?.city, parent?.province].filter(Boolean).join(', ') || 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Emergency contact:</span>{' '}
                  {parent?.emergency_contact_name || 'Not provided'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Emergency phone:</span>{' '}
                  {parent?.emergency_contact_phone || 'Not provided'}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <FileText className="h-4 w-4 text-teal-600" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {docsError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Unable to load documents right now: {docsError}
                  </div>
                ) : parentDocs.length > 0 ? (
                  <ul className="space-y-2">
                    {parentDocs.map((doc) => (
                      <li key={doc.id} className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {doc.file_name?.trim() || doc.doc_type?.replace(/_/g, ' ') || 'Document'}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Type: {doc.doc_type ?? 'unknown'} | Status: {doc.verification_status ?? 'uploaded'} | Uploaded:{' '}
                          {formatDate(doc.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No uploaded documents found for this parent profile yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <History className="h-4 w-4 text-teal-600" />
                  Status History
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

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Parent message:</span>{' '}
                  {application.parent_message || 'No parent message provided.'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Internal notes:</span>{' '}
                  {application.admin_notes || 'No internal notes added yet.'}
                </p>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Update Status</CardTitle>
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

            {['approved', 'enrolled'].includes(application.status) ? (
              <FeeAgreementCard
                applicationId={application.id}
                initialMonthlyFeeCents={application.monthly_fee_cents ?? 0}
                initialFeeNotes={application.fee_notes}
              />
            ) : null}

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Template Message</CardTitle>
              </CardHeader>
              <CardContent>
                <TemplateSendPanel
                  ecdId={application.ecd_id}
                  parentId={parent?.id ?? ''}
                  applicationId={application.id}
                  centreName={centre?.name ?? 'Your crèche'}
                  childName={childName}
                  parentName={parentName}
                  applicationNumber={application.application_number}
                  status={application.status}
                  parentPhone={parentPhone || null}
                  templates={templates}
                />
              </CardContent>
            </Card>

            {missingLabels.length > 0 ? (
              <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    Outstanding Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-900">
                  {missingLabels.join(', ')}
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
    </EcdOsShell>
  )
}
