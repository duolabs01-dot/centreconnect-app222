import 'server-only'

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string, options?: Record<string, unknown>) => any
  }
}

export type DsdEnrolledChild = {
  applicationId: string
  childId: string
  childName: string
  dateOfBirth: string | null
  ageLabel: string
  gender: string | null
  className: string | null
  ageGroup: string | null
  startDate: string | null
  parentName: string
  parentPhone: string
  parentIncomeCategory: string
  isDisabled: boolean
  disabilityDescription: string
}

export type DsdAttendanceSummary = {
  childId: string
  present: number
  absent: number
  sick: number
  late: number
  totalRecorded: number
  attendanceRate: number
}

export type DsdComplianceItem = {
  id: string
  documentType: string
  label: string
  status: 'missing' | 'uploaded' | 'verified' | 'expired'
  expiresAt: string | null
  fileUrl: string | null
  notes: string | null
}

export type DoeMonthlyStats = {
  totalChildren: number
  byAge: {
    under1: { m: number; f: number }
    age1to2: { m: number; f: number }
    age2to3: { m: number; f: number }
    age3to4: { m: number; f: number }
    age4to5: { m: number; f: number }
    age5to6: { m: number; f: number }
    over6: { m: number; f: number }
  }
  totalMale: number
  totalFemale: number
}

export type DsdStaffRecord = {
  id: string
  firstName: string
  surname: string
  idNumber: string | null
  role: string
  gender: string | null
  race: string | null
  isDisabled: boolean
  disabilityDescription: string | null
  isTrained: boolean
  trainingDescription: string | null
  isComputerLiterate: boolean
  isSubsidized: boolean
  monthlySalary: number | null
}

export type DsdExportData = {
  centreName: string
  registrationNumber: string | null
  emisNumber: string | null
  npoReg: string | null
  dsdRegNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  province: string | null
  approvedCapacityPartialCare: number | null
  approvedCapacitySla: number | null
  ward: string | null
  district: string | null
  primaryContactName: string | null
  primaryContactPhone: string | null
  primaryContactEmail: string | null
  selectedMonth: number
  selectedYear: number
  generatedAt: string
  monthLabel: string
  children: DsdEnrolledChild[]
  attendanceByChild: Map<string, DsdAttendanceSummary>
  attendanceDaysReported: number
  compliance: DsdComplianceItem[]
  verifiedDocs: number
  doeStats: DoeMonthlyStats
  staff: DsdStaffRecord[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined, fallback = '') {
  const next = String(value ?? '').trim()
  return next || fallback
}

function getMonthWindow(selectedYear: number, selectedMonth: number) {
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

function formatAgeLabel(dateOfBirth: string | null) {
  if (!dateOfBirth) return '--'
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return '--'
  const now = new Date()
  let years = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    years -= 1
  }
  return years >= 0 ? `${years} years` : '--'
}

export function getDsdMonthOptions() {
  const now = new Date()
  return {
    selectedMonth: now.getMonth() + 1,
    selectedYear: now.getFullYear(),
    months: MONTHS,
    years: [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1],
  }
}

export function getDoeMonthlyReturnData(children: DsdEnrolledChild[]): DoeMonthlyStats {
  const stats: DoeMonthlyStats = {
    totalChildren: children.length,
    byAge: {
      under1: { m: 0, f: 0 },
      age1to2: { m: 0, f: 0 },
      age2to3: { m: 0, f: 0 },
      age3to4: { m: 0, f: 0 },
      age4to5: { m: 0, f: 0 },
      age5to6: { m: 0, f: 0 },
      over6: { m: 0, f: 0 },
    },
    totalMale: 0,
    totalFemale: 0,
  }

  for (const child of children) {
    if (!child.dateOfBirth) continue

    const dob = new Date(child.dateOfBirth)
    if (Number.isNaN(dob.getTime())) continue

    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--
    }

    const gender = (child.gender || '').toLowerCase()
    const isMale = gender === 'male' || gender === 'm'
    const isFemale = gender === 'female' || gender === 'f'

    if (isMale) stats.totalMale++
    if (isFemale) stats.totalFemale++

    if (age < 1) {
      if (isMale) stats.byAge.under1.m++
      if (isFemale) stats.byAge.under1.f++
    } else if (age < 2) {
      if (isMale) stats.byAge.age1to2.m++
      if (isFemale) stats.byAge.age1to2.f++
    } else if (age < 3) {
      if (isMale) stats.byAge.age2to3.m++
      if (isFemale) stats.byAge.age2to3.f++
    } else if (age < 4) {
      if (isMale) stats.byAge.age3to4.m++
      if (isFemale) stats.byAge.age3to4.f++
    } else if (age < 5) {
      if (isMale) stats.byAge.age4to5.m++
      if (isFemale) stats.byAge.age4to5.f++
    } else if (age < 6) {
      if (isMale) stats.byAge.age5to6.m++
      if (isFemale) stats.byAge.age5to6.f++
    } else {
      if (isMale) stats.byAge.over6.m++
      if (isFemale) stats.byAge.over6.f++
    }
  }

  return stats
}

