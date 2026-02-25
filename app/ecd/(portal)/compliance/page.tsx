import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Compliance Toolkit - CentreConnect',
  description: 'Track required compliance documents and staff clearances for your centre.',
}

const REQUIRED_DOCUMENTS: Array<{ document_type: string; label: string }> = [
  { document_type: 'dbe_registration', label: 'DBE ECD Programme Registration (Form 16)' },
  { document_type: 'partial_care', label: 'Partial Care Facility Registration (Form 11)' },
  { document_type: 'health_clearance', label: 'Municipal Health Clearance Certificate' },
  { document_type: 'fire_clearance', label: 'Fire Clearance Certificate' },
  { document_type: 'building_plan', label: 'Approved Building Plan' },
  { document_type: 'dsd_registration', label: 'DSD/Provincial Registration Certificate' },
  { document_type: 'npo_certificate', label: 'NPO Certificate (if applicable)' },
  { document_type: 'popia_policy', label: 'POPIA Privacy Policy - on file and displayed to parents' },
]

type ComplianceDocument = {
  id: string
  document_type: string
  label: string
  expires_at: string | null
  status: 'missing' | 'uploaded' | 'verified' | 'expired'
  notes: string | null
}

type StaffCheck = {
  id: string
  staff_name: string
  staff_role: string | null
  medical_clearance_date: string | null
  criminal_clearance_date: string | null
  first_aid_cert_date: string | null
  first_aid_cert_expires: string | null
  form_29_submitted: boolean
  notes: string | null
}

function statusChipClass(status: ComplianceDocument['status']) {
  if (status === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'uploaded') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'expired') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function scoreClass(score: number) {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 50) return 'text-amber-700'
  return 'text-rose-700'
}

function scoreBarClass(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}

function formatDate(value: string | null) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString()
}

function expiryWarning(expiresAt: string | null) {
  if (!expiresAt) return { label: 'No expiry recorded', className: 'text-slate-500' }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiresAt)
  expiry.setHours(0, 0, 0, 0)
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 0) return { label: 'Expired', className: 'text-rose-700' }
  if (days <= 30) return { label: `Expires in ${days} day${days === 1 ? '' : 's'}`, className: 'text-amber-700' }
  return { label: 'Valid', className: 'text-emerald-700' }
}

