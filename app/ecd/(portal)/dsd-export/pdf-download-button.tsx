'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfDownloadButtonProps {
  month: number
  year: number
  centreName?: string
  /** Pass the full HTML string from buildDsdPdfHtml — rendered server-side */
  htmlContent?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function PdfDownloadButton({ month, year, centreName, htmlContent }: PdfDownloadButtonProps) {
  function handleDownload() {
    if (htmlContent) {
      // Open the pre-rendered full HTML in a new window and trigger print
      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) {
        alert('Pop-up blocked. Please allow pop-ups for this site and try again.')
        return
      }
      win.document.write(htmlContent)
      win.document.close()
      // Give the browser a moment to render fonts/styles before printing
      win.addEventListener('load', () => {
        setTimeout(() => {
          win.focus()
          win.print()
        }, 400)
      })
      // Fallback if load already fired
      setTimeout(() => {
        if (!win.closed) {
          win.focus()
          win.print()
        }
      }, 1200)
      return
    }

    // Fallback: print current page (legacy behaviour)
    const safe = (centreName ?? 'DOE-Report').replace(/[^a-zA-Z0-9\s]/g, '').trim()
    const original = document.title
    document.title = `DOE-Monthly-Report-${MONTH_NAMES[month - 1]}-${year}-${safe}`
    window.print()
    setTimeout(() => { document.title = original }, 1200)
  }

  return (
    <Button
      type="button"
      onClick={handleDownload}
      className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
      size="sm"
    >
      <Download className="mr-1.5 h-3.5 w-3.5" />
      Download PDF
    </Button>
  )
}