export async function getDsdExportData(input: {
  supabase: any
  ecdId: string
  selectedMonth: number
  selectedYear: number
}): Promise<DsdExportData> {
  const { supabase, ecdId, selectedMonth, selectedYear } = input
  const { startDate, endDate } = getMonthWindow(selectedYear, selectedMonth)

  const [{ data: centre }, { data: enrolledApplications }, { data: complianceRows }, { data: staffRows }] = await Promise.all([
    supabase
      .from('ecd_centres')
      .select('name,registration_number,emis_number,npo_reg,dsd_reg_number,address_line1,address_line2,province,approved_capacity_partial_care,approved_capacity_sla,ward,district,primary_contact_name,primary_contact_phone,primary_contact_email,contact_phone,contact_email')
      .eq('id', ecdId)
      .maybeSingle(),
    supabase
      .from('applications')
      .select('id,child_id,parent_id,start_date,children(id,first_name,last_name,date_of_birth,gender,class_id,parent_income_category,is_disabled,disability_description),parents(alt_phone,user_profiles(full_name,phone))')
      .eq('ecd_id', ecdId)
      .eq('status', 'enrolled')
      .order('submitted_at', { ascending: true }),
    supabase
      .from('compliance_documents')
      .select('id,document_type,label,status,expires_at,file_url,notes')
      .eq('ecd_id', ecdId)
      .order('label', { ascending: true }),
    supabase
      .from('ecd_staff')
      .select('id,first_name,surname,id_number,role,gender,race,is_disabled,disability_description,is_trained,training_description,is_computer_literate,is_subsidized,monthly_salary')
      .eq('ecd_id', ecdId)
      .order('surname', { ascending: true }),
  ])

  const applicationRows = (enrolledApplications ?? []) as Array<Record<string, unknown>>
  const classIds = Array.from(
    new Set(
      applicationRows
        .map((row) => normalizeOne(row.children as any))
        .map((child) => normalizeText((child as Record<string, unknown> | null)?.class_id as string | null, ''))
        .filter(Boolean)
    )
  )

  const [{ data: classRows }, { data: attendanceRows }] = await Promise.all([
    classIds.length > 0
      ? supabase.from('ecd_classes').select('id,name,age_group').in('id', classIds)
      : Promise.resolve({ data: [] }),
    applicationRows.length > 0
      ? supabase
          .from('attendance_records')
          .select('child_id,date,status')
          .eq('centre_id', ecdId)
          .gte('date', startDate)
          .lte('date', endDate)
      : Promise.resolve({ data: [] }),
  ])

  const classMap = new Map(
    ((classRows ?? []) as Array<{ id: string; name: string | null; age_group: string | null }>).map((row) => [
      String(row.id),
      row,
    ])
  )

  const children: DsdEnrolledChild[] = applicationRows.map((row) => {
    const child = normalizeOne(row.children as any) as Record<string, unknown> | null
    const parent = normalizeOne(row.parents as any) as Record<string, unknown> | null
    const parentProfile = normalizeOne((parent?.user_profiles ?? null) as any) as Record<string, unknown> | null
    const classId = normalizeText((child?.class_id as string | null) ?? null, '')
    const classMeta = classId ? classMap.get(classId) : null
    return {
      applicationId: String(row.id),
      childId: String(row.child_id ?? child?.id ?? ''),
      childName: `${normalizeText(child?.first_name as string | null)} ${normalizeText(child?.last_name as string | null)}`.trim() || 'Child',
      dateOfBirth: normalizeText(child?.date_of_birth as string | null, '') || null,
      ageLabel: formatAgeLabel(normalizeText(child?.date_of_birth as string | null, '') || null),
      gender: normalizeText(child?.gender as string | null, '') || null,
      className: classMeta?.name?.trim() || null,
      ageGroup: classMeta?.age_group?.trim() || null,
      startDate: normalizeText(row.start_date as string | null, '') || null,
      parentName: normalizeText(parentProfile?.full_name as string | null, 'Parent not linked yet'),
      parentPhone: normalizeText((parentProfile?.phone as string | null) ?? (parent?.alt_phone as string | null), '--'),
      parentIncomeCategory: normalizeText(child?.parent_income_category as string | null, 'Other'),
      isDisabled: Boolean(child?.is_disabled),
      disabilityDescription: normalizeText(child?.disability_description as string | null, ''),
    }
  }).sort((a, b) => a.childName.localeCompare(b.childName))

  const attendanceByChild = new Map<string, DsdAttendanceSummary>()
  const uniqueAttendanceDays = new Set<string>()
  for (const row of (attendanceRows ?? []) as Array<{ child_id: string; date: string; status: string }>) {
    uniqueAttendanceDays.add(String(row.date))
    const childId = String(row.child_id)
    const current = attendanceByChild.get(childId) ?? {
      childId,
      present: 0,
      absent: 0,
      sick: 0,
      late: 0,
      totalRecorded: 0,
      attendanceRate: 0,
    }
    if (row.status === 'present') current.present += 1
    if (row.status === 'absent') current.absent += 1
    if (row.status === 'sick') current.sick += 1
    if (row.status === 'late') current.late += 1
    current.totalRecorded += 1
    attendanceByChild.set(childId, current)
  }

  for (const summary of attendanceByChild.values()) {
    const attended = summary.present + summary.late
    summary.attendanceRate = summary.totalRecorded > 0 ? Math.round((attended / summary.totalRecorded) * 100) : 0
  }

  const compliance = ((complianceRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    documentType: String(row.document_type ?? ''),
    label: normalizeText(row.label as string | null, 'Compliance document'),
    status: String(row.status ?? 'missing') as DsdComplianceItem['status'],
    expiresAt: normalizeText(row.expires_at as string | null, '') || null,
    fileUrl: normalizeText(row.file_url as string | null, '') || null,
    notes: normalizeText(row.notes as string | null, '') || null,
  }))

  return {
    centreName: centre?.name?.trim() || 'Your creche',
    registrationNumber: centre?.registration_number?.trim() || null,
    emisNumber: centre?.emis_number?.trim() || null,
    npoReg: centre?.npo_reg?.trim() || null,
    dsdRegNumber: centre?.dsd_reg_number?.trim() || null,
    addressLine1: centre?.address_line1?.trim() || null,
    addressLine2: centre?.address_line2?.trim() || null,
    province: centre?.province?.trim() || null,
    approvedCapacityPartialCare: centre?.approved_capacity_partial_care || null,
    approvedCapacitySla: centre?.approved_capacity_sla || null,
    ward: centre?.ward?.trim() || null,
    district: centre?.district?.trim() || null,
    primaryContactName: centre?.primary_contact_name?.trim() || null,
    primaryContactPhone: (centre?.primary_contact_phone ?? centre?.contact_phone)?.trim() || null,
    primaryContactEmail: (centre?.primary_contact_email ?? centre?.contact_email)?.trim() || null,
    selectedMonth,
    selectedYear,
    generatedAt: new Date().toISOString(),
    monthLabel: MONTHS[selectedMonth - 1] || 'Selected month',
    children,
    attendanceByChild,
    attendanceDaysReported: uniqueAttendanceDays.size,
    compliance,
    verifiedDocs: compliance.filter((item) => item.status === 'verified').length,
    doeStats: getDoeMonthlyReturnData(children),
    staff: ((staffRows ?? []) as any[]).map(row => ({
      id: String(row.id),
      firstName: String(row.first_name),
      surname: String(row.surname),
      idNumber: normalizeText(row.id_number as string | null, '') || null,
      role: String(row.role),
      gender: normalizeText(row.gender as string | null, '') || null,
      race: normalizeText(row.race as string | null, '') || null,
      isDisabled: Boolean(row.is_disabled),
      disabilityDescription: normalizeText(row.disability_description as string | null, '') || null,
      isTrained: Boolean(row.is_trained),
      trainingDescription: normalizeText(row.training_description as string | null, '') || null,
      isComputerLiterate: Boolean(row.is_computer_literate),
      isSubsidized: Boolean(row.is_subsidized),
      monthlySalary: row.monthly_salary ? Number(row.monthly_salary) : null,
    })),
  }
}

export function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}
