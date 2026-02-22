'use client'

import { useState, useTransition } from 'react' // Import useTransition
import { SupportPageClientControls } from './SupportPageClientControls'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Button } from '@/components/cc-admin/Button'
import { cn } from '@/lib/utils'
import { SupportTicket } from '@/app/admin/support/page' // Importing the interface
import toast from 'react-hot-toast' // Import toast
import { updateTicketStatus } from '@/lib/actions/support-tickets' // Import the server action

interface SupportPageClientLayoutProps {
  tickets: SupportTicket[]
  availableCentres: Array<{ id: string; name: string }>
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

// Pipeline column definitions
const PIPELINE_COLUMNS = [
  { id: 'open', title: 'Open', statuses: ['open'] },
  { id: 'in_progress', title: 'In Progress', statuses: ['in_progress'] },
  { id: 'awaiting_reply', title: 'Awaiting Reply', statuses: ['waiting_response'] },
  { id: 'resolved', title: 'Resolved', statuses: ['resolved'] },
  { id: 'closed', title: 'Closed', statuses: ['closed'] },
]

// Utility to calculate ticket age
function getTicketAge(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffTime = Math.abs(now.getTime() - created.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export function SupportPageClientLayout({ tickets, availableCentres }: SupportPageClientLayoutProps) {
  const [isPipelineView, setIsPipelineView] = useState(false)
  const [isPending, startTransition] = useTransition() // Use useTransition

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    startTransition(async () => {
      toast.loading(`Moving ticket...`);
      const res = await updateTicketStatus(ticketId, newStatus);
      toast.dismiss();
      if (res.success) {
        toast.success('Ticket status updated successfully!');
      } else {
        toast.error(res.error || 'Failed to update ticket status.');
      }
    });
  }

  return (
    <CyberCard className="p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
        <h2 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase text-cyber-cyan">Support Queue ({tickets.length})</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!isPipelineView ? 'default' : 'outline'}
            className={cn("font-orbitron text-[9px] tracking-widest uppercase", !isPipelineView ? "bg-cyber-cyan text-slate-950" : "border-white/10 hover:bg-white/5")}
            onClick={() => setIsPipelineView(false)}
            disabled={isPending}
          >
            List View
          </Button>
          <Button
            size="sm"
            variant={isPipelineView ? 'default' : 'outline'}
            className={cn("font-orbitron text-[9px] tracking-widest uppercase", isPipelineView ? "bg-cyber-cyan text-slate-950" : "border-white/10 hover:bg-white/5")}
            onClick={() => setIsPipelineView(true)}
            disabled={isPending}
          >
            Pipeline View
          </Button>
          <SupportPageClientControls availableCentres={availableCentres} />
        </div>
      </div>
      <div className="bg-slate-950/40">
        {isPipelineView ? (
          <div className="flex space-x-4 p-4 overflow-x-auto min-h-[500px]">
            {PIPELINE_COLUMNS.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-72">
                <h3 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase text-cyber-cyan mb-3">{column.title}</h3>
                <div className="space-y-3">
                  {tickets
                    .filter((ticket) => column.statuses.includes(ticket.status))
                    .map((ticket) => {
                      const centre = normalizeOne(ticket.ecd_centres);
                      const age = getTicketAge(ticket.created_at);
                      return (
                        <div key={ticket.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-3 shadow-lg">
                          <p className="font-mono text-[10px] text-slate-400 mb-1">#{ticket.ticket_number} <span className="float-right">{age}</span></p>
                          <p className="text-sm text-white font-medium mb-1">{ticket.subject}</p>
                          <p className="text-xs text-slate-300 mb-2">{(centre as any)?.name ?? 'Unknown Centre'}</p>
                          <div className="flex items-center gap-0.5 mb-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-1 h-3 rounded-full",
                                  i < ticket.priority ? (ticket.priority >= 4 ? "bg-rose-500" : "bg-cyan-500") : "bg-white/5"
                                )}
                              />
                            ))}
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 ml-2">P{ticket.priority}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PIPELINE_COLUMNS.map((col) => (
                              col.id !== ticket.status && (
                                <Button
                                  key={col.id}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[8px] uppercase tracking-widest font-orbitron border-white/10 hover:bg-white/5"
                                  onClick={() => handleStatusChange(ticket.id, col.statuses[0])}
                                  disabled={isPending}
                                >
                                  Move to {col.title}
                                </Button>
                              )
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 min-w-[120px]">Protocol</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 min-w-[150px]">Node_Origin</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 min-w-[120px]">Status</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 min-w-[100px]">Priority</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 min-w-[200px]">Subject</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 text-right min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const centre = normalizeOne(ticket.ecd_centres)
                return (
                  <TableRow key={ticket.id} className="border-white/5 hover:bg-white/5 group">
                    <TableCell className="p-4">
                      <span className="font-mono text-xs text-white">#{ticket.ticket_number}</span>
                    </TableCell>
                    <TableCell className="p-4">
                      <span className="text-slate-300 text-xs font-medium block">{(centre as any)?.name ?? 'Unknown'}</span>
                      <span className="text-[9px] text-slate-500 uppercase">{(centre as any)?.city ?? 'REMOTE'}</span>
                    </TableCell>
                    <TableCell className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        ticket.status === 'open' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                        ticket.status === 'resolved' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        "bg-white/5 text-slate-400 border border-white/10"
                      )}>
                        {ticket.status}
                      </span>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1 h-3 rounded-full",
                              i < ticket.priority ? (ticket.priority >= 4 ? "bg-rose-500" : "bg-cyan-500") : "bg-white/5"
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 max-w-[240px] truncate">
                      <span className="text-slate-300 text-xs">{ticket.subject}</span>
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button size="sm" className="h-7 text-[10px] uppercase tracking-widest font-orbitron bg-white/5 border-white/10 hover:bg-white/10">Drill_Down</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </CyberCard>
  )
}
