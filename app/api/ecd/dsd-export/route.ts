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
    // DOE Breakdown of Staff & Management — matches page 6 of Monthly Report PDF
    filename = `doe-staff-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    const npoLine = data.npoReg ? `NPO/DSD Reg: ${data.npoReg}` : (data.dsdRegNumber ?? '--')
    rows = [
      ['DOE MONTHLY REPORT — BREAKDOWN OF STAFF & MANAGEMENT'].map(csvEscape).join(','),
      ['Centre', data.centreName].map(csvEscape).join(','),
      ['EMIS', data.emisNumber ?? '--', 'NPO/DSD Reg', npoLine].map(csvEscape).join(','),
      ['Address', [data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '--'].map(csvEscape).join(','),
      ['Province', data.province ?? 'Gauteng', 'District', data.district ?? '--', 'Ward', data.ward ?? '--'].map(csvEscape).join(','),
      ['Contact', data.primaryContactPhone ?? '--', 'Email', data.primaryContactEmail ?? '--'].map(csvEscape).join(','),
      ['Compiled by', data.primaryContactName ?? '--', 'Month', data.monthLabel, 'Year', String(selectedYear)].map(csvEscape).join(','),
      '',
      ['SUMMARY'].map(csvEscape).join(','),
      ['Total Staff', data.staff.length, 'Trained', data.staff.filter(s => s.isTrained).length, 'Computer Literate', data.staff.filter(s => s.isComputerLiterate).length].map(csvEscape).join(','),
      '',
      ['No.', 'Surname & Initials / Full Name', 'ID Number', 'Gender (M/F)', 'Race (B/W/C/I/A)', 'Disabled (Yes/No)', 'Disability Details', 'Designation', 'Training Received (Yes/No)', 'Training Specify', 'Subsidised (Yes/No)', 'Gross Monthly Salary'].map(csvEscape).join(','),
      ...data.staff.map((s, i) => [
        i + 1,
        `${s.firstName} ${s.surname}`,
        s.idNumber ?? '--',
        s.gender ?? '--',
        s.race ?? 'B',
        s.isDisabled ? 'Yes' : 'No',
        s.disabilityDescription ?? '',
        s.role,
        s.isTrained ? 'Yes' : 'No',
        s.trainingDescription ?? '--',
        s.isSubsidized ? 'Yes' : 'No',
        s.monthlySalary ? `R${s.monthlySalary.toFixed(2)}` : '--',
      ].map(csvEscape).join(',')),
    ]
  } else {
    // Full enrolment export — Classification of Income per Beneficiaries (matches pages 2/3 of PDF)
    const npoLine = data.npoReg ? `NPO/DSD Reg: ${data.npoReg}` : (data.dsdRegNumber ?? '--')
    rows = [
      ['DOE MONTHLY REPORT — CLASSIFICATION OF INCOME PER BENEFICIARIES'].map(csvEscape).join(','),
      ['Centre', data.centreName].map(csvEscape).join(','),
      ['EMIS', data.emisNumber ?? '--', 'NPO/DSD Reg', npoLine].map(csvEscape).join(','),
      ['Address', [data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '--'].map(csvEscape).join(','),
      ['Month', data.monthLabel, 'Year', String(selectedYear), 'Total Children', data.children.length].map(csvEscape).join(','),
      '',
      ['INCOME SUMMARY'].map(csvEscape).join(','),
      ['1 Parent R0-R3500', data.children.filter(c => c.parentIncomeCategory === 'R0-R3500').length,
       '2 Parent R0-R4500', data.children.filter(c => c.parentIncomeCategory === 'R0-R4500').length,
       'Other', data.children.filter(c => c.parentIncomeCategory === 'Other').length].map(csvEscape).join(','),
      ['Boys', data.doeStats.totalMale, 'Girls', data.doeStats.totalFemale, 'Total', data.doeStats.totalChildren].map(csvEscape).join(','),
      '',
      ['No.', 'Surname & Initial / Full Name', 'Date of Birth', 'Age', 'Gender (M/F)', 'Race', 'Disabled', 'Disability Notes', 'R0-R3500 (1 Parent)', 'R0-R4500 (2 Parent)', 'Other', 'Days Attendance', 'Class', 'Parent / Guardian', 'Contact', 'Start Date'].map(csvEscape).join(','),
      ...data.children.map((child, i) => {
        const attendance = data.attendanceByChild.get(child.childId)
        const parts = child.childName.split(' ')
        const surname = parts.slice(-1)[0] ?? ''
        const given = parts.slice(0, -1).join(' ')
        const gi = (child.gender ?? '').toLowerCase()
        const gLabel = gi === 'male' || gi === 'm' ? 'M' : gi === 'female' || gi === 'f' ? 'F' : '--'
        return [
          i + 1,
          given ? `${surname}, ${given}` : surname,
          child.dateOfBirth ?? '',
          child.ageLabel,
          gLabel,
          'B',
          child.isDisabled ? 'Yes' : 'No',
          child.disabilityDescription ?? '',
          child.parentIncomeCategory === 'R0-R3500' ? '✓' : '',
          child.parentIncomeCategory === 'R0-R4500' ? '✓' : '',
          child.parentIncomeCategory === 'Other' ? '✓' : '',
          attendance?.present ?? 0,
          child.className ?? '--',
          child.parentName,
          child.parentPhone,
          child.startDate ?? '',
        ].map(csvEscape).join(',')
      }),
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
