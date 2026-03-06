import type { Metadata } from 'next'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { SupportPageClientLayout } from '@/components/admin/SupportPageClientLayout'
import { AlertCircle, CheckCircle2, MessageSquare, Zap } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'

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

type SupportAssigneeProfile = {
  id: string
  full_name: string | null
}

type MarketplaceOrder = {
  id: string
  status: 'cart' | 'requested' | 'paid' | 'fulfilled' | 'cancelled'
  created_at: string
  ecd_id: string
  ecd_centres:
    | { name: string | null }
    | Array<{ name: string | null }>
    | null
  marketplace_services:
    | { service_name: string | null; price: number | null }
    | Array<{ service_name: string | null; price: number | null }>
    | null
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

  const [ticketsResult, centresResult, marketplaceOrdersResult, assigneesResult] = await Promise.all([
    admin
      .from('support_tickets')
      .select('*, ecd_centres(id,name,slug,city,suburb)')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('ecd_centres')
      .select('id,name')
      .order('name', { ascending: true }),
    admin
      .from('ecd_marketplace_orders')
      .select('id,status,created_at,ecd_id,ecd_centres(name),marketplace_services(service_name,price)')
      .eq('status', 'requested')
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('user_profiles')
      .select('id,full_name')
      .eq('role', 'platform_admin')
      .order('full_name', { ascending: true }),
  ])

  const tickets = (ticketsResult.data ?? []) as SupportTicket[]
  const marketplaceOrders = (marketplaceOrdersResult.data ?? []) as MarketplaceOrder[]
  const availableCentres = (centresResult.data ?? []) as Array<{ id: string; name: string }>
  const availableAssignees = ((assigneesResult.data ?? []) as SupportAssigneeProfile[]).map((assignee) => ({
    id: assignee.id,
    name: assignee.full_name?.trim() || 'Platform Admin',
  }))
  const totalTickets = tickets.length
  const unresolvedTickets = tickets.filter((t) => ['open', 'in_progress', 'waiting_response'].includes(t.status))
  const priorityIssues = tickets.filter((t) => t.priority >= 3)

  return (
    <AdminPageLayout
      title="Relay"
      description="Support protocols and churn-risk telemetry."
      roleLabel="Architect Console"
      wide
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

      <CyberCard accent="cyan" glow className="mb-8 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="font-orbitron text-[10px] uppercase tracking-[0.25em] text-cyber-cyan">
              Marketplace Requests
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Live add-on requests from ECD marketplace carts.
            </p>
          </div>
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
            {marketplaceOrders.length} pending
          </span>
        </div>
        <div className="overflow-x-auto">
          {marketplaceOrders.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-400">No pending marketplace requests right now.</div>
          ) : (
            <Table>
              <TableHeader className="border-white/10 bg-slate-900/70">
                <TableRow>
                  <TableHead>Centre</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketplaceOrders.map((order) => {
                  const centre = Array.isArray(order.ecd_centres) ? order.ecd_centres[0] : order.ecd_centres
                  const service = Array.isArray(order.marketplace_services)
                    ? order.marketplace_services[0]
                    : order.marketplace_services

                  return (
                    <TableRow key={order.id} className="border-white/10">
                      <TableCell className="text-white">{centre?.name ?? 'Unknown centre'}</TableCell>
                      <TableCell className="text-slate-200">{service?.service_name ?? 'Unknown service'}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {service?.price != null ? `R${Number(service.price).toFixed(2)}` : 'Price on request'}
                      </TableCell>
                      <TableCell className="text-slate-400">{formatDateTime(order.created_at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CyberCard>

      <SupportPageClientLayout
        tickets={tickets}
        availableCentres={availableCentres}
        availableAssignees={availableAssignees}
      />
    </AdminPageLayout>
  )
}
