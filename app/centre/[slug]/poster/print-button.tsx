'use client'

import { Button } from '@/components/ui/button'

export function PrintPosterButton() {
  return (
    <Button
      type="button"
      className="no-print rounded-2xl bg-teal-500 px-5 text-slate-950 hover:bg-teal-400"
      onClick={() => window.print()}
    >
      Print A4 Poster
    </Button>
  )
}

