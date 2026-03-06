'use client'

import { useState } from 'react'
import { Button } from '@/components/cc-admin/Button'
import { adminTheme } from '@/lib/admin-theme'
import { CreateSupportTicketDialog } from './CreateSupportTicketDialog'

interface SupportPageClientControlsProps {
  availableCentres: Array<{ id: string; name: string }>
  availableAssignees: Array<{ id: string; name: string }>
}

export function SupportPageClientControls({ availableCentres, availableAssignees }: SupportPageClientControlsProps) {
  const [createTicketOpen, setCreateTicketOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="font-orbitron text-[9px] tracking-widest uppercase border-white/10 hover:bg-white/5" onClick={() => setCreateTicketOpen(true)}>New Ticket</Button>
      <CreateSupportTicketDialog
        open={createTicketOpen}
        onOpenChange={setCreateTicketOpen}
        availableCentres={availableCentres}
        availableAssignees={availableAssignees}
      />
    </>
  )
}
