import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { requireEcdFeatureAccess } from '@/lib/ecd/feature-gates'
import { ComplianceDocumentRow } from './compliance-document-row'
import { PrintComplianceButton } from './print-button'
import { addStaffCheckAction } from './actions'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Compliance — CentreConnect',
  description: 'Track required compliance documents and staff clearances for your crèche.',
}

// critical = needed for DSD government subsidy, important = required for registration
const REQUIRED_DOCUMENTS: Array<{ document_type: string; label: string; priority: 'critical' | 'important' | 'standard' }> = [
  { document_type: 'dsd_registration', label: 'DSD/Provincial Registration Certificate', priority: 'critical' },
  { document_type: 'dbe_registration', label: 'DBE ECD Programme Registration (Form 16)', priority: 'critical' },
  { document_type: 'npo_certificate', label: 'NPO Certificate (if applicable)', priority: 'critical' },
  { document_type: 'partial_care', label: 'Partial Care Facility Registration (Form 11)', priority: 'important' },
  { document_type: 'health_clearance', label: 'Municipal Health Clearance Certificate', priority: 'important' },
  { document_type: 'fire_clearance', label: 'Fire Clearance Certificate', priority: 'important' },
  { document_type: 'building_plan', label: 'Approved Building Plan', priority: 'standard' },
  { document_type: 'popia_policy', label: 'POPIA Privacy Policy — on file and shown to parents', priority: 'standard' },
]

type ComplianceDocument = {
  id: string
  document_type: string
  label: string
  file_url?: string | null
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
  await requireEcdFeatureAccess({ supabase, ecdId, feature: 'compliance' })
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

  const [{ data: centre }, { data: docsData }, { data: staffData }] = await Promise.all([
    supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
    supabase
      .from('compliance_documents')
      .select('id,document_type,label,file_url,expires_at,status,notes')
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
    <>
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900">Compliance Toolkit</h1>
          <p className="text-sm text-slate-500 mt-0.5">Keep your crèche documents up to date. Upload a photo — AI fills the details.</p>
        </div>
        <PrintComplianceButton />
      </div>
      <section className="space-y-6 print:space-y-8">
        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl ${score >= 80 ? 'bg-emerald-100' : score >= 50 ? 'bg-amber-100' : 'bg-rose-100'}`}>
                <ShieldCheck className={`h-7 w-7 ${scoreClass(score)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{centre?.name ?? 'Your crèche'}</p>
                <p className={`text-4xl font-black mt-0.5 ${scoreClass(score)}`}>{score}%</p>
                <p className="text-xs text-slate-500 mt-0.5">{doneDocs} of {totalDocs} documents uploaded or verified</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full transition-all ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            </div>
            {score < 80 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Critical for subsidy:</strong> DSD Registration, DBE Registration, and NPO Certificate are required for government subsidy payments. Upload these first.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Required Documents</CardTitle>
            <p className="text-xs text-slate-500 -mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />Critical for subsidy
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mx-1 ml-3" />Required for registration
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => {
              const meta = REQUIRED_DOCUMENTS.find(r => r.document_type === doc.document_type)
              return (
                <ComplianceDocumentRow
                  key={doc.id}
                  doc={doc}
                  canEdit={role !== 'ecd_staff'}
                  priority={meta?.priority ?? 'standard'}
                />
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Staff Clearances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addStaffCheckAction} className="grid gap-3 lg:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Staff name
                <input name="staff_name" className="cc-native-field mt-1" required />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Staff role
                <input name="staff_role" className="cc-native-field mt-1" />
              </label>
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
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                Notes
                <textarea
                  name="notes"
                  className="cc-native-field mt-1 h-auto min-h-20 py-2"
                  placeholder="Notes"
                />
              </label>
              <Button type="submit" className="w-full sm:w-fit" disabled={role === 'ecd_staff'}>
                Add Staff Member
              </Button>
            </form>

            {(staffChecks ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">No staff records yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="space-y-2 md:hidden">
                  {staffChecks.map((row: any) => {
                    const warning = expiryWarning(row.first_aid_cert_expires)
                    return (
                      <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3">
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

                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
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
                      {staffChecks.map((row: any) => {
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

        <footer className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 print:border-0 print:bg-white print:p-0 print:mt-4">
          <p className="print:hidden">CentreConnect tracks what you report. We do not verify or certify compliance status. Consult your provincial DBE or DSD office for official guidance.</p>
          <p className="hidden print:block text-center text-sm">
            This compliance checklist was generated by CentreConnect • www.centreconnect.co.za
          </p>
        </footer>
      </section>
    </>
  )
}






