import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from "@/components/ui/status-badge"

export const metadata: Metadata = {
  title: 'Marketplace - CentreConnect',
  description: 'Plan-aware add-ons and service requests for your ECD crèche.',
}

type ServiceRow = {
  id: string
  service_name: string
  price: number
  description: string
}

type OrderRow = {
  id: string
  status: 'cart' | 'requested' | 'paid' | 'fulfilled' | 'cancelled'
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

  function nextTicketNumber() {
    return `MKT-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4).toUpperCase()}`
  }

  async function addToCart(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const serviceId = String(formData.get('service_id') ?? '')
    if (!serviceId) return

    const { data: existing } = await session.supabase
      .from('ecd_marketplace_orders')
      .select('id,status')
      .eq('ecd_id', session.ecdId)
      .eq('service_id', serviceId)
      .in('status', ['cart', 'requested', 'paid'])
      .limit(1)
      .maybeSingle()

    if (!existing) {
      await session.supabase.from('ecd_marketplace_orders').insert({
        ecd_id: session.ecdId,
        service_id: serviceId,
        requested_by: session.user.id,
        status: 'cart',
      })
    }

    revalidatePath('/ecd/marketplace')
  }

  async function removeFromCart(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const orderId = String(formData.get('order_id') ?? '')
    if (!orderId) return

    await session.supabase
      .from('ecd_marketplace_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('ecd_id', session.ecdId)
      .eq('status', 'cart')

    revalidatePath('/ecd/marketplace')
  }

  async function submitCart() {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })

    const { data: cartRows } = await session.supabase
      .from('ecd_marketplace_orders')
      .select('id,service_id,marketplace_services(service_name,price)')
      .eq('ecd_id', session.ecdId)
      .eq('status', 'cart')
      .order('created_at', { ascending: true })
      .limit(50)

    const cartOrders = (cartRows ?? []) as Array<{
      id: string
      service_id: string
      marketplace_services:
        | { service_name: string; price: number | null }
        | Array<{ service_name: string; price: number | null }>
        | null
    }>
    if (cartOrders.length === 0) {
      revalidatePath('/ecd/marketplace')
      return
    }

    const { data: centre } = await session.supabase
      .from('ecd_centres')
      .select('name')
      .eq('id', session.ecdId)
      .maybeSingle()

    const orderIds = cartOrders.map((row) => row.id)
    await session.supabase
      .from('ecd_marketplace_orders')
      .update({ status: 'requested' })
      .in('id', orderIds)
      .eq('ecd_id', session.ecdId)

    const supportTickets = cartOrders.map((row) => {
      const service = Array.isArray(row.marketplace_services)
        ? row.marketplace_services[0]
        : row.marketplace_services
      const serviceName = service?.service_name ?? 'Marketplace add-on'
      const servicePrice = service?.price != null ? `R${Number(service.price).toFixed(2)}` : 'Price on request'

      return {
        ticket_number: nextTicketNumber(),
        ecd_id: session.ecdId,
        created_by: session.user.id,
        subject: `Marketplace add-on request: ${serviceName}`,
        description: [
          `Centre: ${centre?.name ?? 'Unknown centre'}`,
          `Service: ${serviceName}`,
          `Price: ${servicePrice}`,
          `Order ID: ${row.id}`,
          'Requested from ECD Marketplace cart.',
        ].join('\n'),
        category: 'billing',
        status: 'open',
        priority: 2,
      }
    })

    await session.supabase.from('support_tickets').insert(supportTickets)

    revalidatePath('/ecd/marketplace')
    revalidatePath('/admin/support')
    revalidatePath('/admin/command')
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
      .limit(100),
  ])

  const services = ((servicesData ?? []) as ServiceRow[]) ?? []
  const tier = (subscription?.tier ?? 'basic') as SubscriptionTier
  const orders = ((ordersData ?? []) as OrderRow[]) ?? []
  const cartOrders = orders.filter((row) => row.status === 'cart')
  const requestHistory = orders.filter((row) => row.status !== 'cart')
  const cartServiceIds = new Set(cartOrders.map((row) => row.service_id))
  const openRequestServiceIds = new Set(
    requestHistory
      .filter((row) => row.status === 'requested' || row.status === 'paid')
      .map((row) => row.service_id)
  )

  return (
    <EcdOsShell
      title="Marketplace"
      description="See what your package already includes and request add-ons only where needed."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="space-y-6">
        <Card className="border-teal-100 bg-gradient-to-r from-teal-50/50 to-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-bold text-teal-900">Package Context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tier</p>
              <p className="mt-1 text-lg font-bold text-teal-700 capitalize">{tier}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Billing status</p>
              <p className="mt-1 text-lg font-bold text-slate-900 capitalize">{subscription?.status ?? 'trial'}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Monthly price</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{subscription?.monthly_price ? `R${subscription.monthly_price}` : 'R0'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-100 bg-cyan-50/40 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-cyan-900">Request Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {cartOrders.length === 0 ? (
              <p className="text-sm text-slate-600">
                No add-ons in your cart yet. Add items below, then send in one click.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {cartOrders.map((order) => {
                    const service = Array.isArray(order.marketplace_services)
                      ? order.marketplace_services[0]
                      : order.marketplace_services
                    return (
                      <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{service?.service_name ?? 'Service'}</p>
                          <p className="text-xs text-slate-500">
                            {service?.price != null
                              ? new Intl.NumberFormat('en-ZA', {
                                  style: 'currency',
                                  currency: 'ZAR',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(service.price)
                              : 'Price on request'}
                          </p>
                        </div>
                        <form action={removeFromCart}>
                          <input type="hidden" name="order_id" value={order.id} />
                          <Button type="submit" size="sm" variant="outline" className="h-9 rounded-2xl border-slate-200 font-bold">
                            Remove
                          </Button>
                        </form>
                      </div>
                    )
                  })}
                </div>
                <form action={submitCart}>
                  <Button type="submit" className="h-11 rounded-2xl bg-teal-600 px-6 font-bold text-white hover:bg-teal-700">
                    Send {cartOrders.length} request{cartOrders.length === 1 ? '' : 's'} to CC Admin
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <p className="text-base font-bold text-slate-900">No add-ons available yet</p>
              <p className="mt-2 max-w-sm mx-auto text-sm text-slate-500">
                Additional services will appear here once activated for your region.
                Your current package already includes all core features.
              </p>
            </div>
          ) : (
            services.map((service) => {
              const included = isIncludedInTier(tier, service.service_name)
              const inCart = cartServiceIds.has(service.id)
              const requestPending = openRequestServiceIds.has(service.id)

              return (
                <Card key={service.id} className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">{service.service_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-2xl font-black text-slate-900">
                      {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(service.price)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed min-h-[3rem]">{service.description}</p>
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-2.5 text-xs font-bold ${
                        included
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : 'border-teal-100 bg-teal-50/50 text-teal-700'
                      }`}
                    >
                      {included
                        ? 'Included in your current package'
                        : `Add-on for ${tier} package`}
                    </div>
                    {included ? (
                      <Button className="mt-6 w-full h-11 rounded-2xl font-bold" variant="outline" disabled>
                        Already Included
                      </Button>
                    ) : inCart ? (
                      <Button className="mt-6 w-full h-11 rounded-2xl font-bold" variant="outline" disabled>
                        Added to cart
                      </Button>
                    ) : (
                      <form action={addToCart} className="mt-6">
                        <input type="hidden" name="service_id" value={service.id} />
                        <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-sm transition-colors" type="submit" disabled={requestPending}>
                          {requestPending ? 'Request Sent' : 'Add to Cart'}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </section>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">My Marketplace Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {requestHistory.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No marketplace requests yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestHistory.map((order) => {
                      const service = Array.isArray(order.marketplace_services)
                        ? order.marketplace_services[0]
                        : order.marketplace_services
                      return (
                        <TableRow key={order.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-900">{service?.service_name ?? 'Unknown service'}</TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="font-bold text-slate-700">
                            {service?.price != null
                              ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(service.price)
                              : '--'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{formatDate(order.created_at)}</TableCell>
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





