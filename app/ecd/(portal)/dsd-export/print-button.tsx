'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DsdPrintButton() {
  function handlePrint() {
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
