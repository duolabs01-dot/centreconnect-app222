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
  if (normalized === 'male' || normalized === 'm') return 'M'
  if (normalized === 'female' || normalized === 'f') return 'F'
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

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reportTitle)}</title>
    <style>
      @page { margin: 12mm 10mm; size: A4; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #0f172a;
        margin: 0;
        font-size: 11px;
        line-height: 1.45;
      }
      .page-break { page-break-before: always; }
      .sheet {
        border: 1px solid #cbd5e1;
        border-radius: 20px;
        overflow: hidden;
        margin-bottom: 18px;
      }
      .sheet.tight { margin-bottom: 12px; }
      .header {
        border-bottom: 2px solid #cbd5e1;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .crest {
        width: 58px;
        height: 58px;
        border-radius: 999px;
        border: 2px solid #cbd5e1;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        color: #475569;
      }
      .header-copy { flex: 1; text-align: center; }
      .eyebrow {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: #64748b;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .title {
        font-size: 19px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 900;
        margin: 0;
      }
      .subtitle {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #334155;
        margin-top: 4px;
        font-weight: 800;
      }
      .content { padding: 18px 20px 20px; }
      .meta-row {
        display: flex;
        gap: 16px;
        padding: 6px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .meta-label {
        width: 190px;
        flex-shrink: 0;
        font-size: 10px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 800;
      }
      .meta-value { font-size: 12px; font-weight: 700; color: #0f172a; }
      .boxes {
        display: flex;
        gap: 12px;
        margin-top: 14px;
        margin-bottom: 18px;
      }
      .box {
        flex: 1;
        border: 2px solid #cbd5e1;
        border-radius: 18px;
        padding: 12px;
        text-align: center;
      }
      .box-title {
        font-size: 9px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 900;
        line-height: 1.35;
      }
      .box-value {
        margin-top: 6px;
        font-size: 30px;
        font-weight: 900;
        color: #0f172a;
      }
      .section-bar {
        background: #0f172a;
        color: white;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        text-align: center;
        padding: 9px 10px;
      }
      .section-bar.alt { background: #1e293b; }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 6px 7px;
        text-align: center;
        font-size: 10px;
      }
      th {
        background: #f8fafc;
        font-weight: 900;
        text-transform: uppercase;
      }
      td.left, th.left { text-align: left; }
      .totals {
        background: #0f172a;
        color: white;
        font-weight: 900;
      }
      .compliance-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 18px;
      }
      .compliance-card {
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        padding: 12px;
        background: #f8fafc;
      }
      .compliance-card p { margin: 0; }
      .small-label {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #64748b;
        font-weight: 900;
      }
      .small-value {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
      }
      .footer-note {
        margin-top: 14px;
        text-align: center;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #64748b;
        font-weight: 800;
      }
      .signature-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
      }
      .signature-card {
        border-top: 1px dashed #94a3b8;
        padding-top: 10px;
        font-size: 10px;
        color: #475569;
        min-height: 34px;
      }
    </style>
  </head>
  <body>
    <section class="sheet">
      <div class="header">
        <div class="crest">Gauteng<br />Province</div>
        <div class="header-copy">
          <div class="eyebrow">Department of Education</div>
          <h1 class="title">${escapeHtml(reportTitle)}</h1>
          <div class="subtitle">Programme: Places of Care (Crèches)</div>
        </div>
      </div>
      <div class="content">
        ${[
          ['Month & Year', periodLabel],
          ['Name of ECD', data.centreName],
          ['Physical Address', [data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '--'],
          ['Province / District', `${data.province || 'Gauteng'} — ${data.district || '--'}`],
          ['Ward', data.ward || '--'],
          ['Contact Details + E-mail', [data.primaryContactPhone, data.primaryContactEmail].filter(Boolean).join(' / ') || '--'],
          ['Registration Number', data.registrationNumber || '--'],
          ['EMIS Number', data.emisNumber || '--'],
          ['NPO / DSD Reg No', data.npoReg || data.dsdRegNumber || '--'],
        ].map(([label, value]) => `
          <div class="meta-row">
            <div class="meta-label">${escapeHtml(label)}</div>
            <div class="meta-value">${escapeHtml(value)}</div>
          </div>
        `).join('')}

        <div class="boxes">
          ${[
            ['Approved number of children per partial care certificate', data.approvedCapacityPartialCare ?? '--'],
            ['Approved number of children per SLA', data.approvedCapacitySla ?? '--'],
            ['Number of children claimed for the month', stats.total],
          ].map(([label, value]) => `
            <div class="box">
              <div class="box-title">${escapeHtml(label)}</div>
              <div class="box-value">${escapeHtml(value)}</div>
            </div>
          `).join('')}
        </div>

        <div class="section-bar">Places of Care (Crèche)</div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">Total</th>
              <th colspan="3">Total number of beneficiaries</th>
              <th colspan="3">Number of new admissions during the month</th>
              <th colspan="3">Number of discharge during the month</th>
            </tr>
            <tr>
              <th>1 Parent earning R0-R3500</th>
              <th>2 Parent income R0-R4500</th>
              <th>Other</th>
              <th>1 Parent earning R0-R3500</th>
              <th>2 Parent income R0-R4500</th>
              <th>Other</th>
              <th>1 Parent earning R0-R3500</th>
              <th>2 Parent income R0-R4500</th>
              <th>Other</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-size: 16px; font-weight: 900;">${stats.total}</td>
              <td>${stats.r3500}</td>
              <td>${stats.r4500}</td>
              <td>${stats.otherIncome}</td>
              <td>${stats.newR3500}</td>
              <td>${stats.newR4500}</td>
              <td>${stats.newOther}</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>

        <div class="section-bar alt">Other relevant information</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left">Description</th>
              <th>Total number for the current month</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['1', 'No. of ECD Practitioners that received training', stats.trainedCount],
              ['2', 'No. of ECD Volunteers that received training', 0],
              ['3', 'No. of Children with Disabilities', stats.disabledCount],
              ['4', 'No. of ECD Practitioners Employed', stats.practitionersEmployed],
              ['5', 'No. of computers in an NPO', 1],
              ['6', 'No. of Staff who are computer literate (Excel)', stats.computerLiterateCount],
            ].map(([index, description, value]) => `
              <tr>
                <td>${escapeHtml(index)}</td>
                <td class="left">${escapeHtml(description)}</td>
                <td style="font-weight: 900;">${escapeHtml(value)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="compliance-grid">
          <div class="compliance-card">
            <p class="small-label">Health permit</p>
            <p class="small-value">${escapeHtml(healthPermitLabel)}</p>
            <p>Status: ${escapeHtml(healthPermitStatus)}</p>
          </div>
          <div class="compliance-card">
            <p class="small-label">Supporting compliance on file</p>
            <p class="small-value">${escapeHtml(stats.verifiedCompliance.length)} verified document${stats.verifiedCompliance.length === 1 ? '' : 's'}</p>
            <p>Generated by CentreConnect for ${escapeHtml(data.centreName)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="sheet page-break">
      <div class="section-bar">Classification of income per beneficiaries</div>
      <div class="content" style="padding-top: 0;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left">Surname & Initial / Full Name</th>
              <th>Date of Birth</th>
              <th>Age</th>
              <th>M</th>
              <th>F</th>
              <th>Race</th>
              <th>Disabled</th>
              <th>R0-R3500 (1 Parent)</th>
              <th>R0-R4500 (2 Parent)</th>
              <th>Other</th>
              <th>Days Attendance</th>
            </tr>
          </thead>
          <tbody>
            ${children.map((child, index) => {
              const attendance = data.attendanceByChild.get(child.childId)
              const genderInitial = getGenderInitial(child.gender)
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td class="left">${escapeHtml(getChildDisplayName(child.childName))}</td>
                  <td>${escapeHtml(formatDoeDate(child.dateOfBirth))}</td>
                  <td>${escapeHtml(calculateAgeAtPeriod(child.dateOfBirth, data.selectedYear, data.selectedMonth) ?? '--')}</td>
                  <td>${genderInitial === 'M' ? '✓' : ''}</td>
                  <td>${genderInitial === 'F' ? '✓' : ''}</td>
                  <td>B</td>
                  <td>${child.isDisabled ? 'Yes' : 'No'}</td>
                  <td>${child.parentIncomeCategory === 'R0-R3500' ? '✓' : ''}</td>
                  <td>${child.parentIncomeCategory === 'R0-R4500' ? '✓' : ''}</td>
                  <td>${child.parentIncomeCategory === 'Other' ? '✓' : ''}</td>
                  <td>${attendance?.present ?? 0}</td>
                </tr>
              `
            }).join('')}
            <tr class="totals">
              <td colspan="4">TOTAL</td>
              <td>${data.doeStats.totalMale}</td>
              <td>${data.doeStats.totalFemale}</td>
              <td>${stats.total}</td>
              <td>${stats.disabledCount}</td>
              <td>${stats.r3500}</td>
              <td>${stats.r4500}</td>
              <td>${stats.otherIncome}</td>
              <td>${attendanceTotal(data)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signature-grid">
          <div class="signature-card">Name of manager<br />${escapeHtml(data.primaryContactName || '--')}</div>
          <div class="signature-card">Signature</div>
          <div class="signature-card">Date<br />${escapeHtml(formatDoeDate(data.generatedAt))}</div>
        </div>
      </div>
    </section>

    <section class="sheet page-break tight">
      <div class="section-bar alt">Attendance register summary — Annexure A</div>
      <div class="content" style="padding-top: 0;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left">Surname & Initials</th>
              <th>Age</th>
              <th>Days present</th>
              <th>Days absent</th>
              <th>Total days</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${children.map((child, index) => {
              const attendance = data.attendanceByChild.get(child.childId)
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td class="left">${escapeHtml(getChildDisplayName(child.childName))}</td>
                  <td>${escapeHtml(calculateAgeAtPeriod(child.dateOfBirth, data.selectedYear, data.selectedMonth) ?? '--')}</td>
                  <td>${attendance?.present ?? 0}</td>
                  <td>${attendance?.absent ?? 0}</td>
                  <td>${data.attendanceDaysReported}</td>
                  <td>${attendance && attendance.totalRecorded > 0 ? `${attendance.attendanceRate}%` : '--'}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="sheet page-break tight">
      <div class="section-bar">Breakdown of staff & management</div>
      <div class="content" style="padding-top: 0;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left">Surname & Initials / Full Name</th>
              <th>ID Number</th>
              <th>Gender</th>
              <th>Race</th>
              <th>Disabled</th>
              <th class="left">Designation</th>
              <th>Training</th>
              <th class="left">Specify training</th>
              <th>Subsidised</th>
              <th>Gross monthly salary</th>
            </tr>
          </thead>
          <tbody>
            ${data.staff.length > 0 ? data.staff.map((staff, index) => `
              <tr>
                <td>${index + 1}</td>
                <td class="left">${escapeHtml(`${staff.firstName} ${staff.surname}`)}</td>
                <td>${escapeHtml(staff.idNumber || '--')}</td>
                <td>${escapeHtml(staff.gender || '--')}</td>
                <td>${escapeHtml(staff.race || 'B')}</td>
                <td>${staff.isDisabled ? 'Yes' : 'No'}</td>
                <td class="left">${escapeHtml(staff.role)}</td>
                <td>${staff.isTrained ? 'Yes' : 'No'}</td>
                <td class="left">${escapeHtml(staff.trainingDescription || '--')}</td>
                <td>${staff.isSubsidized ? 'Yes' : 'No'}</td>
                <td>${staff.monthlySalary ? escapeHtml(`R ${staff.monthlySalary.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`) : '--'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="11">No staff records available for this month.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>

    <section class="sheet page-break tight">
      <div class="section-bar alt">Grand total of beneficiaries</div>
      <div class="content" style="padding-top: 0;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="left">Beneficiaries category</th>
              <th>Total number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td class="left">Boys</td>
              <td style="font-size: 15px; font-weight: 900;">${data.doeStats.totalMale}</td>
            </tr>
            <tr>
              <td>2</td>
              <td class="left">Girls</td>
              <td style="font-size: 15px; font-weight: 900;">${data.doeStats.totalFemale}</td>
            </tr>
            <tr class="totals">
              <td colspan="2">TOTAL</td>
              <td>${data.doeStats.totalChildren}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer-note">Generated by CentreConnect · Official monthly return · ${escapeHtml(data.centreName)} · ${escapeHtml(periodLabel)}</div>
      </div>
    </section>
  </body>
</html>
`
}


