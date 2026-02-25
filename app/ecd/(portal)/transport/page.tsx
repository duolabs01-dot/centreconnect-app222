import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { StatusBadge } from '@/components/ui/StatusBadge'
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
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <div className="space-y-6">
        <Card className="bg-card border border-border rounded-2xl text-foreground">
          <CardHeader>
            <CardTitle>Transport Management</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-cyan-700">Current Status</p>
              <p className="text-lg font-bold text-foreground">
                {transportConfig?.offers_transport ? 'Offering transport' : 'Not configured'}
              </p>
              <p className="text-xs text-muted-foreground">
                Continue to keep drivers updated through Communications.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-cyan-700">Fee</p>
              <p className="text-lg font-bold text-foreground">
                {formatCents(transportConfig?.fee_per_month)}
              </p>
              {transportConfig?.fee_description && (
                <p className="text-xs text-muted-foreground">{transportConfig.fee_description}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-cyan-700">Coverage</p>
              {transportConfig?.coverage_areas?.length ? (
                <div className="flex flex-wrap gap-1">
                  {transportConfig.coverage_areas.map((area) => (
                    <span key={area} className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Coverage not yet defined.</p>
              )}
            </div>
          </CardContent>
          <CardContent className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {transportConfig?.notes ?? 'Capture notes about routes, drivers, or special pickups here.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/ecd/communications">Message Drivers</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/ecd/transport/drivers">Manage Drivers {'->'}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/ecd/calendar">Sync to Calendar</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/ecd/pipeline">View Pipeline</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border rounded-2xl text-foreground">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Enquiry Pipeline</CardTitle>
              <span className="text-xs text-muted-foreground">{enquiries.length} recent enquiries</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Pending', status: 'pending' },
                { label: 'Quoted', status: 'quoted' },
                { label: 'Accepted', status: 'accepted' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {statusRoster[item.status] ?? 0}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Recent enquiries</p>
              <div className="mt-2 space-y-3">
                {recentEnquiries.length === 0 ? (
                  <p>No enquiries yet. Encourage parents to request a quote.</p>
                ) : (
                  recentEnquiries.map((enquiry) => (
                    <div key={enquiry.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-3 py-2 text-sm transition hover:border-primary/30">
                      <div className="min-w-0">
                        <p className="truncate text-foreground">{enquiry.pickup_address ?? 'Pickup address pending'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(enquiry.created_at)}</p>
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


