import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, FileCheck2, ShieldCheck, Users } from 'lucide-react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getDsdExportData, getDsdMonthOptions } from '@/lib/ecd/dsd-export'
import { DsdPrintButton } from './print-button'

export const metadata: Metadata = {
  title: 'DSD Export | CentreConnect',
  description: 'Printable DSD pack and CSV exports for enrolment, attendance, and compliance.',
}

function normalizeMonth(value: string | undefined, fallback: number) {
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) && next >= 1 && next <= 12 ? next : fallback
}

function normalizeYear(value: string | undefined, fallback: number) {
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) && next >= fallback - 2 && next <= fallback + 2 ? next : fallback
}

function formatDate(value: string | null | undefined) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusChipClass(status: string) {
  if (status === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'uploaded') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'expired') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

export default async function DsdExportPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string }
}) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const defaults = getDsdMonthOptions()
  const selectedMonth = normalizeMonth(searchParams?.month, defaults.selectedMonth)
  const selectedYear = normalizeYear(searchParams?.year, defaults.selectedYear)
  const data = await getDsdExportData({ supabase, ecdId, selectedMonth, selectedYear })
  const monthParam = `month=${selectedMonth}&year=${selectedYear}`

  return (
    <EcdOsShell
      title="DOE & DSD Reports"
      description="Official DOE Monthly Returns and printable DSD register packs generated from your live CentreConnect data."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <div className="space-y-6 overflow-x-hidden pb-8">
        <Card className="rounded-[2rem] border-slate-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_65%,#f8fafc_100%)] shadow-sm">
          <CardHeader className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              DOE / DSD official reports
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {data.monthLabel} {data.selectedYear} Returns: {data.centreName}
                </CardTitle>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  Everything here comes from your live CentreConnect data: enrolled children, monthly attendance, and compliance documents. Choose the month, print the pack, or export the CSV files you need.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <DsdPrintButton />
                <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                  <Link href={`/api/ecd/dsd-export?kind=enrolment&${monthParam}`}>
                    <Download className="mr-2 h-4 w-4" />
                    Enrolment CSV
                  </Link>
                </Button>
              </div>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <select
                name="month"
                defaultValue={String(selectedMonth)}
                className="cc-native-field h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                {defaults.months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                name="year"
                defaultValue={String(selectedYear)}
                className="cc-native-field h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                {defaults.years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                Refresh pack
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href={`/api/ecd/dsd-export?kind=attendance&${monthParam}`}>Attendance CSV</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href={`/api/ecd/dsd-export?kind=compliance&${monthParam}`}>Compliance CSV</Link>
              </Button>
            </form>
          </CardHeader>
        </Card>

        {/* DOE Statistics Card */}
        <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden print:border-0 print:shadow-none">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <FileCheck2 className="h-5 w-5 text-cyan-600" />
              DOE Monthly Return Summary: {data.monthLabel} {data.selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-white">
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100">Age group</th>
                    <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100">Male</th>
                    <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100">Female</th>
                    <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100 bg-slate-50/50 font-black text-slate-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { label: 'Under 1 Year', stats: data.doeStats.byAge.under1 },
                    { label: '1 - 2 Years', stats: data.doeStats.byAge.age1to2 },
                    { label: '2 - 3 Years', stats: data.doeStats.byAge.age2to3 },
                    { label: '3 - 4 Years', stats: data.doeStats.byAge.age3to4 },
                    { label: '4 - 5 Years', stats: data.doeStats.byAge.age4to5 },
                    { label: '5 - 6 Years', stats: data.doeStats.byAge.age5to6 },
                    { label: 'Over 6 Years', stats: data.doeStats.byAge.over6 },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.label}</td>
                      <td className="px-6 py-4 text-center text-slate-700 font-medium">{row.stats.m}</td>
                      <td className="px-6 py-4 text-center text-slate-700 font-medium">{row.stats.f}</td>
                      <td className="px-6 py-4 text-center bg-slate-50/30 font-black text-cyan-700">{row.stats.m + row.stats.f}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-black uppercase tracking-wider">
                    <td className="px-6 py-4">Total Children</td>
                    <td className="px-6 py-4 text-center">{data.doeStats.totalMale}</td>
                    <td className="px-6 py-4 text-center">{data.doeStats.totalFemale}</td>
                    <td className="px-6 py-4 text-center text-cyan-400">{data.doeStats.totalChildren}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-cyan-50/30 border-t border-cyan-100">
              <p className="text-xs leading-relaxed text-cyan-800">
                <strong>Note:</strong> This table is formatted exactly as required for the Department of Education (DOE) monthly statistical return. 
                Data is calculated based on each child&apos;s date of birth and gender as of {formatDate(new Date().toISOString())}.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Users className="h-5 w-5 text-cyan-600" />
              DSD Monthly Enrolment Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Child', 'Date of birth', 'Age', 'Class', 'Start date', 'Parent', 'Phone'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.children.map((child) => (
                    <tr key={child.childId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">{child.childName}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(child.dateOfBirth)}</td>
                      <td className="px-4 py-3 text-slate-700">{child.ageLabel}</td>
                      <td className="px-4 py-3 text-slate-700">{child.className ?? '--'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(child.startDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{child.parentName}</td>
                      <td className="px-4 py-3 text-slate-700">{child.parentPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <FileCheck2 className="h-5 w-5 text-cyan-600" />
              Monthly attendance summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Child', 'Present', 'Late', 'Absent', 'Sick', 'Days recorded', 'Attendance rate'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.children.map((child) => {
                    const attendance = data.attendanceByChild.get(child.childId)
                    return (
                      <tr key={child.childId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">{child.childName}</td>
                        <td className="px-4 py-3 text-slate-700">{attendance?.present ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{attendance?.late ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{attendance?.absent ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{attendance?.sick ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{attendance?.totalRecorded ?? 0}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{attendance?.attendanceRate ?? 0}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              Compliance summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.compliance.length > 0 ? (
              data.compliance.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">Expiry: {formatDate(item.expiresAt)}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${statusChipClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No compliance documents are on file yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EcdOsShell>
  )
}
