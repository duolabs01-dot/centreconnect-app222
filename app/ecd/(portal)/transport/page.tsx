import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { StatusBadge } from "@/components/ui/status-badge"
export const metadata: Metadata = {
  title: 'Transport Desk | CentreConnect',
  description: 'Manage transport requests, fees, and driver communications in one place.',
}

type TransportConfig = {
  offers_transport: boolean
  fee_per_month: number | null
  fee_description: string | null
  coverage_areas: string[] | null
  notes: string | null
}

type TransportEnquiry = {
  id: string
  pickup_address: string | null
  status: string
  quote_amount: number | null
  quote_notes: string | null
  created_at: string
}

function formatCents(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'Quote required'
  return `R${(amount / 100).toFixed(0)}`
}

export default async function EcdTransportPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const [configResult, enquiriesResult] = await Promise.all([
    supabase
      .from('transport_configs')
      .select('offers_transport,fee_per_month,fee_description,coverage_areas,notes')
      .eq('ecd_id', ecdId)
      .maybeSingle(),
    supabase
      .from('transport_enquiries')
      .select('id,pickup_address,status,quote_amount,quote_notes,created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const transportConfig = (configResult.data ?? null) as TransportConfig | null
  const enquiries = (enquiriesResult.data ?? []) as TransportEnquiry[]
  const statusRoster = enquiries.reduce<Record<string, number>>((acc, enquiry) => {
    acc[enquiry.status] = (acc[enquiry.status] ?? 0) + 1
    return acc
  }, {})
  const recentEnquiries = enquiries.slice(0, 6)

  return (
    <EcdOsShell
      title="Transport Desk"
      description="Shipments, routes, and driver enquiries."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <div className="space-y-6">
        <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden text-slate-900">
          <CardHeader className="bg-slate-50/50">
            <CardTitle>Transport Management</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3 pt-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Current Status</p>
              <p className="text-lg font-bold text-slate-900">
                {transportConfig?.offers_transport ? 'Offering transport' : 'Not configured'}
              </p>
              <p className="text-xs font-medium text-slate-500">
                Manage drivers through Communications.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Fee</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCents(transportConfig?.fee_per_month)}
              </p>
              {transportConfig?.fee_description && (
                <p className="text-xs font-medium text-slate-500">{transportConfig.fee_description}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Coverage</p>
              {transportConfig?.coverage_areas?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {transportConfig.coverage_areas.map((area) => (
                    <span key={area} className="rounded-2xl bg-teal-50 border border-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-400">Coverage not yet defined.</p>
              )}
            </div>
          </CardContent>
          <CardContent className="flex flex-col gap-4 border-t border-slate-50 pt-6">
            <p className="text-sm font-medium text-slate-500 italic">
              {transportConfig?.notes ?? 'Capture notes about routes, drivers, or special pickups here.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-6 rounded-2xl shadow-sm">
                <Link href="/ecd/communications">Message Drivers</Link>
              </Button>
              <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 px-6 rounded-2xl">
                <Link href="/ecd/transport/drivers">Manage Drivers</Link>
              </Button>
              <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 px-6 rounded-2xl">
                <Link href="/ecd/calendar">Sync to Calendar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden text-slate-900">
          <CardHeader className="bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Enquiry Pipeline</CardTitle>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{enquiries.length} total enquiries</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Pending', status: 'pending', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Quoted', status: 'quoted', color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Accepted', status: 'accepted', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((item) => (
                <div key={item.label} className={cn("rounded-2xl border border-slate-100 p-5", item.bg)}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className={cn("text-3xl font-black mt-1", item.color)}>
                    {statusRoster[item.status] ?? 0}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Recent enquiries</p>
              <div className="space-y-3">
                {recentEnquiries.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 py-2">No enquiries yet. Encourage parents to request a quote.</p>
                ) : (
                  recentEnquiries.map((enquiry) => (
                    <div
                      key={enquiry.id}
                      className="tile flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-colors duration-200 hover:border-teal-200"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{enquiry.pickup_address ?? 'Pickup address pending'}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDate(enquiry.created_at)}</p>
                      </div>
                      <StatusBadge status={enquiry.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </EcdOsShell>
  )
}




