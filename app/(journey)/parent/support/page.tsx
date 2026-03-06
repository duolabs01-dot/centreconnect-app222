import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/ui/surface-card'
import { cn } from '@/lib/utils'

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
    <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Report an Issue</h1>
        <p className="mt-1 text-sm text-slate-600">Tell us what happened and the support team will follow up in your inbox.</p>
        {searchParams?.created === '1' && (
          <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Ticket submitted successfully
          </div>
        )}
        {searchParams?.created === '0' && (
          <div className="mt-3 inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider">
            Submission failed. Please try again.
          </div>
        )}
      </header>

      <div className="space-y-8">
        <SurfaceCard className="p-6">
          <form action={createTicket} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Subject</label>
              <input
                name="subject"
                placeholder="Can't upload documents..."
                required
                className="cc-native-field h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Category</label>
              <select name="category" className="cc-native-field h-11 rounded-2xl" defaultValue="general">
                <option value="general">General Inquiry</option>
                <option value="technical">Technical Issue</option>
                <option value="application">Application Help</option>
                <option value="billing">Billing & Fees</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Details</label>
              <textarea
                name="description"
                required
                placeholder="Describe the issue in detail..."
                className="cc-native-field min-h-32 h-auto py-3 rounded-2xl"
              />
            </div>
            <div className="pt-2">
              <Button type="submit" className="w-full h-12 rounded-2xl font-bold shadow-float bg-cyan-600">Submit Ticket</Button>
            </div>
          </form>
        </SurfaceCard>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">My Tickets</h2>
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-surface shadow-card">
              {[
                { label: 'Open', value: 'open' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'All', value: 'all' }
              ].map((tab) => (
                <Link
                  key={tab.value}
                  href={`/parent/support?status=${tab.value}`}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all',
                    statusFilter === tab.value
                      ? 'bg-nav-bg text-white shadow-nav'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          {tickets.length === 0 ? (
            <SurfaceCard className="py-12 text-center text-sm font-medium text-slate-400 border-dashed">
              No tickets found in this category.
            </SurfaceCard>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <SurfaceCard key={ticket.id} className="p-4 group hover:ring-1 hover:ring-cyan-500/30 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{ticket.subject}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span className="text-cyan-600">{ticket.ticket_number}</span>
                        <span>-</span>
                        <span>{ticket.category}</span>
                        <span>-</span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border",
                      ticket.status === 'open' ? "bg-cyan-50 text-cyan-700 border-cyan-100" :
                      ticket.status === 'resolved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      "bg-slate-50 text-slate-500 border-slate-100"
                    )}>
                      {ticket.status}
                    </span>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

