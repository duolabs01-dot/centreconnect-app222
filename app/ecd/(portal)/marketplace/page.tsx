import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from "@/components/ui/status-badge"

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

    // 1. Fetch service details to check if it's bookkeeping
    const { data: service } = await session.supabase
      .from('marketplace_services')
      .select('service_name')
      .eq('id', serviceId)
      .single()

    const { data: existing } = await session.supabase
      .from('ecd_marketplace_orders')
      .select('id,status')
      .eq('ecd_id', session.ecdId)
      .eq('service_id', serviceId)
      .in('status', ['requested', 'paid'])
      .limit(1)
      .maybeSingle()

    if (!existing) {
      const { data: order, error: orderError } = await session.supabase.from('ecd_marketplace_orders').insert({
        ecd_id: session.ecdId,
        service_id: serviceId,
        requested_by: session.user.id,
        status: 'requested',
      }).select('id').single()

      // 2. Human Workflow: If Bookkeeping, create an assignment for platform team
      if (!orderError && order && service?.service_name.toLowerCase().includes('bookkeeping')) {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        
        await admin.from('bookkeeping_assignments').insert({
          ecd_id: session.ecdId,
          service_application_id: null, // This is a marketplace order, not a bootstrap app
          status: 'pending',
          priority: 'medium',
          notes: `Marketplace Order: ${order.id}`
        })

        // 3. Notify Platform Admin
        try {
          const { sendServiceApplicationNotification } = await import('@/lib/email/service-application-notification')
          const { data: centre } = await admin.from('ecd_centres').select('name').eq('id', session.ecdId).single()
          
          await sendServiceApplicationNotification({
            applicationId: order.id,
            submittedAt: new Date().toISOString(),
            applicantFullName: session.user.email ?? 'Unknown',
            applicantEmail: session.user.email ?? '',
            centreName: centre?.name ?? 'Unknown Centre',
            selectedTier: 'premium', // Hack: using existing notification type for speed
            recommendedTier: 'premium',
          })
        } catch (err) {
          console.error('Failed to send bookkeeping notification:', err)
        }
      }
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
                      className={`mt-4 rounded-xl border px-4 py-2.5 text-xs font-bold ${
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
                      <Button className="mt-6 w-full h-11 rounded-xl font-bold" variant="outline" disabled>
                        Already Included
                      </Button>
                    ) : (
                      <form action={requestService} className="mt-6">
                        <input type="hidden" name="service_id" value={service.id} />
                        <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95" type="submit" disabled={requestPending}>
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

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">My Marketplace Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {orders.length === 0 ? (
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
                    {orders.map((order) => {
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



