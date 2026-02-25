import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Marketplace - CentreConnect',
  description: 'Plan-aware add-ons and service requests for your ECD centre.',
}

type ServiceRow = {
  id: string
  service_name: string
  price: number
  description: string
}

type OrderRow = {
  id: string
  status: string
  created_at: string
  service_id: string
  marketplace_services:
    | { service_name: string; price: number | null }
    | Array<{ service_name: string; price: number | null }>
    | null
}

type SubscriptionTier = 'basic' | 'standard' | 'premium'

const includedKeywords: Record<SubscriptionTier, string[]> = {
  basic: ['listing', 'profile', 'basic'],
  standard: ['listing', 'profile', 'basic', 'calendar', 'announcement', 'message', 'communication'],
  premium: ['listing', 'profile', 'basic', 'calendar', 'announcement', 'message', 'communication', 'domain', 'analytics', 'website'],
}

function isIncludedInTier(tier: SubscriptionTier, serviceName: string) {
  const normalized = serviceName.toLowerCase()
  return includedKeywords[tier].some((token) => normalized.includes(token))
}

export default async function EcdMarketplacePage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()

  async function requestService(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const serviceId = String(formData.get('service_id') ?? '')
    if (!serviceId) return

    const { data: existing } = await session.supabase
      .from('ecd_marketplace_orders')
      .select('id,status')
      .eq('ecd_id', session.ecdId)
      .eq('service_id', serviceId)
      .in('status', ['requested', 'paid'])
      .limit(1)
      .maybeSingle()

    if (!existing) {
      await session.supabase.from('ecd_marketplace_orders').insert({
        ecd_id: session.ecdId,
        service_id: serviceId,
        requested_by: session.user.id,
        status: 'requested',
      })
    }

    revalidatePath('/ecd/marketplace')
  }

  const [{ data: servicesData }, { data: subscription }, { data: ordersData }] = await Promise.all([
    supabase
      .from('marketplace_services')
      .select('id,service_name,price,description')
      .eq('is_active', true)
      .order('price', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('tier,status,monthly_price')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ecd_marketplace_orders')
      .select('id,status,created_at,service_id,marketplace_services(service_name,price)')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const services = ((servicesData ?? []) as ServiceRow[]) ?? []
  const tier = (subscription?.tier ?? 'basic') as SubscriptionTier
  const orders = ((ordersData ?? []) as OrderRow[]) ?? []
  const openRequestServiceIds = new Set(orders.filter((row) => row.status === 'requested').map((row) => row.service_id))

  return (
    <EcdOsShell
      title="Marketplace"
      description="See what your package already includes and request add-ons only where needed."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="space-y-6">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50">
          <CardHeader>
            <CardTitle>Package Context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="glass-card border-border bg-card/80 p-3 text-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{tier}</p>
            </div>
            <div className="glass-card border-border bg-card/80 p-3 text-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing status</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{subscription?.status ?? 'trial'}</p>
            </div>
            <div className="glass-card border-border bg-card/80 p-3 text-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly price</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{subscription?.monthly_price ? `R${subscription.monthly_price}` : 'R0'}</p>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card/80 p-10 text-center">
              <p className="text-base font-semibold text-foreground">No add-ons available yet</p>
              <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
                Additional services will appear here once activated for your region.
                Your current package already includes all core features.
              </p>
            </div>
          ) : (
            services.map((service) => {
              const included = isIncludedInTier(tier, service.service_name)
              const requestPending = openRequestServiceIds.has(service.id)

              return (
                <Card key={service.id} className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">{service.service_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-slate-900">
                      {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(service.price)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                    <div
                      className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${
                        included
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-amber-400/40 bg-amber-100 text-amber-800'
                      }`}
                    >
                      {included
                        ? 'Included in your current package'
                        : `Add-on for ${tier} package`}
                    </div>
                    {included ? (
                      <Button className="mt-4 w-full" variant="outline" disabled>
                        Already Included
                      </Button>
                    ) : (
                      <form action={requestService} className="mt-4">
                        <input type="hidden" name="service_id" value={service.id} />
                        <Button className="w-full" type="submit" disabled={requestPending}>
                          {requestPending ? 'Request Sent' : 'Request Add-on'}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </section>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>My Marketplace Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-600">No marketplace requests yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const service = Array.isArray(order.marketplace_services)
                        ? order.marketplace_services[0]
                        : order.marketplace_services
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{service?.service_name ?? 'Unknown service'}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell>
                            {service?.price != null
                              ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(service.price)
                              : '--'}
                          </TableCell>
                          <TableCell>{formatDate(order.created_at)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </EcdOsShell>
  )
}



