import type { DsdEnrolledChild, DsdExportData } from '@/lib/ecd/dsd-export'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function formatDoeDate(value: string | null | undefined) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

export function calculateAgeAtPeriod(dateOfBirth: string | null | undefined, selectedYear: number, selectedMonth: number) {
  if (!dateOfBirth) return null
  const date = new Date(dateOfBirth)
  if (Number.isNaN(date.getTime())) return null

  let age = selectedYear - date.getFullYear()
  const monthDiff = selectedMonth - (date.getMonth() + 1)
  if (monthDiff < 0 || monthDiff === 0) {
    age -= 1
  }

  return age >= 0 ? age : 0
}

export function getGenderInitial(gender: string | null | undefined) {
  const normalized = String(gender ?? '').trim().toLowerCase()
  if (normalized === 'male' || normalized === 'm' || normalized === 'boy' || normalized === 'b' || normalized === '1') return 'M'
  if (normalized === 'female' || normalized === 'f' || normalized === 'girl' || normalized === 'g' || normalized === '2') return 'F'
  return '--'
}

export function getChildDisplayName(childName: string) {
  const parts = childName.split(' ').filter(Boolean)
  const surname = parts.at(-1) ?? ''
  const given = parts.slice(0, -1).join(' ')
  return given ? `${surname}, ${given}` : surname || childName
}

export function getSortedDsdChildren(children: DsdEnrolledChild[]) {
  return [...children].sort((left, right) => {
    const lastA = left.childName.split(' ').slice(-1)[0] ?? ''
    const lastB = right.childName.split(' ').slice(-1)[0] ?? ''
    return lastA.localeCompare(lastB)
  })
}

export function getDsdDerivedStats(data: DsdExportData) {
  const total = data.children.length
  const r3500 = data.children.filter((child) => child.parentIncomeCategory === 'R0-R3500').length
  const r4500 = data.children.filter((child) => child.parentIncomeCategory === 'R0-R4500').length
  const otherIncome = data.children.filter((child) => child.parentIncomeCategory === 'Other').length

  const newAdmissions = data.children.filter((child) => {
    if (!child.startDate) return false
    const startDate = new Date(child.startDate)
    return startDate.getFullYear() === data.selectedYear && startDate.getMonth() + 1 === data.selectedMonth
  })

  const newR3500 = newAdmissions.filter((child) => child.parentIncomeCategory === 'R0-R3500').length
  const newR4500 = newAdmissions.filter((child) => child.parentIncomeCategory === 'R0-R4500').length
  const newOther = newAdmissions.filter((child) => !['R0-R3500', 'R0-R4500'].includes(child.parentIncomeCategory)).length
  const disabledCount = data.children.filter((child) => child.isDisabled).length
  const trainedCount = data.staff.filter((staff) => staff.isTrained).length
  const practitionersEmployed = data.staff.filter((staff) => {
    const role = staff.role.toLowerCase()
    return role.includes('practitioner') || role.includes('teacher')
  }).length
  const computerLiterateCount = data.staff.filter((staff) => staff.isComputerLiterate).length
  const practitioners = data.staff.filter((staff) => {
    const role = staff.role.toLowerCase()
    return role.includes('practitioner') || role.includes('teacher')
  })
  const verifiedCompliance = data.compliance.filter((item) => item.status === 'verified')
  const healthPermit = data.compliance.find((item) => item.documentType === 'health_clearance') ?? null

  return {
    total,
    r3500,
    r4500,
    otherIncome,
    newAdmissions,
    newR3500,
    newR4500,
    newOther,
    disabledCount,
    trainedCount,
    practitionersEmployed,
    computerLiterateCount,
    practitioners,
    verifiedCompliance,
    healthPermit,
  }
}

function monthLabel(selectedMonth: number, selectedYear: number) {
  return `${MONTH_NAMES[selectedMonth - 1] ?? 'Selected month'} ${selectedYear}`
}

export function buildDsdMonthlyReportTitle(centreName: string | null | undefined) {
  const normalized = String(centreName ?? '').trim()
  return normalized ? `Monthly Report ${normalized}` : 'Monthly Report'
}

function attendanceTotal(data: DsdExportData) {
  return Array.from(data.attendanceByChild.values()).reduce((sum, item) => sum + (item.present ?? 0), 0)
}

