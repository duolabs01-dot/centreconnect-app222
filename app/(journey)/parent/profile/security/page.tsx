import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { ShieldCheck, Globe, Monitor, MapPin, Clock, ArrowLeft } from 'lucide-react'
import { SurfaceCard } from '@/components/ui/surface-card'

export const metadata: Metadata = {
  title: 'Security & Sign-in Activity | Parent Portal | CentreConnect',
  description: 'Review recent sign-ins and account activity to keep your family profile secure.',
}

export default async function ParentSecurityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: session }, { data: events }] = await Promise.all([
    supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('parent_security_events')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  return (
    <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-1">Security Protocol</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Account Security</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Review active sessions and security history.</p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold h-11" asChild>
          <Link href="/parent/profile">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
      </header>

      {/* Active Session Card */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Globe className="h-4 w-4 text-cyan-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Current Session</p>
        </div>

        <SurfaceCard className="p-6 border-t-4 border-t-cyan-500">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Monitor className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-slate-900 leading-tight">Active Now</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mt-1">
                    {session?.device_hint || 'Web Browser'}
                  </p>
                </div>
              </div>
              <div className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                Protected
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                  <p className="text-sm font-bold text-slate-700">{session?.region || 'Unknown Region'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IP Address</p>
                  <p className="text-sm font-bold text-slate-700">{session?.ip_address || 'Hidden for privacy'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Seen</p>
                  <p className="text-sm font-bold text-slate-700">
                    {session?.last_seen_at ? new Date(session.last_seen_at).toLocaleString('en-ZA', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) : 'Just now'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      {/* Security Events Log */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Security History</p>
        </div>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {(events ?? []).length === 0 ? (
              <div className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-500 italic">No security events recorded yet.</p>
              </div>
            ) : (
              (events ?? []).map((event: any) => (
                <div key={event.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{event.event_type}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {new Date(event.created_at).toLocaleString('en-ZA', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      {event.details || 'System verified account protocol.'}
                    </p>
                    {(event.ip_address || event.region) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {event.ip_address && (
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3 text-slate-300" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{event.ip_address}</span>
                          </div>
                        )}
                        {event.region && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-slate-300" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{event.region}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
        <p className="text-[9px] text-slate-400 text-center px-10 leading-relaxed italic">
          If you see activity you don&apos;t recognise, please reset your password immediately and contact support.
        </p>
      </section>
    </div>
  )
}

