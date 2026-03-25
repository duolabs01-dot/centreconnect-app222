'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DsdPrintButtonProps {
  /** Called before window.print() — used by Starter tier to log the export */
  onExport?: () => Promise<void>
}

export function DsdPrintButton({ onExport }: DsdPrintButtonProps) {
  async function handlePrint() {
    if (onExport) {
      try { await onExport() } catch { /* non-fatal */ }
    }
    window.print()
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      onClick={handlePrint}
    >
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  )
}
