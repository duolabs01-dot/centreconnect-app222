import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Support | Parent Portal | CentreConnect',
  description: 'Report issues and track support tickets for your parent account.',
}

type ParentSupportPageProps = {
  searchParams?: {
    created?: string
    status?: string
  }
}

const CATEGORIES = ['general', 'technical', 'application', 'billing'] as const

export default async function ParentSupportPage({ searchParams }: ParentSupportPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/parent/support')
  }

  async function createTicket(formData: FormData) {
    'use server'
    const actionClient = await createClient()
    const {
      data: { user: actionUser },
    } = await actionClient.auth.getUser()

    if (!actionUser) {
      redirect('/login?next=/parent/support')
    }

    const subject = String(formData.get('subject') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const categoryRaw = String(formData.get('category') ?? 'general').trim()
    const category = CATEGORIES.includes(categoryRaw as (typeof CATEGORIES)[number]) ? categoryRaw : 'general'
    const ticketNumber = `PT-${Date.now().toString().slice(-8)}`

    if (!subject || !description) {
      redirect('/parent/support')
    }

    const { error } = await actionClient.from('support_tickets').insert({
      ticket_number: ticketNumber,
      created_by: actionUser.id,
      subject,
      description,
      category,
      status: 'open',
      priority: 2,
    })

    if (error) {
      redirect('/parent/support?created=0')
    }

    revalidatePath('/parent/support')
    redirect('/parent/support?created=1')
  }

  const statusFilter = (searchParams?.status ?? 'open').toLowerCase()
  let query = supabase
    .from('support_tickets')
    .select('id,ticket_number,subject,category,status,priority,created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(40)

  if (statusFilter === 'open') {
    query = query.in('status', ['open', 'in_progress', 'waiting_response'])
  } else if (statusFilter === 'resolved') {
    query = query.in('status', ['resolved', 'closed'])
  }

  const { data } = await query
  const tickets = data ?? []

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Report an Issue</h1>
        <p className="text-sm text-slate-600">Tell us what happened and the support team will follow up in your inbox.</p>
        {searchParams?.created === '1' ? (
          <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Ticket submitted successfully.
          </p>
        ) : null}
        {searchParams?.created === '0' ? (
          <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            We could not create your ticket. Please try again.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <form action={createTicket} className="space-y-3">
          <input
            name="subject"
            placeholder="Subject (example: Can't upload birth certificate)"
            required
            className="cc-native-field"
          />
          <select name="category" className="cc-native-field" defaultValue="general">
            <option value="general">General</option>
            <option value="technical">Technical</option>
            <option value="application">Application</option>
            <option value="billing">Billing</option>
          </select>
          <textarea
            name="description"
            required
            placeholder="Describe the issue and what you expected to happen."
            className="cc-native-field min-h-28 h-auto py-2"
          />
          <div className="flex justify-end">
            <Button type="submit">Submit Ticket</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">My Tickets</h2>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/parent/support?status=open"
              className={`rounded-full px-3 py-1 ${
                statusFilter === 'open' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Open
            </Link>
            <Link
              href="/parent/support?status=resolved"
              className={`rounded-full px-3 py-1 ${
                statusFilter === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Resolved
            </Link>
            <Link
              href="/parent/support?status=all"
              className={`rounded-full px-3 py-1 ${
                statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              All
            </Link>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No tickets yet.
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{ticket.subject}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {ticket.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{ticket.ticket_number}</span>
                  <span>|</span>
                  <span>{ticket.category}</span>
                  <span>|</span>
                  <span>{formatDate(ticket.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
