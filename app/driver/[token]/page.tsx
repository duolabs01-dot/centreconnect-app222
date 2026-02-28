import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

type DriverRow = {
  id: string
  full_name: string
  ecd_id: string
}

type CentreRow = {
  name: string | null
}

type DriverRouteRow = {
  id: string
  name: string | null
  departure_time: string | null
}

type StopChild = {
  first_name: string | null
  last_name: string | null
}

type StopRow = {
  id: string
  route_id: string
  pickup_address: string | null
  stop_order: number
  children: StopChild | StopChild[] | null
}

export default async function DriverPage({ params }: { params: { token: string } }) {
  const token = params.token?.trim()
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
    notFound()
  }

  const supabase = createAdminClient()

  const { data: driverData } = await supabase
    .from('transport_drivers')
    .select('id,full_name,ecd_id')
    .eq('driver_token', token)
    .eq('status', 'active')
    .maybeSingle()

  const driver = (driverData ?? null) as DriverRow | null
  if (!driver) {
    notFound()
  }

  const { data: centreData } = await supabase
    .from('ecd_centres')
    .select('name')
    .eq('id', driver.ecd_id)
    .maybeSingle()

  const centre = (centreData ?? null) as CentreRow | null
  const centreName = centre?.name ?? 'Unknown Centre'

  const { data: driverRoutesData } = await supabase
    .from('transport_routes')
    .select('id,name,departure_time')
    .eq('driver_id', driver.id)
    .eq('is_active', true)
    .limit(5)
  const driverRoutes = (driverRoutesData ?? []) as DriverRouteRow[]

  const routeIds = driverRoutes.map((route) => route.id)
  const routeNameById = new Map(driverRoutes.map((route) => [route.id, route.name ?? 'Route']))

  const { data: stopsData } =
    routeIds.length > 0
      ? await supabase
          .from('route_children')
          .select('id,route_id,pickup_address,stop_order,children(first_name,last_name)')
          .in('route_id', routeIds)
          .order('stop_order', { ascending: true })
          .limit(50)
      : { data: [] }

  const rows = (stopsData ?? []) as StopRow[]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-100 bg-white px-4 py-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600">CentreConnect Driver</p>
        <h1 className="mt-1 text-xl font-bold">{centreName}</h1>
        <p className="text-sm font-medium text-slate-600">Driver: {driver.full_name}</p>
        <p className="text-sm text-slate-400">{`Today's route - ${rows.length} stops`}</p>
      </header>

      <main className="space-y-3 p-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-slate-400 shadow-sm">
            No active pickups assigned for today.
          </div>
        ) : (
          rows.map((stop, i) => (
            <div key={stop.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-600">Stop {i + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {routeNameById.get(stop.route_id) ?? 'Route'}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {Array.isArray(stop.children)
                      ? `${stop.children[0]?.first_name ?? ''} ${stop.children[0]?.last_name ?? ''}`.trim() ||
                        'Child not linked'
                      : `${stop.children?.first_name ?? ''} ${stop.children?.last_name ?? ''}`.trim() ||
                        'Child not linked'}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-600">
                    {stop.pickup_address ?? 'Address pending'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-600">
        CentreConnect Transport - Route resets daily
      </footer>
    </div>
  )
}
