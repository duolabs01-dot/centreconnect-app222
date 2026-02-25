import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Support - CentreConnect',
  description: 'View and track support issues.',
}

type SupportPageProps = {
  searchParams?: {
    status?: string
  }
}

export default async function EcdSupportPage({ searchParams }: SupportPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  async function createTicket(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const subject = String(formData.get('subject') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const category = String(formData.get('category') ?? 'general').trim()
    const priorityRaw = Number.parseInt(String(formData.get('priority') ?? '2'), 10)
    const priority = Number.isFinite(priorityRaw) ? Math.max(1, Math.min(5, priorityRaw)) : 2
    if (!subject || !description) return
    const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`

    await session.supabase.from('support_tickets').insert({
      ticket_number: ticketNumber,
      ecd_id: session.ecdId,
      created_by: session.user.id,
      subject,
      description,
      category: ['technical', 'billing', 'application', 'general'].includes(category) ? category : 'general',
      priority,
      status: 'open',
    })

    revalidatePath('/ecd/support')
  }

  const statusFilter = (searchParams?.status ?? 'open').toLowerCase()
  let query = supabase
    .from('support_tickets')
    .select('id,ticket_number,subject,status,priority,created_at')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (statusFilter === 'open') {
    query = query.neq('status', 'resolved')
  } else if (statusFilter === 'resolved') {
    query = query.eq('status', 'resolved')
  }

  const { data } = await query
  const tickets = data ?? []

  return (
    <EcdOsShell
      title="Support"
      description="Track support requests and follow-ups."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <Card className="mb-6 border-border bg-card/80 text-foreground">
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="grid gap-3 md:grid-cols-2">
            <input name="subject" className="cc-native-field md:col-span-2" placeholder="Subject (e.g. Billing invoice mismatch)" required />
            <select name="category" className="cc-native-field">
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="application">Application</option>
            </select>
            <select name="priority" className="cc-native-field" defaultValue="2">
              <option value="1">Low</option>
              <option value="2">Normal</option>
              <option value="3">High</option>
              <option value="4">Urgent</option>
              <option value="5">Critical</option>
            </select>
            <textarea
              name="description"
              className="cc-native-field md:col-span-2 min-h-24 h-auto py-2"
              placeholder="Describe the issue. Include what happened, where, and what you expected."
              required
            />
            <Button type="submit" className="w-fit">Create Ticket</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/90 text-foreground">
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Link
              href="/ecd/support?status=open"
              className={`rounded-md px-3 py-2 text-sm font-medium ${statusFilter === 'open' ? 'bg-blue-700 text-blue-50' : 'bg-blue-50 text-blue-800'}`}
            >
              Open
            </Link>
            <Link
              href="/ecd/support?status=resolved"
              className={`rounded-md px-3 py-2 text-sm font-medium ${statusFilter === 'resolved' ? 'bg-emerald-700 text-emerald-50' : 'bg-emerald-50 text-emerald-800'}`}
            >
              Resolved
            </Link>
            <Link
              href="/ecd/support?status=all"
              className={`rounded-md px-3 py-2 text-sm font-medium ${statusFilter === 'all' ? 'bg-cyan-600 text-cyan-50' : 'border border-border bg-background text-muted-foreground'}`}
            >
              All
            </Link>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              title="No tickets in this view"
              description="When support issues are logged, they will appear here."
              checklist={[
                'Use status filters to check resolved requests.',
                'Log critical incidents with date, child, and action taken.',
                'Escalate unresolved security issues immediately.',
              ]}
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell>{ticket.status}</TableCell>
                      <TableCell>{ticket.priority}</TableCell>
                      <TableCell>{formatDate(ticket.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-border bg-card/80 text-foreground">
        <CardHeader>
          <CardTitle>Weekly Quality Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Accessibility: verify keyboard navigation, visible focus, and readable contrast on all main pages.</p>
          <p>Performance: keep dashboard interactions responsive and avoid heavy media on first load.</p>
          <p>Usability: confirm staff can complete top tasks without training in under 3 minutes.</p>
        </CardContent>
      </Card>
    </EcdOsShell>
  )
}


