import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function DriverPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  // Use token as ecd_id for now
  const ecdId = params.token

  const { data: enquiries } = await supabase
    .from('transport_enquiries')
    .select('id,pickup_address,status,created_at')
    .eq('ecd_id', ecdId)
    .in('status', ['accepted', 'active'])
    .order('created_at', { ascending: true })
    .limit(30)

  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('name')
    .eq('id', ecdId)
    .maybeSingle()

  if (!centre) notFound()

  const rows = enquiries ?? []

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900 px-4 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">CentreConnect Driver</p>
        <h1 className="mt-1 text-xl font-bold">{centre.name}</h1>
        <p className="text-sm text-slate-400">Today's route - {rows.length} stops</p>
      </header>

      <main className="space-y-3 p-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-800 p-6 text-center text-slate-400">
            No active pickups assigned for today.
          </div>
        ) : (
          rows.map((stop, i) => (
            <div key={stop.id} className="rounded-2xl border border-white/10 bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Stop {i + 1}</p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {stop.pickup_address ?? 'Address pending'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    stop.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600 text-slate-300'
                  }`}
                >
                  {stop.status}
                </span>
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
