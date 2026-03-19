import type { Metadata } from 'next'
import Link from 'next/link'
import { FileCheck2, ShieldCheck, Users, Briefcase, Building2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getDsdExportData, getDsdMonthOptions } from '@/lib/ecd/dsd-export'
import { buildDsdMonthlyReportTitle, getDsdDerivedStats } from '@/lib/ecd/dsd-export-render'
import { DsdPrintButton } from './print-button'
import { PdfDownloadButton } from './pdf-download-button'

export const metadata: Metadata = {
  title: 'Monthly Report | CentreConnect',
  description: 'Official Monthly Report — Places of Care (Crèches) generated from CentreConnect data.',
}

function normalizeMonth(value: string | undefined, fallback: number) {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : fallback
}

function normalizeYear(value: string | undefined, fallback: number) {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) && n >= fallback - 2 && n <= fallback + 2 ? n : fallback
}

function doeDate(value: string | null | undefined) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function calcAge(dob: string | null | undefined, atYear: number, atMonth: number): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  let age = atYear - d.getFullYear()
  const mDiff = atMonth - (d.getMonth() + 1)
  if (mDiff < 0 || (mDiff === 0)) age--
  return age >= 0 ? age : 0
}

function genderInitial(gender: string | null | undefined) {
  const g = (gender ?? '').toLowerCase()
  if (g === 'male' || g === 'm') return 'M'
  if (g === 'female' || g === 'f') return 'F'
  return '--'
}

const TH = 'border border-slate-400 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-800'
const TD = 'border border-slate-300 px-2 py-1.5 text-[11px] text-center text-slate-700'
const TDL = 'border border-slate-300 px-2 py-1.5 text-[11px] text-left text-slate-700'

