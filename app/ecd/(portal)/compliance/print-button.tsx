'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintComplianceButton() {
  return (
    <Button
      variant="outline"
      className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
      onClick={() => window.print()}
    >
      <Printer className="mr-2 h-4 w-4" />
      Print Checklist
    </Button>
  )
}
