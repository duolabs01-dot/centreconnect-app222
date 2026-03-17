import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYWV6eWlpamVxa2plcHBwenplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxODQ5OCwiZXhwIjoyMDg2Nzk0NDk4fQ.qMsLAhm4zbPYGu4RVnk-CcwuYA8wSR-Gze4jiG_6ahM'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    
    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const selectedMonth = parseInt(month)
    const selectedYear = parseInt(year)
    
    if (isNaN(selectedMonth) || isNaN(selectedYear) || selectedMonth < 1 || selectedMonth > 12) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    // Get ECD ID from auth header (simplified for now - in production, verify JWT)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // For now, we'll use a hardcoded ECD ID for Bajabulile
    // In production, extract from JWT token
    const ecdId = 'f580f125-81ed-412a-8d25-f187605a6a69'

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Get the report data
    const { getDsdExportData } = await import('@/lib/ecd/dsd-export')
    const data = await getDsdExportData({ 
      supabase, 
      ecdId, 
      selectedMonth, 
      selectedYear 
    })

    // Generate HTML for the report
    const html = generateReportHTML(data, selectedMonth, selectedYear)

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Set content and generate PDF
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '12mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Department of Education - Monthly Report
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    })
    
    await browser.close()

    // Return PDF
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
    const filename = `DOE-Monthly-Report-${monthNames[selectedMonth - 1]}-${selectedYear}-${data.centreName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' }, 
      { status: 500 }
    )
  }
}

function generateReportHTML(data: any, month: number, year: number): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
  
  const total = data.children.length
  const r3500 = data.children.filter((c: any) => c.parentIncomeCategory === 'R0-R3500').length
  const r4500 = data.children.filter((c: any) => c.parentIncomeCategory === 'R0-R4500').length
  const otherIncome = data.children.filter((c: any) => c.parentIncomeCategory === 'Other').length

  const childrenSorted = [...data.children].sort((a: any, b: any) => a.childName.localeCompare(b.childName))

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { margin: 12mm 10mm; size: A4; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: 11px; 
          line-height: 1.4; 
          color: #1e293b;
          margin: 0;
          padding: 0;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 18px; margin: 0; font-weight: bold; }
        .header p { font-size: 12px; margin: 5px 0; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section-title { 
          font-size: 14px; 
          font-weight: bold; 
          margin-bottom: 10px; 
          padding: 8px; 
          background: #1e293b; 
          color: white; 
          text-align: center;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .field { display: flex; gap: 10px; }
        .field-label { font-weight: bold; min-width: 120px; }
        .field-value { flex: 1; }
        .boxes { display: flex; gap: 10px; margin: 15px 0; }
        .box { 
          flex: 1; 
          border: 2px solid #1e293b; 
          padding: 15px; 
          text-align: center; 
        }
        .box-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; }
        .box-value { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { 
          border: 1px solid #cbd5e1; 
          padding: 6px; 
          text-align: center; 
          font-size: 10px;
        }
        th { background: #f1f5f9; font-weight: bold; }
        td.text-left { text-align: left; }
        .total-row { background: #1e293b; color: white; font-weight: bold; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Department of Education</h1>
        <p><strong>Monthly Report</strong></p>
        <p>Programme: Places of Care (Crèches)</p>
      </div>

      <div class="section">
        <div class="section-title">Centre Details</div>
        <div class="grid">
          <div class="field">
            <span class="field-label">Month & Year:</span>
            <span class="field-value">${monthNames[month - 1]} ${year}</span>
          </div>
          <div class="field">
            <span class="field-label">Name of ECD:</span>
            <span class="field-value">${data.centreName}</span>
          </div>
          <div class="field">
            <span class="field-label">Physical Address:</span>
            <span class="field-value">${[data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '--'}</span>
          </div>
          <div class="field">
            <span class="field-label">Province/District:</span>
            <span class="field-value">${data.province || 'Gauteng'} — ${data.district || '--'}</span>
          </div>
          <div class="field">
            <span class="field-label">Ward:</span>
            <span class="field-value">${data.ward || '--'}</span>
          </div>
          <div class="field">
            <span class="field-label">Contact Details:</span>
            <span class="field-value">${[data.primaryContactPhone, data.primaryContactEmail].filter(Boolean).join(' / ') || '--'}</span>
          </div>
          <div class="field">
            <span class="field-label">EMIS Number:</span>
            <span class="field-value">${data.emisNumber || '--'}</span>
          </div>
          <div class="field">
            <span class="field-label">NPO/DSD Reg No:</span>
            <span class="field-value">${data.npoReg || data.dsdRegNumber || '--'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Approved Capacity</div>
        <div class="boxes">
          <div class="box">
            <div class="box-title">Approved Children (Partial Care)</div>
            <div class="box-value">${data.approvedCapacityPartialCare ?? '--'}</div>
          </div>
          <div class="box">
            <div class="box-title">Approved Children per SLA</div>
            <div class="box-value">${data.approvedCapacitySla ?? '--'}</div>
          </div>
          <div class="box">
            <div class="box-title">Children Claimed</div>
            <div class="box-value">${total}</div>
          </div>
        </div>
      </div>

      <div class="section page-break">
        <div class="section-title">Places of Care Summary</div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">Total</th>
              <th colspan="3">Total Number of Beneficiaries</th>
              <th colspan="3">New Admissions During Month</th>
              <th colspan="3">Discharges During Month</th>
            </tr>
            <tr>
              <th>1 Parent R0-R3500</th>
              <th>2 Parent R0-R4500</th>
              <th>Other</th>
              <th>1 Parent R0-R3500</th>
              <th>2 Parent R0-R4500</th>
              <th>Other</th>
              <th>1 Parent R0-R3500</th>
              <th>2 Parent R0-R4500</th>
              <th>Other</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-size: 16px; font-weight: bold;">${total}</td>
              <td>${r3500}</td>
              <td>${r4500}</td>
              <td>${otherIncome}</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Beneficiaries List</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="text-left">Surname & Initials</th>
              <th>Date of Birth</th>
              <th>Age</th>
              <th>M</th>
              <th>F</th>
              <th>Race B</th>
              <th>Disabled</th>
              <th>R0-R3500</th>
              <th>R0-R4500</th>
              <th>Other</th>
            </tr>
          </thead>
          <tbody>
            ${childrenSorted.map((child: any, idx: number) => {
              const parts = child.childName.split(' ')
              const surname = parts.slice(-1)[0] ?? ''
              const given = parts.slice(0, -1).join(' ')
              const initial = given ? given[0]?.toUpperCase() + '.' : ''
              const displayName = given ? `${surname}, ${given}` : `${surname} ${initial}`
              const dob = child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString('en-ZA') : '--'
              const age = child.dateOfBirth ? new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear() : '--'
              const gender = child.gender?.toLowerCase()
              const mCheck = (gender === 'male' || gender === 'm') ? '✓' : ''
              const fCheck = (gender === 'female' || gender === 'f') ? '✓' : ''
              const isDisabled = child.isDisabled ? 'Yes' : 'No'
              const r3500Check = child.parentIncomeCategory === 'R0-R3500' ? '✓' : ''
              const r4500Check = child.parentIncomeCategory === 'R0-R4500' ? '✓' : ''
              const otherCheck = child.parentIncomeCategory === 'Other' ? '✓' : ''
              
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="text-left">${displayName}</td>
                  <td>${dob}</td>
                  <td>${age}</td>
                  <td>${mCheck}</td>
                  <td>${fCheck}</td>
                  <td>B</td>
                  <td>${isDisabled}</td>
                  <td>${r3500Check}</td>
                  <td>${r4500Check}</td>
                  <td>${otherCheck}</td>
                </tr>
              `
            }).join('')}
            <tr class="total-row">
              <td colspan="4">TOTAL</td>
              <td>${data.doeStats.totalMale}</td>
              <td>${data.doeStats.totalFemale}</td>
              <td>${total}</td>
              <td>${data.children.filter((c: any) => c.isDisabled).length}</td>
              <td>${r3500}</td>
              <td>${r4500}</td>
              <td>${otherIncome}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section page-break">
        <div class="section-title">Staff Details</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="text-left">Full Name</th>
              <th>ID Number</th>
              <th>Gender</th>
              <th>Race</th>
              <th>Disabled</th>
              <th class="text-left">Designation</th>
              <th>Training</th>
              <th>Subsidised</th>
              <th>Monthly Salary</th>
            </tr>
          </thead>
          <tbody>
            ${data.staff.map((staff: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="text-left">${staff.firstName} ${staff.surname}</td>
                <td>${staff.idNumber || '--'}</td>
                <td>${staff.gender || '--'}</td>
                <td>${staff.race || 'B'}</td>
                <td>${staff.isDisabled ? 'Yes' : 'No'}</td>
                <td class="text-left">${staff.role}</td>
                <td>${staff.isTrained ? 'Yes' : 'No'}</td>
                <td>${staff.isSubsidized ? 'Yes' : 'No'}</td>
                <td>${staff.monthlySalary ? `R ${staff.monthlySalary.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '--'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Grand Total of Beneficiaries</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th class="text-left">Beneficiaries Category</th>
              <th>Total Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td class="text-left">Boys</td>
              <td style="font-size: 16px; font-weight: bold;">${data.doeStats.totalMale}</td>
            </tr>
            <tr>
              <td>2</td>
              <td class="text-left">Girls</td>
              <td style="font-size: 16px; font-weight: bold;">${data.doeStats.totalFemale}</td>
            </tr>
            <tr style="background: #1e293b; color: white; font-weight: bold;">
              <td colspan="2">TOTAL</td>
              <td style="font-size: 16px; font-weight: bold;">${data.doeStats.totalChildren}</td>
            </tr>
          </tbody>
        </table>
        ${data.primaryContactName ? `
          <p style="margin-top: 15px; font-size: 10px;">
            <strong>Compiled by:</strong> ${data.primaryContactName}
          </p>
        ` : ''}
      </div>
    </body>
    </html>
  `
}
