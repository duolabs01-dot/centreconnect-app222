'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfDownloadButtonProps {
  month: number
  year: number
  centreName?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function PdfDownloadButton({ month, year, centreName }: PdfDownloadButtonProps) {
  function handleDownload() {
    // Set the document title so the browser uses it as the PDF filename
    const originalTitle = document.title
    const safeCenter = (centreName ?? 'DOE-Report').replace(/[^a-zA-Z0-9\s]/g, '').trim()
    document.title = `DOE-Monthly-Report-${MONTH_NAMES[month - 1]}-${year}-${safeCenter}`

    // Trigger browser print — user selects "Save as PDF" in the print dialog
    // The print stylesheet hides all portal chrome and shows only the DOE form
    window.print()

    // Restore title after print dialog closes
    // Use setTimeout to let the print dialog open first
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
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
