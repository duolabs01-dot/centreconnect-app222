import type { Metadata } from 'next'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/cc-admin/DashboardShell'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Button } from '@/components/cc-admin/Button'
import { SupportPageClientLayout } from '@/components/admin/SupportPageClientLayout'
import { ADMIN_NAV_ITEMS } from '@/components/admin/admin-nav'
import { cn } from '@/lib/utils'
import { LifeBuoy, AlertCircle, Clock, CheckCircle2, MessageSquare, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Relay | CC Control Tower',
  description: 'Support protocols, ticket escalations, and churn-risk signals.',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

// Simplified interfaces for Supabase results
export interface SupportTicket {
  id: string
  ticket_number: string
  ecd_id: string | null
  status: string
  priority: number
  subject: string
  created_at: string
  updated_at: string | null
  resolved_at: string | null
  ecd_centres: any 
}

export default async function AdminSupportPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const [ticketsResult, centresResult] = await Promise.all([
    admin
      .from('support_tickets')
      .select('*, ecd_centres(id,name,slug,city,suburb)')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('ecd_centres')
      .select('id,name')
      .order('name', { ascending: true }),
  ])

  const tickets = (ticketsResult.data ?? []) as SupportTicket[]
  const availableCentres = (centresResult.data ?? []) as Array<{ id: string; name: string }>
  const totalTickets = tickets.length
  const unresolvedTickets = tickets.filter((t) => ['open', 'in_progress', 'waiting_response'].includes(t.status))
  const priorityIssues = tickets.filter((t) => t.priority >= 3)

  return (
    <DashboardShell
      title="Relay"
      description="Support protocols and churn-risk telemetry."
      roleLabel="Architect Console"
      userEmail={user.email ?? 'Unknown email'}
      wide
      navItems={ADMIN_NAV_ITEMS}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Active Threads</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{totalTickets}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">TOTAL_TICKET_NODES</p>
            </div>
            <MessageSquare className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>

        <CyberCard accent="rose" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Unresolved</p>
              <h3 className="font-orbitron text-2xl font-bold text-white text-rose-400">{unresolvedTickets.length}</h3>
              <p className="text-[10px] text-cyber-rose mt-1">AWAITING_ACTION</p>
            </div>
            <AlertCircle className="w-4 h-4 text-cyber-rose" />
          </div>
        </CyberCard>

        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Escalations</p>
              <h3 className="font-orbitron text-2xl font-bold text-white text-cyber-violet">{priorityIssues.length}</h3>
              <p className="text-[10px] text-cyber-violet mt-1">PRIORITY_LEVEL_HIGH</p>
            </div>
            <Zap className="w-4 h-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Resolved (7d)</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{tickets.filter(t => t.status === 'resolved').length}</h3>
              <p className="text-[10px] text-cyber-green mt-1">STABLE_RESOLUTIONS</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-cyber-green" />
          </div>
        </CyberCard>
      </section>

      <SupportPageClientLayout tickets={tickets} availableCentres={availableCentres} />


    </DashboardShell>
  )
}