export default async function DsdExportPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string }
}) {
  const { supabase, ecdId, role } = await requireEcdPortalSession()
  const defaults = getDsdMonthOptions()
  const selectedMonth = normalizeMonth(searchParams?.month, defaults.selectedMonth)
  const selectedYear = normalizeYear(searchParams?.year, defaults.selectedYear)
  const data = await getDsdExportData({ supabase, ecdId, selectedMonth, selectedYear })

  const reportTitle = buildDsdMonthlyReportTitle(data.centreName)

  const {
    total,
    r3500,
    r4500,
    otherIncome,
    newR3500,
    newR4500,
    newOther,
    trainedCount,
    disabledCount,
    practitionersEmployed,
    computerLiterateCount,
    practitioners,
    verifiedCompliance,
    healthPermit,
  } = getDsdDerivedStats(data)
  const childrenSorted = [...data.children].sort((a, b) => {
    const lastA = a.childName.split(' ').slice(-1)[0] ?? ''
    const lastB = b.childName.split(' ').slice(-1)[0] ?? ''
    return lastA.localeCompare(lastB)
  })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ecd-premium-shell, .ecd-premium-shell > aside { display: none !important; }
          .ecd-premium-shell > main { margin-left: 0 !important; overflow: visible !important; }
          .ecd-page-shell { padding: 0 !important; }
          .print-hide { display: none !important; }
          .print-page-break { page-break-before: always; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          @page { margin: 12mm 10mm; size: A4; }
        }
      ` }} />
      <div className="space-y-6 pb-10">

        {/* ── Controls Bar (hidden when printing) ── */}
        <Card className="rounded-[2rem] border-slate-200 bg-gradient-to-br from-cyan-50 to-white shadow-sm print-hide">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-600" />
                <span className="break-words text-sm font-black uppercase tracking-widest text-cyan-700">{reportTitle}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DsdPrintButton />
                <PdfDownloadButton month={selectedMonth} year={selectedYear} />
              </div>
            </div>
            <form className="mt-4 flex flex-wrap items-center gap-2">
              <select name="month" defaultValue={String(selectedMonth)} className="cc-native-field h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                {defaults.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select name="year" defaultValue={String(selectedYear)} className="cc-native-field h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                {defaults.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <Button type="submit" size="sm" variant="outline" className="rounded-2xl font-bold">Update</Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 print-hide">
          <Button variant="outline" asChild className="rounded-2xl font-bold border-slate-200 text-slate-600">
            <Link href="/ecd/report-cards">Report Cards <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button variant="outline" asChild className="rounded-2xl font-bold border-slate-200 text-slate-600">
            <Link href="/ecd/financials">Financials <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          {role === 'ecd_admin' && (
            <Button variant="outline" asChild className="rounded-2xl font-bold border-slate-200 text-slate-600">
              <Link href="/ecd/billing">Billing <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — DOE Cover Page (matches page 1 of PDF exactly)
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none print:border print:shadow-none">
          {/* Official DOE Header */}
          <div className="border-b-2 border-slate-300 bg-white px-6 py-4 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-50">
              <span className="text-[9px] font-black text-center leading-tight text-slate-600 uppercase">Gauteng<br/>Province</span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Department of Education</p>
              <p className="text-lg font-black uppercase tracking-[0.1em] text-slate-900">{reportTitle}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600">Programme: Places of Care (Crèches)</p>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Centre Details Grid */}
            <div className="grid gap-2">
              {[
                ['Month & Year', `${defaults.months[selectedMonth - 1]} ${selectedYear}`],
                ['Name of ECD', data.centreName],
                ['Physical Address', [data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '--'],
                ['Province / District', `${data.province || 'Gauteng'} — ${data.district || '--'}`],
                ['Ward', data.ward || '--'],
                ['Contact Details + E-mail', [data.primaryContactPhone, data.primaryContactEmail].filter(Boolean).join(' / ') || '--'],
                ['Registration Number', data.registrationNumber || '--'],
                ['EMIS Number', data.emisNumber || '--'],
                ['NPO / DSD Reg No', data.npoReg || data.dsdRegNumber || '--'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 border-b border-slate-100 py-1.5 sm:flex-row sm:gap-4">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500 sm:w-52 sm:shrink-0">{label}</span>
                  <span className="break-words text-sm font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>

            {/* Approved Capacity Boxes */}
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { label: 'Approved Children (Partial Care Certificate)', value: data.approvedCapacityPartialCare ?? '--' },
                { label: 'Approved Children per SLA', value: data.approvedCapacitySla ?? '--' },
                { label: 'Children Claimed for the Month', value: total },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 min-w-[160px] rounded-2xl border-2 border-slate-300 bg-white p-4 text-center shadow-sm">
                  <p className="text-[9px] font-black uppercase leading-tight text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Places of Care Table */}
            <div>
              <div className="mb-1 rounded-t-xl bg-slate-900 px-4 py-2">
                <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white">Places of Care (Crèche)</p>
              </div>
              <div className="overflow-x-auto rounded-b-xl border border-slate-300">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className={TH} rowSpan={2}>Total</th>
                      <th className={`${TH} border-l-2`} colSpan={3}>Total Number of Beneficiaries</th>
                      <th className={`${TH} border-l-2`} colSpan={3}>New Admissions During Month</th>
                      <th className={`${TH} border-l-2`} colSpan={3}>Discharges During Month</th>
                    </tr>
                    <tr className="bg-slate-50">
                      {['1 Parent R0-R3500','2 Parent R0-R4500','Other'].map(h => <th key={h} className={TH}>{h}</th>)}
                      {['1 Parent R0-R3500','2 Parent R0-R4500','Other'].map(h => <th key={`n${h}`} className={TH}>{h}</th>)}
                      {['1 Parent R0-R3500','2 Parent R0-R4500','Other'].map(h => <th key={`d${h}`} className={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className={`${TD} font-black text-lg text-slate-900`}>{total}</td>
                      <td className={TD}>{r3500}</td>
                      <td className={TD}>{r4500}</td>
                      <td className={TD}>{otherIncome}</td>
                      <td className={TD}>{newR3500}</td>
                      <td className={TD}>{newR4500}</td>
                      <td className={TD}>{newOther}</td>
                      <td className={TD}>0</td>
                      <td className={TD}>0</td>
                      <td className={TD}>0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Other Relevant Information */}
            <div>
              <div className="mb-1 rounded-t-xl bg-slate-800 px-4 py-2">
                <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white">Other Relevant Information</p>
              </div>
              <div className="overflow-x-auto rounded-b-xl border border-slate-300">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className={`${TH} w-10`}>No.</th>
                      <th className={`${TH} text-left`}>Description</th>
                      <th className={TH}>Total for Current Month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ['1', 'No. of ECD Practitioners that received training', trainedCount],
                      ['2', 'No. of ECD Volunteers that received training', 0],
                      ['3', 'No. of Children with Disabilities', disabledCount],
                      ['4', 'No. of ECD Practitioners Employed', practitionersEmployed],
                      ['5', 'No. of computers in an NPO', 1],
                      ['6', 'No. of Staff who are computer literate (Excel)', computerLiterateCount],
                    ].map(([no, desc, val]) => (
                      <tr key={String(no)} className="hover:bg-slate-50">
                        <td className={TD}>{no}</td>
                        <td className={TDL}>{desc}</td>
                        <td className={`${TD} font-black text-slate-900`}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Registration and permit</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Registration number: {data.registrationNumber || '--'}</p>
              <p className="mt-1 text-sm text-slate-700">{healthPermit?.label ?? 'Municipal Health Clearance Certificate'}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                {healthPermit?.status === 'verified' ? 'Verified on file' : healthPermit?.status ? `Status: ${healthPermit.status}` : 'Awaiting verification'}
              </p>
              </div>
              <div className="rounded-2xl border border-slate-300 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Supporting compliance pack</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{verifiedCompliance.length}</p>
              <p className="mt-1 text-sm text-slate-700">Verified compliance document{verifiedCompliance.length === 1 ? '' : 's'} on file for this return.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — Classification of Income per Beneficiaries (pages 2/3)
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none">
          <CardHeader className="border-b border-slate-200 bg-slate-900 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
              <Users className="h-4 w-4 text-cyan-400" />
              Classification of Income per Beneficiaries — Summary of Beneficiaries, Partial Care Facility (Crèches)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className={TH}>No.</th>
                    <th className={`${TH} text-left min-w-[160px]`}>Surname &amp; Initial / Full Name</th>
                    <th className={TH}>Date of Birth</th>
                    <th className={TH}>Age</th>
                    <th className={TH}>M</th>
                    <th className={TH}>F</th>
                    <th className={TH}>Race B</th>
                    <th className={TH}>Disabled</th>
                    <th className={TH}>R0-R3500<br/>(1 Parent)</th>
                    <th className={TH}>R0-R4500<br/>(2 Parent)</th>
                    <th className={TH}>Other</th>
                    <th className={TH}>Days<br/>Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {childrenSorted.map((child, idx) => {
                    const att = data.attendanceByChild.get(child.childId)
                    const age = calcAge(child.dateOfBirth, selectedYear, selectedMonth)
                    const gi = genderInitial(child.gender)
                    const parts = child.childName.split(' ')
                    const surname = parts.slice(-1)[0] ?? ''
                    const given = parts.slice(0, -1).join(' ')
                    const initial = given ? given[0]?.toUpperCase() + '.' : ''
                    const displayName = given ? `${surname}, ${given}` : `${surname} ${initial}`
                    return (
                      <tr key={child.childId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className={TD}>{idx + 1}</td>
                        <td className={`${TDL} font-semibold`}>{displayName}</td>
                        <td className={TD}>{doeDate(child.dateOfBirth)}</td>
                        <td className={TD}>{age ?? '--'}</td>
                        <td className={TD}>{gi === 'M' ? '✓' : ''}</td>
                        <td className={TD}>{gi === 'F' ? '✓' : ''}</td>
                        <td className={TD}>B</td>
                        <td className={TD}>{child.isDisabled ? 'Yes' : 'No'}</td>
                        <td className={TD}>{child.parentIncomeCategory === 'R0-R3500' ? '✓' : ''}</td>
                        <td className={TD}>{child.parentIncomeCategory === 'R0-R4500' ? '✓' : ''}</td>
                        <td className={TD}>{child.parentIncomeCategory === 'Other' ? '✓' : ''}</td>
                        <td className={`${TD} font-bold`}>{att?.present ?? 0}</td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td className={TD} colSpan={4}>TOTAL</td>
                    <td className={TD}>{data.doeStats.totalMale}</td>
                    <td className={TD}>{data.doeStats.totalFemale}</td>
                    <td className={TD}>{total}</td>
                    <td className={TD}>{disabledCount}</td>
                    <td className={TD}>{r3500}</td>
                    <td className={TD}>{r4500}</td>
                    <td className={TD}>{otherIncome}</td>
                    <td className={TD}>{Array.from(data.attendanceByChild.values()).reduce((s, a) => s + (a.present ?? 0), 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>


          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — Attendance Register Summary (Annexure A)
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none">
          <CardHeader className="border-b border-slate-200 bg-slate-800 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
              <FileCheck2 className="h-4 w-4 text-cyan-400" />
              Attendance Register — Annexure A ({defaults.months[selectedMonth - 1]} {selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className={TH}>No.</th>
                    <th className={`${TH} text-left min-w-[160px]`}>Surname &amp; Initials</th>
                    <th className={TH}>Age (Yr/Mo)</th>
                    <th className={TH}>Days Present</th>
                    <th className={TH}>Days Absent</th>
                    <th className={TH}>Total Days</th>
                    <th className={TH}>Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {childrenSorted.map((child, idx) => {
                    const att = data.attendanceByChild.get(child.childId)
                    const age = calcAge(child.dateOfBirth, selectedYear, selectedMonth)
                    const parts = child.childName.split(' ')
                    const surname = parts.slice(-1)[0] ?? ''
                    const given = parts.slice(0, -1).join(' ')
                    const initial = given ? given[0]?.toUpperCase() + '.' : ''
                    return (
                      <tr key={child.childId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className={TD}>{idx + 1}</td>
                        <td className={TDL}>{surname} {initial}</td>
                        <td className={TD}>{age != null ? age : '--'}</td>
                        <td className={`${TD} font-bold text-emerald-700`}>{att?.present ?? 0}</td>
                        <td className={`${TD} text-rose-600`}>{att?.absent ?? 0}</td>
                        <td className={TD}>{data.attendanceDaysReported}</td>
                        <td className={`${TD} font-black text-slate-900`}>
                          {att && att.totalRecorded > 0 ? `${att.attendanceRate}%` : '--'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {data.attendanceDaysReported === 0 && (
              <p className="px-6 py-4 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                No attendance records found for this period. Import from the Attendance Register.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — Breakdown of Staff & Management (page 6 of PDF)
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none">
          <CardHeader className="border-b border-slate-200 bg-slate-900 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                Breakdown of Staff &amp; Management (Excl. Board Members) — Summary of Permanent Staff
              </CardTitle>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Total Staff</p>
                  <p className="text-sm font-black text-white">{data.staff.length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Trained</p>
                  <p className="text-sm font-black text-cyan-400">{trainedCount}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className={TH}>No.</th>
                    <th className={`${TH} text-left min-w-[180px]`}>Surname &amp; Initials / Full Name</th>
                    <th className={TH}>ID Number</th>
                    <th className={TH}>Gender<br/>M/F</th>
                    <th className={TH}>Race<br/>B/W/C/I/A</th>
                    <th className={TH}>Disabled<br/>Yes/No</th>
                    <th className={`${TH} min-w-[140px]`}>Designation</th>
                    <th className={TH}>Training<br/>Received</th>
                    <th className={`${TH} min-w-[120px]`}>Specify Training</th>
                    <th className={TH}>Subsidised<br/>Yes/No</th>
                    <th className={TH}>Gross Monthly<br/>Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.staff.length > 0 ? data.staff.map((s, idx) => (
                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className={TD}>{idx + 1}</td>
                      <td className={TDL}><span className="font-semibold">{s.firstName} {s.surname}</span></td>
                      <td className={`${TD} font-mono tracking-wider`}>{s.idNumber || '--'}</td>
                      <td className={TD}>{s.gender || '--'}</td>
                      <td className={TD}>{s.race || 'B'}</td>
                      <td className={TD}>{s.isDisabled ? 'Yes' : 'No'}</td>
                      <td className={TDL}>{s.role}</td>
                      <td className={TD}>{s.isTrained ? 'Yes' : 'No'}</td>
                      <td className={TDL}>{s.trainingDescription || '--'}</td>
                      <td className={TD}>{s.isSubsidized ? 'Yes' : 'No'}</td>
                      <td className={`${TD} font-bold`}>
                        {s.monthlySalary ? `R ${s.monthlySalary.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '--'}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        No staff records. Run the staff sync script to populate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.primaryContactName && (
              <div className="border-t border-slate-200 px-6 py-3 text-[11px] text-slate-600">
                <span className="font-black uppercase tracking-widest mr-2">Compiled by:</span>
                {data.primaryContactName}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — Grand Total of Beneficiaries (page 11 of PDF)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none">
            <CardHeader className="border-b border-slate-200 bg-slate-900 py-3">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-white">
                Grand Total of Beneficiaries
              </CardTitle>
              <p className="text-[10px] text-slate-400">{data.npoReg ? `DSD Reg No: ${data.npoReg}` : data.centreName}</p>
            </CardHeader>
            <CardContent className="p-0">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className={TH}>No.</th>
                    <th className={`${TH} text-left`}>Beneficiaries Category</th>
                    <th className={TH}>Total Number</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className={TD}>1</td>
                    <td className={TDL}>Boys</td>
                    <td className={`${TD} font-black text-slate-900 text-base`}>{data.doeStats.totalMale}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className={TD}>2</td>
                    <td className={TDL}>Girls</td>
                    <td className={`${TD} font-black text-slate-900 text-base`}>{data.doeStats.totalFemale}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td className={TD} colSpan={2}>TOTAL</td>
                    <td className={`${TD} text-cyan-400 text-base font-black`}>{data.doeStats.totalChildren}</td>
                  </tr>
                </tbody>
              </table>
              {data.primaryContactName && (
                <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-600">
                  <span className="font-black uppercase mr-2">Compiled by:</span>{data.primaryContactName}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Practitioners List (DSD format, page 8 of PDF) ── */}
          <Card className="rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none">
            <CardHeader className="border-b border-slate-200 bg-slate-800 py-3">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-white">
                Teachers / Practitioners List
              </CardTitle>
              <p className="text-[10px] text-slate-400">
                {data.centreName} — {data.npoReg ? `DSD Reg No: ${data.npoReg}` : 'DSD Format'}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className={TH}>No.</th>
                    <th className={`${TH} text-left`}>Full Name and Surname</th>
                    <th className={TH}>ID Number</th>
                  </tr>
                </thead>
                <tbody>
                  {practitioners.length > 0 ? practitioners.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className={TD}>{i + 1}</td>
                      <td className={TDL}>{p.firstName} {p.surname}</td>
                      <td className={`${TD} font-mono`}>{p.idNumber || '--'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-[11px] text-slate-400 font-bold uppercase">No practitioners found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {data.primaryContactName && (
                <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-600">
                  <span className="font-black uppercase mr-2">Compiled by:</span>{data.primaryContactName}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Footer ── */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 print-hide">
          <ShieldCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-cyan-500" />
          Generated by CentreConnect · Official DOE/DSD Monthly Return · {data.centreName} · {defaults.months[selectedMonth - 1]} {selectedYear}
        </div>
        
        {/* ── Back Navigation (shown after download) ── */}
        <div id="back-navigation" className="hidden print-hide">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center">
            <Button asChild variant="outline" className="rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-100">
              <Link href="/ecd/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}












