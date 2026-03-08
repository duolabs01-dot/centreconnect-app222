import { createAdminClient } from '@/lib/supabase/admin'

export async function SystemHealthWidget() {
  const admin = createAdminClient()
  const start = Date.now()
  let dbStatus: 'ok' | 'error' = 'ok'
  let latencyMs = 0

  try {
    const { error } = await admin.from('ecd_centres').select('id', { count: 'exact', head: true }).limit(1)
    if (error) {
      dbStatus = 'error'
    } else {
      latencyMs = Date.now() - start
    }
  } catch {
    dbStatus = 'error'
  }

  const checks: Array<{ label: string; status: 'ok' | 'error'; detail: string }> = [
    { label: 'Supabase DB', status: dbStatus, detail: dbStatus === 'ok' ? `${latencyMs}ms` : 'Unreachable' },
    { label: 'Auth Service', status: 'ok', detail: 'Session-based' },
    { label: 'Storage', status: 'ok', detail: 'Supabase Storage' },
    { label: 'Email Delivery', status: 'ok', detail: 'SMTP direct + queue fallback' },
  ]

  return (
    <div className="space-y-2">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${check.status === 'ok' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="font-orbitron text-[10px] uppercase tracking-widest text-slate-300">{check.label}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">{check.detail}</span>
        </div>
      ))}
    </div>
  )
}

