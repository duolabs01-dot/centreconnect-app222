import { NextRequest, NextResponse } from 'next/server'
import puppeteer, { type Browser } from 'puppeteer'

import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getDsdExportData } from '@/lib/ecd/dsd-export'
import { buildDsdPdfHtml } from '@/lib/ecd/dsd-export-render'

export const runtime = 'nodejs'

function normalizeMonth(value: string | null) {
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) && next >= 1 && next <= 12 ? next : new Date().getMonth() + 1
}

function normalizeYear(value: string | null) {
  const now = new Date().getFullYear()
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) && next >= now - 2 && next <= now + 2 ? next : now
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'centre'
}

export async function GET(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const session = await requireEcdPortalSession({ cached: false })
    const searchParams = request.nextUrl.searchParams
    const selectedMonth = normalizeMonth(searchParams.get('month'))
    const selectedYear = normalizeYear(searchParams.get('year'))

    const data = await getDsdExportData({
      supabase: session.supabase,
      ecdId: session.ecdId,
      selectedMonth,
      selectedYear,
    })

    const html = buildDsdPdfHtml(data)

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '12mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%; padding:0 10mm; font-size:9px; color:#475569; text-transform:uppercase; letter-spacing:0.16em; text-align:center;">
          Monthly Report ${data.centreName}
        </div>
      `,
      footerTemplate: `
        <div style="width:100%; padding:0 10mm; font-size:9px; color:#475569; text-align:center;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    })

    const filename = `Monthly-Report-${sanitizeFilenamePart(data.centreName)}-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`
    const pdfBuffer = Buffer.from(pdf)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[dsd-export-pdf] Failed to generate PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

