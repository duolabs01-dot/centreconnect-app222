import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, FileCheck2, ShieldCheck, Users, Briefcase, Building2, MapPin } from 'lucide-react'
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

  const incomeStats = {
    total: data.children.length,
    r3500: data.children.filter(c => c.parentIncomeCategory === 'R0-R3500').length,
    r4500: data.children.filter(c => c.parentIncomeCategory === 'R0-R4500').length,
    other: data.children.filter(c => c.parentIncomeCategory === 'Other').length,
  }

  return (
    <EcdOsShell
      title="DOE & DSD Reports"
      description="Official DOE Monthly Returns and printable DSD register packs generated from your live CentreConnect data."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <div className="space-y-6 overflow-x-hidden pb-8">
        {/* Centre Details & Registration Header */}
        <Card className="rounded-[2rem] border-slate-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_65%,#f8fafc_100%)] shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
                <Building2 className="h-3.5 w-3.5" />
                DOE / DSD Monthly Reporting Template
              </div>
              <div className="flex gap-2">
                <DsdPrintButton />
                <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                  <Link href={`/api/ecd/dsd-export?kind=enrolment&${monthParam}`}>
                    <Download className="mr-2 h-4 w-4" />
                    Full Export (CSV)
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                  {data.centreName}
                </CardTitle>
                <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Ward {data.ward || '--'} | {data.district || 'Johannesburg East'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    Reg: {data.registrationNumber || '--'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-slate-400" />
                    EMIS: {data.emisNumber || '--'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-slate-400">Partial Care Cap</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{data.approvedCapacityPartialCare || '--'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-slate-400">SLA Capacity</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{data.approvedCapacitySla || '--'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Beneficiaries</p>
                  <p className="mt-1 text-xl font-black text-cyan-600">{data.children.length}</p>
                </div>
              </div>
            </div>

            <form className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                <select
                  name="month"
                  defaultValue={String(selectedMonth)}
                  className="cc-native-field h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                >
                  {defaults.months.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                <select
                  name="year"
                  defaultValue={String(selectedYear)}
                  className="cc-native-field h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                >
                  {defaults.years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Button type="submit" variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50">
                  Update view
                </Button>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost" className="rounded-xl text-xs font-bold text-slate-500 hover:text-cyan-600">
                  <Link href={`/api/ecd/dsd-export?kind=attendance&${monthParam}`} prefetch={false}>Attendance CSV</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-xl text-xs font-bold text-slate-500 hover:text-cyan-600">
                  <Link href={`/api/ecd/dsd-export?kind=compliance&${monthParam}`} prefetch={false}>Compliance CSV</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-xl text-xs font-bold text-slate-500 hover:text-cyan-600">
                  <Link href={`/api/ecd/dsd-export?kind=staff&${monthParam}`} prefetch={false}>Staff CSV</Link>
                </Button>
              </div>
            </form>
          </CardHeader>
        </Card>

        {/* DOE Statistics & Beneficiary Summary Row */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* DOE Stats Table */}
          <Card className="rounded-[2rem] border-slate-200 shadow-sm lg:col-span-8 overflow-hidden print:border-0 print:shadow-none">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 uppercase tracking-tight">
                <FileCheck2 className="h-5 w-5 text-cyan-600" />
                Monthly Return Summary (DOE Format)
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
            </CardContent>
          </Card>

          {/* Places of Care Income Summary */}
          <Card className="rounded-[2rem] border-slate-200 shadow-sm lg:col-span-4 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">Income Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">1 Parent (R0-R3500)</span>
                  <span className="text-lg font-black text-slate-900">{incomeStats.r3500}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(incomeStats.r3500 / (incomeStats.total || 1)) * 100}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">2 Parents (R0-R4500)</span>
                  <span className="text-lg font-black text-slate-900">{incomeStats.r4500}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(incomeStats.r4500 / (incomeStats.total || 1)) * 100}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">Other / Private</span>
                  <span className="text-lg font-black text-slate-900">{incomeStats.other}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full" style={{ width: `${(incomeStats.other / (incomeStats.total || 1)) * 100}%` }} />
                </div>
              </div>

              <div className="rounded-2xl bg-cyan-50 p-4 border border-cyan-100">
                <p className="text-[10px] font-black uppercase text-cyan-700">Total Beneficiaries</p>
                <p className="mt-1 text-2xl font-black text-cyan-900">{incomeStats.total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff & Practitioners Card */}
        <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 uppercase tracking-tight">
              <Briefcase className="h-5 w-5 text-cyan-600" />
              Staff & Practitioners
            </CardTitle>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400">Total Employed</p>
                <p className="text-sm font-black text-slate-900">{data.staff.length}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400">Trained</p>
                <p className="text-sm font-black text-slate-900">{data.staff.filter(s => s.isTrained).length}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    {['Name', 'Surname', 'Role', 'ID Number', 'Training Status', 'Digital Literacy'].map((label) => (
                      <th key={label} className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.staff.length > 0 ? (
                    data.staff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{staff.firstName}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{staff.surname}</td>
                        <td className="px-6 py-4 text-slate-600">{staff.role}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{staff.id.split('-')[0]}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${staff.isTrained ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                            {staff.isTrained ? 'Trained' : 'Untrained'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${staff.isComputerLiterate ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                            {staff.isComputerLiterate ? 'Excel Literate' : 'Basic'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">No staff records found for this centre.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Enrolment & Attendance Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Detailed Enrolment */}
          <Card className="rounded-[2rem] border-slate-200 shadow-sm print:border-0 print:shadow-none">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 uppercase tracking-tight">
                <Users className="h-5 w-5 text-cyan-600" />
                DSD Enrolment Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr>
                      {['Child', 'Age', 'Income Cat', 'Status'].map((label) => (
                        <th key={label} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.children.map((child) => (
                      <tr key={child.childId} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {child.childName}
                          <p className="text-[10px] text-slate-400 font-normal">{formatDate(child.dateOfBirth)}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{child.ageLabel}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
                            {child.parentIncomeCategory}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {child.isDisabled ? (
                            <span className="text-rose-600 font-black text-[10px] uppercase">Disability</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="rounded-[2rem] border-slate-200 shadow-sm print:border-0 print:shadow-none">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 uppercase tracking-tight">
                <FileCheck2 className="h-5 w-5 text-cyan-600" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr>
                      {['Child', 'Present', 'Rate'].map((label) => (
                        <th key={label} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.children.map((child) => {
                      const attendance = data.attendanceByChild.get(child.childId)
                      return (
                        <tr key={child.childId} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{child.childName}</td>
                          <td className="px-4 py-3 text-slate-700">{attendance?.present ?? 0} days</td>
                          <td className="px-4 py-3 font-black text-cyan-700">{attendance?.attendanceRate ?? 0}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Footer */}
        <Card className="rounded-[2rem] border-slate-200 shadow-sm print:border-0 print:shadow-none bg-slate-900 text-white overflow-hidden">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              Compliance Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.compliance.length > 0 ? (
              data.compliance.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-800/50 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-[10px] text-slate-400">Exp: {formatDate(item.expiresAt)}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${item.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4 text-xs text-slate-400 text-center col-span-full">
                No official compliance documents are currently indexed for this centre.
              </div>
            )}
          </CardContent>
          <div className="px-6 py-4 bg-slate-950/50 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center border-t border-slate-800">
            Generated by CentreConnect for Official DOE/DSD Monthly Return Submission
          </div>
        </Card>
      </div>
    </EcdOsShell>
  )
}
