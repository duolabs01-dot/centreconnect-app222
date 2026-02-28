import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/admin-shell'
import { AdminKpiCard } from '@/components/admin/admin-kpi-card'
import { MeshAreaChart } from '@/components/cc-admin/MeshAreaChart'
import { SystemHealthWidget } from '@/components/cc-admin/SystemHealthWidget'
import { Users, Building2, CreditCard, Activity, ArrowUpRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Dashboard | CentreConnect',
  description: 'Futuristic command console for platform operations and revenue tracking.',
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()
  
  // Fetch some real stats
  const { count: totalCentres } = await admin.from('ecd_centres').select('id', { count: 'exact', head: true })
  const { count: totalUsers } = await admin.from('user_profiles').select('id', { count: 'exact', head: true })
  const { data: recentInvoices } = await admin.from('invoices').select('total').eq('status', 'paid').limit(100)
  
  const mrr = recentInvoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0
  
  // Mock trend data for sparklines
  const mockData = {
    revenue: [40, 45, 42, 50, 55, 52, 60],
    users: [20, 25, 30, 28, 35, 40, 45],
    centres: [10, 12, 15, 14, 18, 20, 22],
    activity: [80, 70, 90, 85, 95, 88, 100],
  }

  return (
    <AdminShell>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500">System Live</p>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight sm:text-4xl">Command Center</h1>
            <p className="text-slate-500 mt-1 font-medium">Real-time telemetry and growth metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-11 px-6 rounded-xl bg-cyan-600 text-black font-black uppercase text-xs tracking-widest hover:bg-cyan-500 transition-all flex items-center gap-2">
              <Zap className="w-4 h-4" />
              System Status
            </button>
          </div>
        </header>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpiCard 
            label="Total Revenue" 
            value={`R${(mrr / 100).toLocaleString()}`} 
            trend={12.5} 
            sparklineData={mockData.revenue} 
          />
          <AdminKpiCard 
            label="Active Centres" 
            value={totalCentres || 0} 
            trend={8.2} 
            sparklineData={mockData.centres} 
          />
          <AdminKpiCard 
            label="Platform Users" 
            value={totalUsers || 0} 
            trend={15.4} 
            sparklineData={mockData.users} 
          />
          <AdminKpiCard 
            label="Neural Activity" 
            value="98.2%" 
            trend={-2.1} 
            sparklineData={mockData.activity} 
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sales Trend Chart */}
          <div className="lg:col-span-2 bg-[#161B22] border border-white/5 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Revenue Stream</h3>
                <p className="text-sm text-slate-500">Platform-wide transactional throughput</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-700" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected</span>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <MeshAreaChart />
            </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
            <div className="bg-[#161B22] border border-white/5 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                System Health
              </h3>
              <SystemHealthWidget />
            </div>

            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-3xl p-6 text-black relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02]">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Zap size={160} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">Action Required</p>
                <h3 className="text-xl font-black tracking-tight mb-4">You have 12 centres awaiting verification</h3>
                <button className="bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  Review Now
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Secondary Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-[#161B22] border border-white/5 rounded-3xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Recent Deployments</h3>
            <div className="space-y-4">
              {[
                { name: 'Sunshine ECD', action: 'New Onboarding', time: '2h ago', status: 'Success' },
                { name: 'Marlboro Academy', action: 'DSD Verification', time: '5h ago', status: 'Pending' },
                { name: 'Tiny Tots Alexandra', action: 'API Link', time: '1d ago', status: 'Success' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{item.status}</p>
                    <p className="text-[10px] text-slate-600">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161B22] border border-white/5 rounded-3xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">User Telemetry</h3>
            <div className="space-y-4">
              {[
                { name: 'Sarah Mguni', role: 'Parent', action: 'Application Submitted', time: '12m ago' },
                { name: 'Admin @ Little Stars', role: 'Staff', action: 'Attendance Logged', time: '45m ago' },
                { name: 'David Smith', role: 'Parent', action: 'Verification Upload', time: '1h ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.role} • {item.action}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 whitespace-nowrap">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
