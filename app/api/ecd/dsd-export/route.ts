import { NextRequest, NextResponse } from 'next/server'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { csvEscape, getDsdExportData } from '@/lib/ecd/dsd-export'

function normalizeMonth(value: string | null) {
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) && next >= 1 && next <= 12 ? next : new Date().getMonth() + 1
}

function normalizeYear(value: string | null) {
  const now = new Date().getFullYear()
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) && next >= now - 2 && next <= now + 2 ? next : now
}

export async function GET(request: NextRequest) {
  const session = await requireEcdPortalSession()
  const searchParams = request.nextUrl.searchParams
  const selectedMonth = normalizeMonth(searchParams.get('month'))
  const selectedYear = normalizeYear(searchParams.get('year'))
  const kind = String(searchParams.get('kind') ?? 'enrolment').trim().toLowerCase()

  const data = await getDsdExportData({
    supabase: session.supabase,
    ecdId: session.ecdId,
    selectedMonth,
    selectedYear,
  })

  let rows: string[] = []
  let filename = `dsd-enrolment-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`

  if (kind === 'attendance') {
    filename = `dsd-attendance-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    rows = [
      ['Child name', 'Class', 'Present', 'Late', 'Absent', 'Sick', 'Days recorded', 'Attendance rate'].map(csvEscape).join(','),
      ...data.children.map((child) => {
        const attendance = data.attendanceByChild.get(child.childId)
        return [
          child.childName,
          child.className ?? '--',
          attendance?.present ?? 0,
          attendance?.late ?? 0,
          attendance?.absent ?? 0,
          attendance?.sick ?? 0,
          attendance?.totalRecorded ?? 0,
          `${attendance?.attendanceRate ?? 0}%`,
        ].map(csvEscape).join(',')
      }),
    ]
  } else if (kind === 'compliance') {
    filename = `dsd-compliance-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    rows = [
      ['Document', 'Status', 'Expiry', 'File URL', 'Notes'].map(csvEscape).join(','),
      ...data.compliance.map((item) => [
        item.label,
        item.status,
        item.expiresAt ?? '',
        item.fileUrl ?? '',
        item.notes ?? '',
      ].map(csvEscape).join(',')),
    ]
  } else if (kind === 'staff') {
    filename = `doe-staff-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    rows = [
      ['ECD CENTRE MONTHLY STAFF RETURN'].map(csvEscape).join(','),
      ['Centre', data.centreName].map(csvEscape).join(','),
      ['EMIS', data.emisNumber ?? '--'].map(csvEscape).join(','),
      ['Month', data.monthLabel, 'Year', selectedYear].map(csvEscape).join(','),
      '',
      ['SUMMARY OF PRACTITIONERS'].map(csvEscape).join(','),
      ['Total Staff', data.staff.length].map(csvEscape).join(','),
      ['Trained Staff', data.staff.filter(s => s.isTrained).length].map(csvEscape).join(','),
      ['Untrained Staff', data.staff.filter(s => !s.isTrained).length].map(csvEscape).join(','),
      '',
      ['First Name', 'Surname', 'Role', 'Trained', 'Excel Literate'].map(csvEscape).join(','),
      ...data.staff.map((s) => [
        s.firstName,
        s.surname,
        s.role,
        s.isTrained ? 'Yes' : 'No',
        s.isComputerLiterate ? 'Yes' : 'No',
      ].map(csvEscape).join(',')),
    ]
  } else {
    // Full enrolment export with income categories and disability
    rows = [
      ['Centre', data.centreName].map(csvEscape).join(','),
      ['EMIS', data.emisNumber ?? '--'].map(csvEscape).join(','),
      ['Reg', data.registrationNumber ?? '--'].map(csvEscape).join(','),
      ['Month', data.monthLabel, 'Year', selectedYear].map(csvEscape).join(','),
      '',
      ['Child name', 'Date of birth', 'Age', 'Gender', 'Class', 'Income Category', 'Disabled', 'Disability Notes', 'Start date', 'Parent', 'Phone'].map(csvEscape).join(','),
      ...data.children.map((child) => [
        child.childName,
        child.dateOfBirth ?? '',
        child.ageLabel,
        child.gender ?? '',
        child.className ?? '--',
        child.parentIncomeCategory,
        child.isDisabled ? 'Yes' : 'No',
        child.disabilityDescription,
        child.startDate ?? '',
        child.parentName,
        child.parentPhone,
      ].map(csvEscape).join(',')),
    ]
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
