'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/cc-admin/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/cc-admin/Card'
import { cn } from '@/lib/utils'
import { adminTheme } from '@/lib/admin-theme'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

// Simplified interfaces for Supabase results (must match the one in page.tsx)
interface SupportTicket {
  id: string
  ticket_number: string
  ecd_id: string | null
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed'
  priority: number
  subject: string
  created_at: string
  updated_at: string | null
  resolved_at: string | null
  ecd_centres: { id: string; name: string; city: string; suburb: string } | Array<{ id: string; name: string; city: string; suburb: string }> | null
}

interface SupportTicketsPipelineProps {
  tickets: SupportTicket[]
}

const TICKET_STATUSES = ['open', 'in_progress', 'waiting_response', 'resolved', 'closed'] as const
type TicketStatus = (typeof TICKET_STATUSES)[number]

function formatRelativeTime(dateString: string) {
  const diff = new Date().getTime() - new Date(dateString).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return `${years}y ago`
  if (months > 0) return `${months}m ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

export function SupportTicketsPipeline({ tickets }: SupportTicketsPipelineProps) {
  const router = useRouter()
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const ticketsByStatus = TICKET_STATUSES.reduce((acc, status) => {
    acc[status] = tickets.filter(ticket => ticket.status === status)
    return acc
  }, {} as Record<TicketStatus, SupportTicket[]>)

  async function updateTicketStatus(ticketId: string, newStatus: TicketStatus) {
    if (updatingTicket === ticketId) return
    setUpdatingTicket(ticketId)
    try {
      const response = await fetch(`/api/internal/platform-admin/support-tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to update ticket status to ${newStatus}.`)
      }

      toast.success(`Ticket #${ticketId.slice(0, 4)}... status updated to ${newStatus.replace('_', ' ')}.`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error.message || 'Error updating ticket status.')
    } finally {
      setUpdatingTicket(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
      {TICKET_STATUSES.map(status => (
        <div key={status} className="flex flex-col gap-3 rounded-lg border border-slate-700/80 bg-slate-950/30 p-4">
          <h3 className="font-orbitron text-sm font-bold uppercase tracking-wide text-cyber-cyan">
            {status.replace('_', ' ')} ({ticketsByStatus[status].length})
          </h3>
          <div className="flex-1 space-y-3">
            {ticketsByStatus[status].map(ticket => {
              const centre = Array.isArray(ticket.ecd_centres) ? ticket.ecd_centres[0] : ticket.ecd_centres
              return (
                <Card key={ticket.id} className="border-slate-700/50 bg-slate-900/50 text-slate-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">#{ticket.ticket_number}</CardTitle>
                    <Badge
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        ticket.priority >= 4 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        ticket.priority >= 3 ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                        "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      )}
                    >
                      Priority {ticket.priority}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-slate-400">Centre: {centre?.name ?? 'N/A'}</p>
                    <p className="text-[10px] text-slate-500">Created: {formatRelativeTime(ticket.created_at)}</p>
                  </CardContent>
                  <CardDescription className="p-4 pt-0">
                    <div className="flex flex-wrap gap-1">
                      {TICKET_STATUSES.map(s => {
                        if (s === status) return null
                        return (
                          <Button
                            key={s}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-[8px] uppercase tracking-widest",
                              "border-white/10 text-slate-400 hover:bg-white/5",
                              updatingTicket === ticket.id ? "opacity-50 cursor-not-allowed" : ""
                            )}
                            onClick={() => void updateTicketStatus(ticket.id, s)}
                            disabled={updatingTicket === ticket.id}
                          >
                            Move to {s.replace('_', ' ')} <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )
                      })}
                    </div>
                  </CardDescription>
                </Card>
              )
            })}
          </div>
          {ticketsByStatus[status].length === 0 && (
            <p className="text-center text-sm text-slate-500 py-6">No tickets in this column.</p>
          )}
        </div>
      ))}
    </div>
  )
}