export function buildDsdPdfHtml(data: DsdExportData) {
  const stats = getDsdDerivedStats(data)
  const children = getSortedDsdChildren(data.children)
  const periodLabel = monthLabel(data.selectedMonth, data.selectedYear)
  const healthPermitLabel = stats.healthPermit?.label || 'Municipal Health Clearance Certificate'
  const healthPermitStatus = stats.healthPermit?.status === 'verified' ? 'Verified on file' : stats.healthPermit?.status || 'Not yet verified'
  const reportTitle = buildDsdMonthlyReportTitle(data.centreName)

  // Single source of truth: gender counts derived directly from children array
  const totalBoys = children.filter(c => { const g = (c.gender || '').toLowerCase().trim(); return g === 'male' || g === 'm' || g === 'boy' || g === 'b' || g === '1' }).length
  const totalGirls = children.filter(c => { const g = (c.gender || '').toLowerCase().trim(); return g === 'female' || g === 'f' || g === 'girl' || g === 'g' || g === '2' }).length
  const grandTotal = children.length // always authoritative

  // Build day-by-day attendance map for Annexure A
  const daysInMonth = new Date(data.selectedYear, data.selectedMonth, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const dailyAttMap = new Map<string, Map<number, string>>()
  for (const row of data.rawAttendanceRows) {
    const d = new Date(row.date)
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    if (month !== data.selectedMonth || year !== data.selectedYear) continue
    if (!dailyAttMap.has(row.child_id)) dailyAttMap.set(row.child_id, new Map())
    dailyAttMap.get(row.child_id)!.set(day, row.status)
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reportTitle)}</title>
    <style>
      /* Portrait for cover + summary pages, landscape for wide tables */
      @page { margin: 10mm 12mm; size: A4 portrait; }
      @page landscape { size: A4 landscape; margin: 8mm 10mm; }
      body {
        font-family: Arial, sans-serif;
        color: #0f172a;
        margin: 0;
        font-size: 10px;
        line-height: 1.4;
      }
      .page-break { page-break-before: always; }
      .landscape-section { page: landscape; }
      .sheet {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 14px;
      }
      .header {
        border-bottom: 2px solid #cbd5e1;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .crest {
        width: 50px; height: 50px;
        border-radius: 50%; border: 2px solid #cbd5e1;
        background: #f8fafc; display: flex; align-items: center;
        justify-content: center; text-align: center;
        font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569;
        flex-shrink: 0;
      }
      .header-copy { flex: 1; text-align: center; }
      .eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; font-weight: 800; margin-bottom: 3px; }
      .title { font-size: 16px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 900; margin: 0; }
      .subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #334155; margin-top: 3px; font-weight: 800; }
      .content { padding: 14px 16px 16px; }
      .meta-row { display: flex; gap: 12px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
      .meta-label { width: 170px; flex-shrink: 0; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; }
      .meta-value { font-size: 11px; font-weight: 700; color: #0f172a; }
      .boxes { display: flex; gap: 10px; margin: 12px 0; }
      .box { flex: 1; border: 2px solid #cbd5e1; border-radius: 14px; padding: 10px; text-align: center; }
      .box-title { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: 900; line-height: 1.3; }
      .box-value { margin-top: 5px; font-size: 26px; font-weight: 900; color: #0f172a; }
      .section-bar {
        background: #0f172a; color: white;
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 0.2em; text-align: center; padding: 7px 8px;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .section-bar.alt { background: #1e293b; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; font-size: 9px; }
      th { background: #f8fafc; font-weight: 900; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      td.left, th.left { text-align: left; }
      .totals { background: #0f172a; color: white; font-weight: 900; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .compliance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
      .compliance-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; background: #f8fafc; }
      .compliance-card p { margin: 0 0 3px; }
      .small-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 900; }
      .small-value { margin-top: 4px; font-size: 12px; font-weight: 800; color: #0f172a; }
      .footer-note { margin-top: 12px; text-align: center; font-size: 8px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; font-weight: 800; }
      .signature-grid { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
      .signature-card { border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 9px; color: #475569; min-height: 30px; }
      /* Annexure A day-grid: tiny font to fit 31 days */
      .day-grid th, .day-grid td { font-size: 7.5px; padding: 3px 2px; }
      .day-grid td.present { color: #15803d; font-weight: 900; }
      .day-grid td.absent { color: #dc2626; }
    </style>
  </head>
  <body>

    <!-- PAGE 1: Cover -->
    <section class="sheet">
      <div class="header">
        <div class="crest">Gauteng<br />Province</div>
        <div class="header-copy">
          <div class="eyebrow">Department of Social Development / Education</div>
          <h1 class="title">${escapeHtml(reportTitle)}</h1>
          <div class="subtitle">Programme: Places of Care (Crèches) — Monthly Return</div>
        </div>
      </div>
      <div class="content">
        ${[
          ['Month & Year', periodLabel],
          ['Name of ECD / Crèche', data.centreName],
          ['Physical Address', [data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '--'],
          ['Province / District', `${data.province || 'Gauteng'} — ${data.district || '--'}`],
          ['Ward Number', data.ward || '--'],
          ['Contact Phone / Email', [data.primaryContactPhone, data.primaryContactEmail].filter(Boolean).join(' / ') || '--'],
          ['Registration Number', data.registrationNumber || '--'],
          ['EMIS Number', data.emisNumber || '--'],
          ['NPO / DSD Registration No.', data.npoReg || data.dsdRegNumber || '--'],
        ].map(([label, value]) => `
          <div class="meta-row">
            <div class="meta-label">${escapeHtml(label)}</div>
            <div class="meta-value">${escapeHtml(value)}</div>
          </div>
        `).join('')}

        <div class="boxes">
          ${[
            ['Approved No. of Children\n(Partial Care Certificate)', String(data.approvedCapacityPartialCare ?? '--')],
            ['Approved No. of Children\n(SLA)', String(data.approvedCapacitySla ?? '--')],
            ['No. of Children Claimed\nThis Month', String(grandTotal)],
          ].map(([label, value]) => `
            <div class="box">
              <div class="box-title">${escapeHtml(label)}</div>
              <div class="box-value">${escapeHtml(value)}</div>
            </div>
          `).join('')}
        </div>

        <div class="section-bar">Places of Care (Crèche) — Monthly Summary</div>
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="font-size:13px;">Total</th>
              <th colspan="3">Total beneficiaries</th>
              <th colspan="3">New admissions this month</th>
              <th colspan="3">Discharges this month</th>
            </tr>
            <tr>
              <th>1 Parent R0–R3 500</th><th>2 Parents R0–R4 500</th><th>Other</th>
              <th>1 Parent R0–R3 500</th><th>2 Parents R0–R4 500</th><th>Other</th>
              <th>1 Parent R0–R3 500</th><th>2 Parents R0–R4 500</th><th>Other</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-size:16px;font-weight:900;">${grandTotal}</td>
              <td>${stats.r3500}</td><td>${stats.r4500}</td><td>${stats.otherIncome}</td>
              <td>${stats.newR3500}</td><td>${stats.newR4500}</td><td>${stats.newOther}</td>
              <td>0</td><td>0</td><td>0</td>
            </tr>
          </tbody>
        </table>

        <div class="section-bar alt" style="margin-top:10px;">Other Relevant Information</div>
        <table>
          <thead><tr><th>No.</th><th class="left">Description</th><th>Count</th></tr></thead>
          <tbody>
            ${[
              ['1', 'No. of ECD Practitioners that received training', stats.trainedCount],
              ['2', 'No. of ECD Volunteers that received training', 0],
              ['3', 'No. of Children with Disabilities', stats.disabledCount],
              ['4', 'No. of ECD Practitioners Employed', stats.practitionersEmployed],
              ['5', 'No. of computers in the NPO', 1],
              ['6', 'No. of Staff who are computer literate (Excel)', stats.computerLiterateCount],
            ].map(([n, desc, val]) => `
              <tr>
                <td>${escapeHtml(n)}</td>
                <td class="left">${escapeHtml(desc)}</td>
                <td style="font-weight:900;">${escapeHtml(val)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="compliance-grid">
          <div class="compliance-card">
            <p class="small-label">Health permit / clearance</p>
            <p class="small-value">${escapeHtml(healthPermitLabel)}</p>
            <p>Status: <strong>${escapeHtml(healthPermitStatus)}</strong></p>
          </div>
          <div class="compliance-card">
            <p class="small-label">Compliance documents on file</p>
            <p class="small-value">${escapeHtml(stats.verifiedCompliance.length)} verified</p>
            <p>Generated by CentreConnect for ${escapeHtml(data.centreName)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- PAGE 2: Classification of Income (portrait) -->
    <section class="sheet page-break">
      <div class="section-bar">Classification of Income per Beneficiary</div>
      <div class="content" style="padding-top:0;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left" style="min-width:120px;">Surname &amp; Name</th>
              <th>Date of Birth</th>
              <th>Age</th>
              <th>M</th>
              <th>F</th>
              <th>Race</th>
              <th>Disabled</th>
              <th>R0–R3 500<br/>(1 Parent)</th>
              <th>R0–R4 500<br/>(2 Parents)</th>
              <th>Other</th>
              <th>New<br/>Admission</th>
              <th>Days<br/>Attended</th>
            </tr>
          </thead>
          <tbody>
            ${children.map((child, idx) => {
              const att = data.attendanceByChild.get(child.childId)
              const gi = getGenderInitial(child.gender)
              const age = calculateAgeAtPeriod(child.dateOfBirth, data.selectedYear, data.selectedMonth)
              const isNew = child.startDate
                ? (() => { const d = new Date(child.startDate); return d.getFullYear() === data.selectedYear && d.getMonth() + 1 === data.selectedMonth })()
                : false
              const race = (child as any).race || 'B'
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="left">${escapeHtml(getChildDisplayName(child.childName))}</td>
                  <td>${escapeHtml(formatDoeDate(child.dateOfBirth))}</td>
                  <td>${escapeHtml(age ?? '--')}</td>
                  <td>${gi === 'M' ? '✓' : ''}</td>
                  <td>${gi === 'F' ? '✓' : ''}</td>
                  <td>${escapeHtml(race)}</td>
                  <td>${child.isDisabled ? 'Yes' : 'No'}</td>
                  <td>${child.parentIncomeCategory === 'R0-R3500' ? '✓' : ''}</td>
                  <td>${child.parentIncomeCategory === 'R0-R4500' ? '✓' : ''}</td>
                  <td>${!['R0-R3500','R0-R4500'].includes(child.parentIncomeCategory) ? '✓' : ''}</td>
                  <td>${isNew ? 'Yes' : ''}</td>
                  <td style="font-weight:900;">${att?.present ?? 0}</td>
                </tr>
              `
            }).join('')}
            <tr class="totals">
              <td colspan="4">TOTAL</td>
              <td>${totalBoys}</td>
              <td>${totalGirls}</td>
              <td></td>
              <td>${stats.disabledCount}</td>
              <td>${stats.r3500}</td>
              <td>${stats.r4500}</td>
              <td>${stats.otherIncome}</td>
              <td>${stats.newAdmissions.length}</td>
              <td>${attendanceTotal(data)}</td>
            </tr>
          </tbody>
        </table>
        <div class="signature-grid">
          <div class="signature-card">Name of Manager<br /><strong>${escapeHtml(data.primaryContactName || '--')}</strong></div>
          <div class="signature-card">Signature</div>
          <div class="signature-card">Date<br />${escapeHtml(periodLabel)}</div>
        </div>
      </div>
    </section>

    <!-- PAGE 3: Annexure A — day-by-day attendance grid (landscape) -->
    <section class="sheet page-break landscape-section">
      <div class="section-bar alt">Annexure A — Daily Attendance Register — ${escapeHtml(periodLabel)}</div>
      <div class="content" style="padding-top:0;">
        <table class="day-grid">
          <thead>
            <tr>
              <th>No.</th>
              <th class="left" style="min-width:100px;">Surname &amp; Initials</th>
              <th>Age</th>
              ${allDays.map(d => `<th>${d}</th>`).join('')}
              <th>Total<br/>Present</th>
              <th>Total<br/>Absent</th>
            </tr>
          </thead>
          <tbody>
            ${children.map((child, idx) => {
              const dayMap = dailyAttMap.get(child.childId) ?? new Map<number, string>()
              const age = calculateAgeAtPeriod(child.dateOfBirth, data.selectedYear, data.selectedMonth)
              const present = Array.from(dayMap.values()).filter(s => s === 'present' || s === 'late').length
              const absent = Array.from(dayMap.values()).filter(s => s === 'absent' || s === 'sick').length
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="left">${escapeHtml(getChildDisplayName(child.childName))}</td>
                  <td>${escapeHtml(age ?? '--')}</td>
                  ${allDays.map(d => {
                    const s = dayMap.get(d)
                    const cls = (s === 'present' || s === 'late') ? 'present' : (s === 'absent' || s === 'sick') ? 'absent' : ''
                    const label = (s === 'present' || s === 'late') ? 'P' : (s === 'absent' || s === 'sick') ? 'A' : ''
                    return `<td class="${cls}">${label}</td>`
                  }).join('')}
                  <td style="font-weight:900;">${present}</td>
                  <td>${absent}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        <div style="margin-top:8px;font-size:8px;color:#64748b;">
          <strong>P</strong> = Present &nbsp;|&nbsp; <strong>A</strong> = Absent/Sick &nbsp;|&nbsp;
          Manager: <strong>${escapeHtml(data.primaryContactName || '--')}</strong>
        </div>
      </div>
    </section>

    <!-- PAGE 4: Staff & Management -->
    <section class="sheet page-break">
      <div class="section-bar">Breakdown of Staff &amp; Management</div>
      <div class="content" style="padding-top:0;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left">Full Name</th>
              <th>ID Number</th>
              <th>Gender</th>
              <th>Race</th>
              <th>Disabled</th>
              <th class="left">Designation</th>
              <th>Trained</th>
              <th class="left">Training detail</th>
              <th>Subsidised</th>
              <th>Gross Salary</th>
            </tr>
          </thead>
          <tbody>
            ${data.staff.length > 0 ? data.staff.map((s, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="left">${escapeHtml(`${s.firstName} ${s.surname}`)}</td>
                <td>${escapeHtml(s.idNumber || '--')}</td>
                <td>${escapeHtml(s.gender || '--')}</td>
                <td>${escapeHtml(s.race || 'B')}</td>
                <td>${s.isDisabled ? 'Yes' : 'No'}</td>
                <td class="left">${escapeHtml(s.role)}</td>
                <td>${s.isTrained ? 'Yes' : 'No'}</td>
                <td class="left">${escapeHtml(s.trainingDescription || '--')}</td>
                <td>${s.isSubsidized ? 'Yes' : 'No'}</td>
                <td>${s.monthlySalary ? `R ${s.monthlySalary.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '--'}</td>
              </tr>
            `).join('') : '<tr><td colspan="11" style="text-align:center;color:#94a3b8;">No staff records. Add staff via Employment → Staff.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <!-- PAGE 5: Practitioners List (DSD) -->
    <section class="sheet page-break">
      <div class="section-bar alt">Practitioners List — DSD</div>
      <div class="content" style="padding-top:0;">
        <p style="margin:8px 0 4px;font-size:9px;"><strong>${escapeHtml(data.centreName)}</strong>${data.npoReg ? ` &nbsp;|&nbsp; NPO: ${escapeHtml(data.npoReg)}` : ''}${data.dsdRegNumber ? ` &nbsp;|&nbsp; DSD Reg: ${escapeHtml(data.dsdRegNumber)}` : ''}</p>
        <table>
          <thead><tr><th>No.</th><th class="left">Full Name and Surname</th><th>ID Number</th></tr></thead>
          <tbody>
            ${data.staff.map((s, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="left">${escapeHtml(`${s.firstName} ${s.surname}`)}</td>
                <td style="font-family:monospace;letter-spacing:0.05em;">${escapeHtml(s.idNumber || '--')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="signature-grid" style="margin-top:12px;">
          <div class="signature-card">Compiled by<br /><strong>${escapeHtml(data.primaryContactName || '--')}</strong></div>
          <div class="signature-card">Signature</div>
          <div class="signature-card">Date<br />${escapeHtml(periodLabel)}</div>
        </div>
      </div>
    </section>

    <!-- PAGE 6: Grand Total -->
    <section class="sheet page-break">
      <div class="section-bar">Grand Total of Beneficiaries</div>
      <div class="content" style="padding-top:0;">
        <table style="max-width:320px;margin:0 auto;">
          <thead><tr><th>No.</th><th class="left">Category</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td>1</td><td class="left">Boys</td><td style="font-size:18px;font-weight:900;">${totalBoys}</td></tr>
            <tr><td>2</td><td class="left">Girls</td><td style="font-size:18px;font-weight:900;">${totalGirls}</td></tr>
            <tr class="totals"><td colspan="2">TOTAL</td><td style="font-size:18px;">${grandTotal}</td></tr>
          </tbody>
        </table>
        <div class="signature-grid" style="margin-top:16px;">
          <div class="signature-card">Name of Manager<br /><strong>${escapeHtml(data.primaryContactName || '--')}</strong></div>
          <div class="signature-card">Signature</div>
          <div class="signature-card">Date<br />${escapeHtml(periodLabel)}</div>
        </div>
        <div class="footer-note">Generated by CentreConnect · Official Monthly Return · ${escapeHtml(data.centreName)} · ${escapeHtml(periodLabel)}</div>
      </div>
    </section>

  </body>
</html>
`
}


