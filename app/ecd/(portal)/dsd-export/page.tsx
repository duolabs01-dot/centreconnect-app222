import type { Metadata } from 'next'
import Link from 'next/link'
import { FileCheck2, ShieldCheck, Users, Briefcase, Building2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { hasEcdFeatureAccess } from '@/lib/ecd/feature-gates'
import { getDsdExportData, getDsdMonthOptions } from '@/lib/ecd/dsd-export'
import { buildDsdMonthlyReportTitle, buildDsdPdfHtml, getDsdDerivedStats } from '@/lib/ecd/dsd-export-render'
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

export default async function DsdExportPage(props: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const searchParams = await props.searchParams
  const { supabase, ecdId, role } = await requireEcdPortalSession()
  const dsdAccess = await hasEcdFeatureAccess({ supabase, ecdId, feature: 'dsd-export' })
  const defaults = getDsdMonthOptions()
  const selectedMonth = normalizeMonth(searchParams?.month, defaults.selectedMonth)
  const selectedYear = normalizeYear(searchParams?.year, defaults.selectedYear)
  const data = await getDsdExportData({ supabase, ecdId, selectedMonth, selectedYear })

  const reportTitle = buildDsdMonthlyReportTitle(data.centreName)
  // Pre-render the full print-ready HTML on the server — passed to the download button
  const pdfHtml = buildDsdPdfHtml(data)

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

  // Build day-by-day attendance map for Annexure A
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const dailyAttMap = new Map<string, Map<number, string>>()
  for (const row of data.rawAttendanceRows) {
    const d = new Date(row.date)
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    if (month !== selectedMonth || year !== selectedYear) continue
    if (!dailyAttMap.has(row.child_id)) dailyAttMap.set(row.child_id, new Map())
    dailyAttMap.get(row.child_id)!.set(day, row.status)
  }
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // ── Starter tier: build a quarterly banner to show inline with the real report ──
  // Starter users CAN generate the DOE report — but they see a "1 free per quarter" nudge.
  // This lets them file legally while feeling the pull to upgrade for unlimited history.
  const isStarterTier = !dsdAccess.allowed
  const currentQuarter = Math.ceil(new Date().getMonth() / 3) // Q1–Q4
  const currentQuarterLabel = `Q${currentQuarter} ${new Date().getFullYear()}`

  return (
    <>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4; margin: 12mm 10mm; }
              * { visibility: hidden !important; }
              #doe-print-region,
              #doe-print-region * { visibility: visible !important; }
              #doe-print-region {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                color: black !important;
                font-family: Arial, sans-serif !important;
                font-size: 11px !important;
              }
              .print-hide { display: none !important; visibility: hidden !important; }
              .doe-dark-bg {
                background: #1e293b !important;
                color: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              table { border-collapse: collapse !important; width: 100% !important; }
              th {
                background: #f1f5f9 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              tr { page-break-inside: avoid !important; }
              thead { display: table-header-group !important; }
            }
          `,
        }}
      />
      <div className="space-y-6 pb-10">
        {/* ── Starter quarterly nudge — inline, not a wall ── */}
        {isStarterTier && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 print-hide">
            <div className="flex items-center gap-3 min-w-0">
              <FileCheck2 className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-black text-amber-800">
                  1 free DOE export this quarter ({currentQuarterLabel})
                </p>
                <p className="mt-0.5 text-xs text-amber-600">
                  Attendance history and unlimited exports are on <span className="font-bold">Growth</span>.
                </p>
              </div>
            </div>
            <Link
              href="/ecd/billing"
              className="flex-shrink-0 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-600"
            >
              Upgrade → R299/mo
            </Link>
          </div>
        )}

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
                <PdfDownloadButton month={selectedMonth} year={selectedYear} centreName={data.centreName} htmlContent={pdfHtml} />
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

        {/* ── Filing Readiness Checklist ── */}
        {(() => {
          const readinessItems = [
            { label: 'Centre name', ok: Boolean(data.centreName) },
            { label: 'Physical address', ok: Boolean(data.addressLine1) },
            { label: 'Contact details', ok: Boolean(data.primaryContactPhone || data.primaryContactEmail) },
            { label: 'Registration number', ok: Boolean(data.registrationNumber || data.npoReg) },
            { label: 'Children enrolled', ok: data.children.length > 0 },
            { label: `Boys count (${data.doeStats.totalMale})`, ok: data.doeStats.totalMale > 0 },
            { label: `Girls count (${data.doeStats.totalFemale})`, ok: data.doeStats.totalFemale > 0 },
            { label: 'Attendance data', ok: data.attendanceDaysReported > 0 },
            { label: 'Staff records', ok: data.staff.length > 0 },
            { label: 'Compiled by (owner name)', ok: Boolean(data.primaryContactName) },
          ]
          const passed = readinessItems.filter(i => i.ok).length
          const allGood = passed === readinessItems.length
          return (
            <Card className={`rounded-[2rem] border-2 shadow-sm print-hide overflow-hidden ${allGood ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`h-5 w-5 ${allGood ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <span className={`text-sm font-black uppercase tracking-widest ${allGood ? 'text-emerald-800' : 'text-amber-800'}`}>
                      Filing Readiness — {passed}/{readinessItems.length} Complete
                    </span>
                  </div>
                  {!allGood && (
                    <Link href="/ecd/profile" className="text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900">
                      Fix in Settings →
                    </Link>
                  )}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {readinessItems.map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span className={`h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${item.ok ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                        {item.ok ? '✓' : '!'}
                      </span>
                      <span className={item.ok ? 'text-slate-700' : 'font-semibold text-amber-800'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })()}

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
            PRINT REGION — Everything inside here will print
        ══════════════════════════════════════════════════════════════════ */}
        <div id="doe-print-region">
          {/* SECTION 1 — DOE Cover Page (matches page 1 of PDF exactly) */}
          <Card className="rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none print:border print:shadow-none mb-6">
            {/* Official DOE Header */}
            <div className="border-b-2 border-slate-300 bg-white px-6 py-4 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-50">
                <span className="text-[9px] font-black text-center leading-tight text-slate-600 uppercase">Gauteng<br />Province</span>
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
                <div className="mb-1 rounded-t-xl bg-slate-900 px-4 py-2 doe-section-title doe-dark-bg">
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
                        {['1 Parent R0-R3500', '2 Parent R0-R4500', 'Other'].map(h => <th key={h} className={TH}>{h}</th>)}
                        {['1 Parent R0-R3500', '2 Parent R0-R4500', 'Other'].map(h => <th key={`n${h}`} className={TH}>{h}</th>)}
                        {['1 Parent R0-R3500', '2 Parent R0-R4500', 'Other'].map(h => <th key={`d${h}`} className={TH}>{h}</th>)}
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
                        <td className={TD}>--</td>
                        <td className={TD}>--</td>
                        <td className={TD}>--</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Other Relevant Information — matches real DOE form page 1 */}
              <div className="mt-4">
                <div className="mb-1 rounded-t-xl bg-slate-900 px-4 py-2 doe-dark-bg">
                  <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white">Other Relevant Information</p>
                </div>
                <div className="overflow-x-auto rounded-b-xl border border-slate-300">
                  <table className="min-w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className={`${TH} w-10`}>No.</th>
                        <th className={`${TH} text-left`}>Description</th>
                        <th className={TH}>Total number for the current month</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['1', 'No. of ECD Practitioners that received training', trainedCount],
                        ['2', 'No. of ECD Volunteers that received training', 0],
                        ['3', 'No. of Children with Disabilities', disabledCount],
                        ['4', 'No. of ECD Practitioners Employed', practitionersEmployed],
                        ['5', 'No. of computers in an NPO', data.staff.filter(s => s.isComputerLiterate).length > 0 ? 1 : '--'],
                        ['6', 'No. of Staff who are computer literate (Excel)', computerLiterateCount],
                      ].map(([no, desc, val]) => (
                        <tr key={String(no)} className="border-b border-slate-100">
                          <td className={TD}>{no}</td>
                          <td className={TDL}>{desc}</td>
                          <td className={`${TD} font-black`}>{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 — Classification of Income per Beneficiaries (pages 2/3) */}
          <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none mb-6">
            <CardHeader className="border-b border-slate-200 bg-slate-900 py-3 doe-section-title doe-dark-bg">
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
                      <th className={TH} rowSpan={2}>No.</th>
                      <th className={`${TH} text-left min-w-[160px]`} rowSpan={2}>Surname & Initial<br />/ Full Name</th>
                      <th className={TH} rowSpan={2}>Date of Birth<br />/ ID Number</th>
                      <th className={TH} rowSpan={2}>Age</th>
                      <th className={`${TH} border-l-2`} colSpan={5}>Race</th>
                      <th className={`${TH} border-l-2`} colSpan={2}>Gender</th>
                      <th className={TH} rowSpan={2}>Disabled<br />Yes/No</th>
                      <th className={`${TH} border-l-2`} colSpan={3}>Income 1 Parent</th>
                      <th className={`${TH} border-l-2`} colSpan={3}>Income 2 Parents</th>
                      <th className={TH} rowSpan={2}>Other</th>
                      <th className={TH} rowSpan={2}>New<br />Admission</th>
                      <th className={TH} rowSpan={2}>Discharge</th>
                      <th className={TH} rowSpan={2}>Total Days<br />Attendance</th>
                    </tr>
                    <tr className="bg-slate-50">
                      {['B','W','C','I','A'].map(r => <th key={r} className={TH}>{r}</th>)}
                      <th className={TH}>M</th>
                      <th className={TH}>F</th>
                      {['R0-R3500','R3501-R4500','R4501+'].map(h => <th key={`1p${h}`} className={TH}>{h}</th>)}
                      {['R0-R3500','R3501-R4500','R4501+'].map(h => <th key={`2p${h}`} className={TH}>{h}</th>)}
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
                      const displayName = given ? `${surname}, ${given}` : surname
                      const race = (child as any).race ?? 'B'
                      const isNew = child.startDate ? (() => { const d = new Date(child.startDate); return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth })() : false
                      const cat = child.parentIncomeCategory
                      return (
                        <tr key={child.childId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className={TD}>{idx + 1}</td>
                          <td className={`${TDL} font-semibold`}>{displayName}</td>
                          <td className={TD}>{doeDate(child.dateOfBirth)}</td>
                          <td className={TD}>{age ?? '--'}</td>
                          {['B','W','C','I','A'].map(r => <td key={r} className={TD}>{race.toUpperCase().startsWith(r) ? '✓' : ''}</td>)}
                          <td className={TD}>{gi === 'M' ? '✓' : ''}</td>
                          <td className={TD}>{gi === 'F' ? '✓' : ''}</td>
                          <td className={TD}>{child.isDisabled ? 'Yes' : 'No'}</td>
                          {/* Income 1 Parent */}
                          <td className={TD}>{cat === 'R0-R3500' ? '✓' : ''}</td>
                          <td className={TD}>{cat === 'R3501-R4500' ? '✓' : ''}</td>
                          <td className={TD}>{cat === 'R4501+' ? '✓' : ''}</td>
                          {/* Income 2 Parents */}
                          <td className={TD}>{cat === 'R0-R4500' ? '✓' : ''}</td>
                          <td className={TD}>{cat === 'R4501-R9000' ? '✓' : ''}</td>
                          <td className={TD}>{cat === 'R9001+' ? '✓' : ''}</td>
                          <td className={TD}>{!['R0-R3500','R3501-R4500','R4501+','R0-R4500','R4501-R9000','R9001+'].includes(cat) ? '✓' : ''}</td>
                          <td className={TD}>{isNew ? 'Yes' : ''}</td>
                          <td className={TD}></td>
                          <td className={`${TD} font-bold`}>{att?.present ?? 0}</td>
                        </tr>
                      )
                    })}
                    {/* Totals row */}
                    <tr className="bg-slate-200 font-black text-xs">
                      <td className={TD} colSpan={4}>TOTAL</td>
                      <td className={TD}>{total}</td>
                      <td className={TD}></td><td className={TD}></td><td className={TD}></td><td className={TD}></td>
                      <td className={TD}>{data.doeStats.totalMale}</td>
                      <td className={TD}>{data.doeStats.totalFemale}</td>
                      <td className={TD}>{disabledCount}</td>
                      <td className={TD}>{r3500}</td><td className={TD}></td><td className={TD}></td>
                      <td className={TD}>{r4500}</td><td className={TD}></td><td className={TD}></td>
                      <td className={TD}>{otherIncome}</td>
                      <td className={TD}>{newR3500 + newR4500 + newOther}</td>
                      <td className={TD}>0</td>
                      <td className={TD}>{Array.from(data.attendanceByChild.values()).reduce((s, a) => s + a.present, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {childrenSorted.length === 0 && (
                <p className="px-6 py-4 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                  No children enrolled for this period. Children must be enrolled to appear in the DOE report.
                </p>
              )}
            </CardContent>
          </Card>

          {/* SECTION 3 — Attendance Register Annexure A (day-by-day grid, matches pages 4/5 of PDF) */}
          <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none mb-6">
            <CardHeader className="border-b border-slate-200 bg-slate-900 py-3 doe-section-title doe-dark-bg">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                <FileCheck2 className="h-4 w-4 text-cyan-400" />
                Attendance Register — Partial Care Facility (Crèches) — Annexure A
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[9px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className={TH}>No.</th>
                      <th className={`${TH} text-left min-w-[120px]`}>Surname &amp; Initials</th>
                      <th className={`${TH} min-w-[32px]`}>Age<br />(Yrs)</th>
                      <th className={`${TH} min-w-[24px]`}>Age<br />(Mo)</th>
                      {allDays.map(d => (
                        <th key={d} className={`${TH} w-7 px-0.5`}>{d}</th>
                      ))}
                      <th className={TH}>Total<br />Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {childrenSorted.map((child, idx) => {
                      const age = calcAge(child.dateOfBirth, selectedYear, selectedMonth)
                      const dobDate = child.dateOfBirth ? new Date(child.dateOfBirth) : null
                      const ageMonths = dobDate ? ((selectedYear - dobDate.getFullYear()) * 12 + (selectedMonth - (dobDate.getMonth() + 1))) % 12 : '--'
                      const parts = child.childName.split(' ')
                      const surname = parts.slice(-1)[0] ?? ''
                      const given = parts.slice(0, -1).join(' ')
                      const initial = given ? given[0]?.toUpperCase() + '.' : ''
                      const dayMap = dailyAttMap.get(child.childId) ?? new Map<number, string>()
                      const totalPresent = Array.from(dayMap.values()).filter(s => s === 'present' || s === 'late').length
                      return (
                        <tr key={child.childId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className={TD}>{idx + 1}</td>
                          <td className={TDL}>{surname} {initial}</td>
                          <td className={TD}>{age ?? '--'}</td>
                          <td className={TD}>{ageMonths}</td>
                          {allDays.map(d => {
                            const status = dayMap.get(d)
                            return (
                              <td key={d} className={`${TD} w-7 px-0.5 ${status === 'present' || status === 'late' ? 'text-emerald-700 font-black' : status === 'absent' ? 'text-rose-600' : 'text-slate-300'}`}>
                                {status === 'present' || status === 'late' ? 'P' : status === 'absent' ? 'A' : ''}
                              </td>
                            )
                          })}
                          <td className={`${TD} font-black`}>{totalPresent}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {data.attendanceDaysReported === 0 && (
                <p className="px-6 py-4 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                  No attendance records found. Mark attendance daily from the Attendance page.
                </p>
              )}
              <div className="border-t border-slate-200 px-6 py-3 text-[11px] text-slate-600 flex gap-6">
                <span><span className="font-black text-emerald-700">P</span> = Present</span>
                <span><span className="font-black text-rose-600">A</span> = Absent</span>
                <span className="font-black uppercase tracking-widest mr-2">Name of Manager: {data.primaryContactName || '--'}</span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4 — Breakdown of Staff & Management (page 6 of PDF) */}
          <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none mb-6">
            <CardHeader className="border-b border-slate-200 bg-slate-900 py-3 doe-section-title doe-dark-bg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                  <Briefcase className="h-4 w-4 text-cyan-400" />
                  Breakdown of Staff & Management (Excl. Board Members) — Summary of Permanent Staff
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
                      <th className={`${TH} text-left min-w-[180px]`}>Surname & Initials / Full Name</th>
                      <th className={TH}>ID Number</th>
                      <th className={TH}>Gender<br />M/F</th>
                      <th className={TH}>Race<br />B/W/C/I/A</th>
                      <th className={TH}>Disabled<br />Yes/No</th>
                      <th className={`${TH} min-w-[140px]`}>Designation</th>
                      <th className={TH}>Training<br />Received</th>
                      <th className={`${TH} min-w-[120px]`}>Specify Training</th>
                      <th className={TH}>Subsidised<br />Yes/No</th>
                      <th className={TH}>Gross Monthly<br />Salary</th>
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
                        <td colSpan={11} className="border border-slate-300 px-4 py-3 text-center text-sm text-slate-400 italic">
                          No staff records loaded. Add staff via Employment → Staff.
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

          {/* SECTION 5 — Grand Total of Beneficiaries (page 11 of PDF) */}
          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <Card className="rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none">
              <CardHeader className="border-b border-slate-200 bg-slate-900 py-3 doe-section-title doe-dark-bg">
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
                    <tr className="doe-total-row font-black text-xs">
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
              <CardHeader className="border-b border-slate-200 bg-slate-800 py-3 doe-section-title doe-dark-bg">
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
                        <td colSpan={3} className="border border-slate-300 px-4 py-3 text-center text-sm text-slate-400 italic">
                          No practitioners found. Add staff via Employment → Staff.
                        </td>
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
          {/* SECTION 5 — Grand Total of Beneficiaries (matches page 11 of PDF) */}
          <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none mb-6">
            <CardHeader className="border-b border-slate-200 bg-slate-900 py-3 doe-dark-bg">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                <Users className="h-4 w-4 text-cyan-400" />
                Grand Total of Beneficiaries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className={`${TH} w-12`}>No.</th>
                      <th className={`${TH} text-left`}>Beneficiaries Category</th>
                      <th className={TH}>Total Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className={TD}>1</td>
                      <td className={TDL}>Boys</td>
                      <td className={`${TD} text-xl font-black`}>{data.doeStats.totalMale}</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className={TD}>2</td>
                      <td className={TDL}>Girls</td>
                      <td className={`${TD} text-xl font-black`}>{data.doeStats.totalFemale}</td>
                    </tr>
                    <tr className="bg-slate-200 font-black">
                      <td className={TD} colSpan={2}>TOTAL</td>
                      <td className={`${TD} text-xl font-black`}>{total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 px-6 py-3 text-[11px] text-slate-600">
                <span className="font-black uppercase tracking-widest mr-2">Compiled by:</span>{data.primaryContactName || '--'}
                <span className="ml-8 font-black uppercase tracking-widest mr-2">Date:</span>{defaults.months[selectedMonth - 1]} {selectedYear}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 6 — DSD Practitioners List (matches page 8 of PDF) */}
          <Card className="print-page-break rounded-[2rem] border-2 border-slate-300 shadow-md overflow-hidden print:rounded-none mb-6">
            <CardHeader className="border-b border-slate-200 bg-slate-900 py-3 doe-dark-bg">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                Teachers / Practitioners List — DSD
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-3 pb-1 text-[11px] text-slate-600">
                <span className="font-black">{data.centreName}</span>
                {data.dsdRegNumber && <span className="ml-4 text-slate-500">DSD Reg No: {data.dsdRegNumber}</span>}
                {data.npoReg && <span className="ml-4 text-slate-500">NPO: {data.npoReg}</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className={`${TH} w-12`}>No.</th>
                      <th className={`${TH} text-left`}>Full Name and Surname</th>
                      <th className={TH}>ID Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.staff.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className={TD}>{idx + 1}</td>
                        <td className={TDL}>{s.firstName} {s.surname}</td>
                        <td className={`${TD} font-mono tracking-wider`}>{s.idNumber || '--'}</td>
                      </tr>
                    ))}
                    {data.staff.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-3 text-center text-slate-400 italic text-sm">No staff records. Add via Employment → Staff.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 px-6 py-3 text-[11px] text-slate-600 flex gap-8">
                <span><span className="font-black uppercase tracking-widest mr-2">Compiled by:</span>{data.primaryContactName || '--'}</span>
                <span><span className="font-black uppercase tracking-widest mr-2">Date:</span>{defaults.months[selectedMonth - 1]} {selectedYear}</span>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* ── Footer ── */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 print-hide">
            <ShieldCheck className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-cyan-500" />
            Generated by CentreConnect · Official DOE/DSD Monthly Return · {data.centreName} · {defaults.months[selectedMonth - 1]} {selectedYear}
          </div>
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
