import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { StatusUpdateForm } from './status-update-form'
import { TemplateSendPanel } from './template-send-panel'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { createAdminClient } from '@/lib/supabase/admin'

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

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ApplicationDetailsPage({ params }: ApplicationDetailsPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()

  const { data: application } = await supabase
    .from('applications')
    .select(
      'id,application_number,status,submitted_at,parent_message,admin_notes,ecd_id,multiple_threshold_reached,share_multiple_flag,offer_made_at,offer_sent_at,offer_accepted_at,enrolled_at,children(id,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,special_needs),parents(id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
    )
    .eq('id', params.id)
    .eq('ecd_id', ecdId)
    .maybeSingle()

  if (!application) {
    notFound()
  }

  const { data: templatesData } = await supabase
    .from('communication_templates')
    .select('template_key,title,body')
    .eq('is_active', true)
    .in('template_key', ['missing_documents', 'open_day_invite', 'application_update', 'spot_available'])
    .order('created_at', { ascending: true })

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

  let parentDocs: Array<{ doc_type: string | null }> = []
  let parentDocsError: Error | null = null
  if (parent?.id) {
    try {
      const admin = createAdminClient()
      const { data, error } = await admin.from('parent_documents').select('doc_type').eq('parent_id', parent.id).limit(50)
      parentDocs = (data ?? []) as Array<{ doc_type: string | null }>
      parentDocsError = error ? new Error(error.message) : null
    } catch (error) {
      parentDocsError = error as Error
    }
  }

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
    docTypes: parentDocsError ? ['parent_id', 'birth_certificate'] : parentDocs.map((doc) => doc.doc_type),
  })

  return (
    <EcdOsShell
      title="Application Details"
      description="Review child and parent information, then update application status."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="mb-4">
        <Link href="/ecd/applications" className="text-sm font-medium text-primary hover:underline">
          Back to applications
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Centre:</span> {centre?.name ?? 'Unknown centre'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Application #:</span> {application.application_number}
              </p>
              <p>
                <span className="font-medium text-slate-900">Submitted:</span>{' '}
                {formatDate(application.submitted_at)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Current status:</span> {application.status}
              </p>
              {application.status === 'approved' && !application.offer_accepted_at ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p>
                    <span className="font-medium text-slate-900">Awaiting parent response:</span> Yes
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    The offer is approved, but enrollment is only finalized once the parent accepts.
                  </p>
                  {(application.offer_sent_at || application.offer_made_at) ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Offer sent: {formatDate(application.offer_sent_at ?? application.offer_made_at)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {application.status === 'enrolled' || application.offer_accepted_at ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p>
                    <span className="font-medium text-slate-900">Enrollment:</span> Confirmed
                  </p>
                  {(application.enrolled_at || application.offer_accepted_at) ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Confirmed: {formatDate(application.enrolled_at ?? application.offer_accepted_at)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {application.share_multiple_flag && application.multiple_threshold_reached ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p>
                    <span className="font-medium text-slate-900">Multiple Applications:</span> Yes
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Parents may apply to multiple centres. This does not indicate lack of commitment.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Multiple Applications: Not shared</p>
              )}
            </CardContent>
          </Card>

          <Card className={readiness.ready ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/50'}>
            <CardHeader>
              <CardTitle>Application Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className={readiness.ready ? 'text-emerald-700' : 'text-amber-900'}>
                {readiness.ready
                  ? 'All core details and documents are complete for admissions processing.'
                  : 'Some required intake details are missing. Parent was prompted to complete them.'}
              </p>
              <p className="text-xs text-slate-600">Completion: {readiness.completionPct}%</p>
              {!readiness.ready ? (
                <ul className="space-y-1 text-xs text-amber-900">
                  {readiness.missing.slice(0, 5).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Child Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Name:</span>{' '}
                {child ? `${child.first_name} ${child.last_name}` : 'Unknown child'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Date of birth:</span>{' '}
                {child?.date_of_birth ? formatDate(child.date_of_birth) : 'Not provided'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Gender:</span> {child?.gender ?? 'Not provided'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Parent Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Parent:</span>{' '}
                {parentProfile?.full_name ?? 'Unknown parent'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Phone:</span>{' '}
                {parentPhone || 'Not provided'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Address:</span>{' '}
                {[parent?.address, parent?.suburb, parent?.city, parent?.province].filter(Boolean).join(', ') ||
                  'Not provided'}
              </p>
              <div className="pt-2 flex gap-2">
                {parentPhone ? (
                  <Button size="sm" asChild>
                    <a href={`tel:${parentPhone}`}>Call Parent</a>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Call Parent
                  </Button>
                )}
                {parent?.id ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/ecd/communications?recipient=${encodeURIComponent(parent.id)}&contextType=application&contextId=${encodeURIComponent(application.id)}`}
                    >
                      Send Message
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    Send Message
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Medical Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Allergies:</span> {child?.allergies ?? 'None listed'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Medical conditions:</span>{' '}
                {child?.medical_conditions ?? 'None listed'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Special needs:</span>{' '}
                {child?.special_needs ?? 'None listed'}
              </p>
              {application.parent_message ? (
                <p>
                  <span className="font-medium text-slate-900">Parent message:</span> {application.parent_message}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
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

          <Card className="mt-4 border-slate-200">
            <CardHeader>
              <CardTitle>Send Template Message</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateSendPanel
                ecdId={application.ecd_id}
                parentId={parent?.id ?? ''}
                applicationId={application.id}
                centreName={centre?.name ?? 'Your centre'}
                childName={childName}
                parentName={parentName}
                applicationNumber={application.application_number}
                status={application.status}
                parentPhone={parentPhone || null}
                templates={templates}
              />
            </CardContent>
          </Card>
        </aside>
      </section>
    </EcdOsShell>
  )
}