export default async function EcdCompliancePage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const admin = createAdminClient()

  const { count: docsCount } = await admin
    .from('compliance_documents')
    .select('id', { count: 'exact', head: true })
    .eq('ecd_id', ecdId)

  if ((docsCount ?? 0) === 0) {
    await admin.from('compliance_documents').insert(
      REQUIRED_DOCUMENTS.map((doc) => ({
        ecd_id: ecdId,
        document_type: doc.document_type,
        label: doc.label,
        status: 'missing',
      }))
    )
  }

  async function markDocumentUploaded(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') return

    const id = String(formData.get('id') ?? '').trim()
    const currentStatus = String(formData.get('current_status') ?? 'missing').trim()
    const expiresAtRaw = String(formData.get('expires_at') ?? '').trim()
    const notes = String(formData.get('notes') ?? '').trim()
    if (!id) return

    const nextStatus = currentStatus === 'verified' ? 'verified' : 'uploaded'
    await session.supabase
      .from('compliance_documents')
      .update({
        status: nextStatus,
        expires_at: expiresAtRaw || null,
        notes: notes || null,
        uploaded_by: session.user.id,
      })
      .eq('id', id)
      .eq('ecd_id', session.ecdId)

    revalidatePath('/ecd/compliance')
  }

  async function addStaffCheck(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') return

    const staffName = String(formData.get('staff_name') ?? '').trim()
    if (!staffName) return

    await session.supabase.from('compliance_staff_checks').insert({
      ecd_id: session.ecdId,
      staff_name: staffName,
      staff_role: String(formData.get('staff_role') ?? '').trim() || null,
      medical_clearance_date: String(formData.get('medical_clearance_date') ?? '').trim() || null,
      criminal_clearance_date: String(formData.get('criminal_clearance_date') ?? '').trim() || null,
      first_aid_cert_date: String(formData.get('first_aid_cert_date') ?? '').trim() || null,
      first_aid_cert_expires: String(formData.get('first_aid_cert_expires') ?? '').trim() || null,
      form_29_submitted: String(formData.get('form_29_submitted') ?? '') === 'on',
      notes: String(formData.get('notes') ?? '').trim() || null,
    })

    revalidatePath('/ecd/compliance')
  }

  const [{ data: centre }, { data: docsData }, { data: staffData }] = await Promise.all([
    supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
    supabase
      .from('compliance_documents')
      .select('id,document_type,label,expires_at,status,notes')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: true }),
    supabase
      .from('compliance_staff_checks')
      .select(
        'id,staff_name,staff_role,medical_clearance_date,criminal_clearance_date,first_aid_cert_date,first_aid_cert_expires,form_29_submitted,notes'
      )
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const documents = (docsData ?? []) as ComplianceDocument[]
  const staffChecks = (staffData ?? []) as StaffCheck[]
  const totalDocs = documents.length || REQUIRED_DOCUMENTS.length
  const doneDocs = documents.filter((doc) => doc.status === 'uploaded' || doc.status === 'verified').length
  const score = totalDocs > 0 ? Math.round((doneDocs / totalDocs) * 100) : 0

  return (
    <EcdOsShell
      title="Compliance Toolkit"
      description="Track required documents and staff clearances in one place."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="space-y-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{centre?.name ?? 'Your centre'}</p>
            <p className={`mt-1 text-3xl font-black ${scoreClass(score)}`}>{score}%</p>
            <p className="text-xs text-slate-500">
              {doneDocs} of {totalDocs} required documents uploaded or verified
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <form key={doc.id} action={markDocumentUploaded} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="current_status" value={doc.status} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{doc.label}</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusChipClass(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-[200px_1fr_auto]">
                  <input
                    type="date"
                    name="expires_at"
                    defaultValue={doc.expires_at ?? ''}
                    className="cc-native-field"
                  />
                  <input
                    type="text"
                    name="notes"
                    defaultValue={doc.notes ?? ''}
                    className="cc-native-field"
                    placeholder="Notes"
                  />
                  <Button type="submit" disabled={role === 'ecd_staff'} className="w-full lg:w-auto">
                    Mark as Uploaded
                  </Button>
                </div>
              </form>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Staff Clearances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addStaffCheck} className="grid gap-3 lg:grid-cols-2">
              <input name="staff_name" className="cc-native-field" placeholder="Staff name" required />
              <input name="staff_role" className="cc-native-field" placeholder="Role" />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Medical clearance date
                <input type="date" name="medical_clearance_date" className="cc-native-field mt-1" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Criminal clearance date
                <input type="date" name="criminal_clearance_date" className="cc-native-field mt-1" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                First aid cert date
                <input type="date" name="first_aid_cert_date" className="cc-native-field mt-1" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                First aid cert expiry
                <input type="date" name="first_aid_cert_expires" className="cc-native-field mt-1" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input type="checkbox" name="form_29_submitted" />
                Form 29 submitted
              </label>
              <textarea
                name="notes"
                className="cc-native-field h-auto min-h-20 py-2 md:col-span-2"
                placeholder="Notes"
              />
              <Button type="submit" className="w-full sm:w-fit" disabled={role === 'ecd_staff'}>
                Add Staff Member
              </Button>
            </form>

            {(staffChecks ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">No staff records yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="space-y-2 md:hidden">
                  {staffChecks.map((row) => {
                    const warning = expiryWarning(row.first_aid_cert_expires)
                    return (
                      <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{row.staff_name}</p>
                        <p className="mt-1 text-xs text-slate-600">{row.staff_role ?? '--'}</p>
                        <p className="mt-2 text-xs text-slate-600">Medical: {formatDate(row.medical_clearance_date)}</p>
                        <p className="text-xs text-slate-600">Criminal: {formatDate(row.criminal_clearance_date)}</p>
                        <p className="text-xs text-slate-600">First aid expiry: {formatDate(row.first_aid_cert_expires)}</p>
                        <p className={`mt-1 text-xs font-semibold ${warning.className}`}>{warning.label}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Medical</TableHead>
                        <TableHead>Criminal</TableHead>
                        <TableHead>First Aid</TableHead>
                        <TableHead>Expiry Warning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffChecks.map((row) => {
                        const warning = expiryWarning(row.first_aid_cert_expires)
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.staff_name}</TableCell>
                            <TableCell>{row.staff_role ?? '--'}</TableCell>
                            <TableCell>{formatDate(row.medical_clearance_date)}</TableCell>
                            <TableCell>{formatDate(row.criminal_clearance_date)}</TableCell>
                            <TableCell>{formatDate(row.first_aid_cert_expires)}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold ${warning.className}`}>{warning.label}</span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          CentreConnect tracks what you report. We do not verify or certify compliance status. Consult your provincial
          DBE or DSD office for official guidance.
        </footer>
      </section>
    </EcdOsShell>
  )
}
