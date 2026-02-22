'use client'

import { Info } from 'lucide-react'

type AdminInfoNoteProps = {
  text: string
}

export function AdminInfoNote({ text }: AdminInfoNoteProps) {
  return (
    <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
      <Info className="h-4 w-4 text-cyan-300" />
      <span>{text}</span>
    </div>
  )
}
