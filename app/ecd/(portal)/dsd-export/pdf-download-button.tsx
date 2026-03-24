'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfDownloadButtonProps {
  month: number
  year: number
  centreName?: string
  htmlContent?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function PdfDownloadButton({ month, year, centreName, htmlContent }: PdfDownloadButtonProps) {
  function handleDownload() {
    if (!htmlContent) return

    const safe = (centreName ?? 'DOE-Report').replace(/[^a-zA-Z0-9\s-]/g, '').trim()
    const filename = `DOE-Monthly-Report-${MONTH_NAMES[month - 1]}-${year}-${safe}`

    // Inject a save-instructions banner into the HTML before opening
    const instructions = `
      <div id="save-banner" style="
        position:fixed;top:0;left:0;right:0;z-index:9999;
        background:#0f766e;color:white;
        padding:10px 16px;
        font:bold 13px/1.5 Arial,sans-serif;
        display:flex;align-items:center;justify-content:space-between;
        gap:12px;
      ">
        <span>📄 <strong>${filename}</strong></span>
        <span style="font-size:12px;opacity:0.9;">
          Press <kbd style="background:rgba(255,255,255,0.2);border-radius:4px;padding:1px 6px;">Ctrl+P</kbd>
          (or <kbd style="background:rgba(255,255,255,0.2);border-radius:4px;padding:1px 6px;">⌘P</kbd> on Mac)
          → set destination to <strong>Save as PDF</strong>
        </span>
        <button onclick="document.getElementById('save-banner').remove()" style="
          background:rgba(255,255,255,0.2);border:none;border-radius:6px;
          color:white;padding:4px 10px;cursor:pointer;font-size:12px;
        ">✕ Dismiss</button>
      </div>
      <div style="height:44px;"></div>
    `

    const htmlWithBanner = htmlContent.replace('<body>', `<body>${instructions}`)

    const win = window.open('', '_blank', `width=1000,height=800,title=${filename}`)
    if (!win) {
      alert('Pop-ups are blocked. Please allow pop-ups for this site and try again.')
      return
    }
    win.document.write(htmlWithBanner)
    win.document.close()
    win.focus()
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
