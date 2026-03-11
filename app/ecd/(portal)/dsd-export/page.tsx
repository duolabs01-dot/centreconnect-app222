'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  Download, 
  Printer, 
  Calendar, 
  Users, 
  FileText, 
  ShieldCheck,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Child = {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  grade_level: string
  parent_name: string
  parent_phone: string
}

type AttendanceRecord = {
  child_id: string
  date: string
  status: 'present' | 'absent' | 'late'
}

type ComplianceDoc = {
  document_type: string
  label: string
  status: string
  file_url: string | null
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function DsdExportPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [children, setChildren] = useState<Child[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [compliance, setCompliance] = useState<ComplianceDoc[]>([])
  const [centreName, setCentreName] = useState('')
  const [ecdId, setEcdId] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  async function loadData() {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ecdAdmin } = await supabase
      .from('ecd_admins')
      .select('ecd_id')
      .eq('user_id', user.id)
      .single()

    if (!ecdAdmin) return

    setEcdId(ecdAdmin.ecd_id)

    const { data: centre } = await supabase
      .from('ecd_centres')
      .select('name')
      .eq('id', ecdAdmin.ecd_id)
      .single()

    if (centre) setCentreName(centre.name)

    const { data: childrenData } = await supabase
      .from('children')
      .select('id, first_name, last_name, date_of_birth, gender, grade_level, parent_name, parent_phone')
      .eq('ecd_id', ecdAdmin.ecd_id)
      .eq('status', 'enrolled')

    if (childrenData) setChildren(childrenData)

    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('child_id, date, status')
      .eq('ecd_id', ecdAdmin.ecd_id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (attendanceData) setAttendance(attendanceData)

    const { data: complianceData } = await supabase
      .from('ecd_compliance_documents')
      .select('document_type, label, status, file_url')
      .eq('ecd_id', ecdAdmin.ecd_id)

    if (complianceData) setCompliance(complianceData)

    setLoading(false)
  }

  function calculateAttendanceRate(childId: string): number {
    const childAttendance = attendance.filter(a => a.child_id === childId)
    if (childAttendance.length === 0) return 0
    const present = childAttendance.filter(a => a.status === 'present').length
    return Math.round((present / childAttendance.length) * 100)
  }

  function getComplianceStatus(docType: string): { status: string; label: string } {
    const doc = compliance.find(c => c.document_type === docType)
    if (!doc) return { status: 'missing', label: 'Not Submitted' }
    return { status: doc.status, label: doc.status === 'verified' ? 'Verified' : doc.status === 'uploaded' ? 'Pending' : 'Missing' }
  }

  function printReport() {
    window.print()
  }

  const totalDays = attendance.length > 0 
    ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
    : 0

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">
              <ShieldCheck className="h-3 w-3" />
              DSD Compliant
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">DSD Export</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Generate DSD-compliant reports for inspections, subsidies, and compliance. 
              All data is formatted according to DSD requirements.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="cc-native-field rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500"
            >
              {MONTHS.map((month, idx) => (
                <option key={month} value={idx}>{month}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="cc-native-field rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <Button onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate Report
          </Button>

          {children.length > 0 && (
            <Button variant="outline" onClick={printReport}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          )}
        </div>
      </header>

      {children.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No Report Generated</h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              Select a month and click &quot;Generate Report&quot; to create your DSD compliance report.
            </p>
          </CardContent>
        </Card>
      )}

      {children.length > 0 && (
        <div ref={printRef} className="space-y-6 print:space-y-8">
          {/* DSD Header - Print Only */}
          <div className="hidden print:block">
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <h1 className="text-2xl font-black text-slate-900">DSD ECD CENTRE COMPLIANCE REPORT</h1>
              <p className="text-sm text-slate-600">Month: {MONTHS[selectedMonth]} {selectedYear}</p>
              <p className="text-sm text-slate-600">Centre: {centreName}</p>
              <p className="text-sm text-slate-600">Generated: {new Date().toLocaleDateString('en-ZA')}</p>
            </div>
          </div>

          {/* Section 1: Child Enrolment Register */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="print:pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="h-5 w-5" />
                1. CHILD ENROLMENT REGISTER
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm print:text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-bold">No.</th>
                      <th className="text-left py-2 font-bold">Child Name</th>
                      <th className="text-left py-2 font-bold">Date of Birth</th>
                      <th className="text-left py-2 font-bold">Age</th>
                      <th className="text-left py-2 font-bold">Gender</th>
                      <th className="text-left py-2 font-bold">Grade</th>
                      <th className="text-left py-2 font-bold">Parent/Guardian</th>
                      <th className="text-left py-2 font-bold">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child, idx) => {
                      const dob = new Date(child.date_of_birth)
                      const age = new Date().getFullYear() - dob.getFullYear()
                      return (
                        <tr key={child.id} className="border-b border-slate-100">
                          <td className="py-2">{idx + 1}</td>
                          <td className="py-2 font-medium">{child.first_name} {child.last_name}</td>
                          <td className="py-2">{child.date_of_birth}</td>
                          <td className="py-2">{age} years</td>
                          <td className="py-2">{child.gender === 'M' ? 'Male' : child.gender === 'F' ? 'Female' : '-'}</td>
                          <td className="py-2">{child.grade_level || '-'}</td>
                          <td className="py-2">{child.parent_name || '-'}</td>
                          <td className="py-2">{child.parent_phone || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-slate-600 print:text-xs">
                <strong>Total Enrolled Children:</strong> {children.length}
              </p>
            </CardContent>
          </Card>

          {/* Section 2: Monthly Attendance */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="print:pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                2. MONTHLY ATTENDANCE REGISTER
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-600 print:text-xs">
                <strong>Month:</strong> {MONTHS[selectedMonth]} {selectedYear} | 
                <strong> Total Days in Month:</strong> {totalDays} |
                <strong> Days Reported:</strong> {attendance.length > 0 ? Math.max(...attendance.map(a => new Date(a.date).getDate())) : 0}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm print:text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-bold">No.</th>
                      <th className="text-left py-2 font-bold">Child Name</th>
                      <th className="text-center py-2 font-bold">Present</th>
                      <th className="text-center py-2 font-bold">Absent</th>
                      <th className="text-center py-2 font-bold">% Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child, idx) => {
                      const childAttendance = attendance.filter(a => a.child_id === child.id)
                      const present = childAttendance.filter(a => a.status === 'present').length
                      const absent = childAttendance.filter(a => a.status === 'absent').length
                      const rate = calculateAttendanceRate(child.id)
                      return (
                        <tr key={child.id} className="border-b border-slate-100">
                          <td className="py-2">{idx + 1}</td>
                          <td className="py-2 font-medium">{child.first_name} {child.last_name}</td>
                          <td className="py-2 text-center">{present}</td>
                          <td className="py-2 text-center">{absent}</td>
                          <td className="py-2 text-center">
                            <span className={rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Compliance Checklist */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="print:pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                3. COMPLIANCE CHECKLIST
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'dsd_registration', label: 'DSD Provincial Registration Certificate' },
                  { type: 'dbe_registration', label: 'DBE ECD Programme Registration (Form 16)' },
                  { type: 'partial_care', label: 'Partial Care Facility Registration (Form 11)' },
                  { type: 'health_clearance', label: 'Municipal Health Clearance Certificate' },
                  { type: 'fire_clearance', label: 'Fire Clearance Certificate' },
                  { type: 'building_plan', label: 'Approved Building Plan' },
                  { type: 'popia_policy', label: 'POPIA Privacy Policy' },
                ].map(doc => {
                  const { status, label } = getComplianceStatus(doc.type)
                  return (
                    <div key={doc.type} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm font-medium">{label}</span>
                      {status === 'verified' ? (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" /> Verified
                        </span>
                      ) : status === 'uploaded' ? (
                        <span className="flex items-center gap-1 text-sm text-amber-600">
                          <AlertCircle className="h-4 w-4" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" /> Missing
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Summary */}
          <Card className="print:border-0 print:shadow-none bg-slate-50 print:bg-white">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-slate-900">{children.length}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Children</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{attendance.filter(a => a.status === 'present').length}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Present</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{compliance.filter(c => c.status === 'verified').length}/7</p>
                  <p className="text-xs font-medium text-slate-500 uppercase">Docs Verified</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{new Date().toLocaleDateString('en-ZA')}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase">Report Date</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DSD Footer - Print Only */}
          <div className="hidden print:block mt-8 pt-4 border-t border-slate-300">
            <p className="text-xs text-slate-500 text-center">
              This report was generated by CentreConnect and is valid for DSD inspection purposes.
              CentreConnect • www.centreconnect.co.za
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:shadow-none { shadow: none !important; }
          .print\\:pb-2 { padding-bottom: 0.5rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; }
          .print\\:bg-white { background-color: white !important; }
        }
      `}</style>
    </div>
  )
}
