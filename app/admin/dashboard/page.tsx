import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminKpiCard } from '@/components/admin/admin-kpi-card'
import { MeshAreaChart } from '@/components/cc-admin/MeshAreaChart'
import { SystemHealthWidget } from '@/components/cc-admin/SystemHealthWidget'
import { HexHeatmap } from '@/components/cc-admin/HexHeatmap'
import { Users, Building2, CreditCard, Activity, ArrowUpRight, Zap, Target, Signal, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Platform OS | Command Console',
  description: 'Futuristic command console for platform operations and revenue tracking.',
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()
  
  // Fetch real telemetry from Supabase
  const [{ count: totalCentres }, { count: totalUsers }, { data: recentInvoices }] = await Promise.all([
    admin.from('ecd_centres').select('id', { count: 'exact', head: true }),
    admin.from('user_profiles').select('id', { count: 'exact', head: true }),
    admin.from('invoices').select('total').eq('status', 'paid').limit(500)
  ])
  
  const mrr_cents = recentInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0
  const mrr = mrr_cents / 100
  
  // High-fidelity mock trend data for premium sparklines
  const mockData = {
    revenue: [45, 52, 49, 60, 72, 68, 85, 80, 95, 90, 110],
    users: [120, 145, 130, 155, 180, 165, 190, 210, 235, 220, 250],
    centres: [42, 45, 44, 48, 52, 50, 55, 58, 62, 60, 65],
    activity: [94, 96, 95, 98, 97, 99, 98, 100, 99, 98, 99],
  }

  return (
    <div className="space-y-12 pb-20">
      
      {/* Dynamic Header with Status Indicators */}
      <header className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Node_01_Online</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/5 border border-white/5">
              <Signal className="w-3 h-3 text-slate-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Latency: 24ms</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-6xl font-black text-white tracking-tighter sm:text-8xl leading-[0.85] filter drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              Command <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Center</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mt-4 leading-relaxed">
              Real-time telemetry and operational throughput for the national ECD network.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex h-16 items-center gap-3 rounded-3xl bg-white px-10 text-xs font-black uppercase tracking-[0.2em] text-black shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:scale-[1.02] hover:bg-cyan-400 group transform-gpu [will-change:transform]">
            <Zap className="w-4 h-4 group-hover:fill-current" />
            System Audit
          </button>
        </div>
      </header>

      {/* Primary KPIs - Large & Futuristic */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard 
          label="Gross Revenue" 
          value={`R${mrr.toLocaleString()}`} 
          trend={24.5} 
          sparklineData={mockData.revenue} 
        />
        <AdminKpiCard 
          label="Verified Centres" 
          value={totalCentres || 0} 
          trend={8.2} 
          sparklineData={mockData.centres} 
        />
        <AdminKpiCard 
          label="Platform Citizens" 
          value={totalUsers || 0} 
          trend={15.4} 
          sparklineData={mockData.users} 
        />
        <AdminKpiCard 
          label="Neural Load" 
          value="98.2%" 
          trend={-1.4} 
          sparklineData={mockData.activity} 
        />
      </div>

      {/* Central Visualizations */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        
        {/* Main Revenue Stream - Massive Component */}
        <div className="lg:col-span-2 relative">
          <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="relative bg-[#080B13] border border-white/5 rounded-[3rem] p-8 sm:p-12 shadow-2xl overflow-hidden group">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between mb-16">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">Revenue Pipeline</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-1">Daily transactional throughput across all regional nodes.</p>
              </div>
              
              <div className="flex items-center gap-8 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-800" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Baseline</span>
                </div>
              </div>
            </div>
            
            <div className="h-[450px] w-full">
              <MeshAreaChart />
            </div>
          </div>
        </div>

        {/* Sidebar Status Column */}
        <div className="space-y-10">
          {/* Health Monitor */}
          <div className="bg-[#080B13] border border-white/5 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 h-32 w-32 bg-cyan-500/5" />
            <div className="flex items-center justify-between mb-10 relative">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-cyan-500" />
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Telemetrics</h3>
              </div>
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Real-time</span>
            </div>
            <SystemHealthWidget />
          </div>

          {/* Action Callouts */}
          <div className="tile transform-gpu [will-change:transform] relative group cursor-pointer transition-transform duration-200">
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-cyan-600 to-blue-800 opacity-20 transition-opacity duration-200 group-hover:opacity-40" />
            <div className="relative bg-gradient-to-br from-cyan-600 to-blue-900 rounded-[3rem] p-10 text-black shadow-2xl shadow-cyan-900/40 overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
                <Globe size={300} />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">Operations</p>
                  <h3 className="text-4xl font-black tracking-tighter leading-[0.9]">14 Centres Awaiting Audit</h3>
                </div>
                <p className="text-sm font-bold opacity-70 leading-relaxed">Verification queue is approaching threshold. Human intervention required.</p>
                <button className="flex h-14 items-center gap-3 rounded-2xl bg-black px-8 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-colors duration-200 hover:bg-slate-900">
                  Launch Audit
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Map / Regional Load */}
      <div className="relative group">
        <div className="absolute inset-0 rounded-[3rem] bg-emerald-500/[0.02] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="relative bg-[#080B13] border border-white/5 rounded-[3rem] p-8 sm:p-12 shadow-2xl overflow-hidden">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-12">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">Regional Node Load</h3>
              <p className="text-sm text-slate-500 font-medium">Global distribution of active ECD instances and data residency.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors bg-cyan-500/5 px-4 py-2 rounded-xl border border-cyan-500/10">
                Expand Telemetry
              </button>
            </div>
          </div>
          <div className="h-[320px]">
            <HexHeatmap />
          </div>
        </div>
      </div>

    </div>
  )
}
