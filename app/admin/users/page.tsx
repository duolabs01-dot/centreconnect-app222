import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Button } from '@/components/cc-admin/Button'
import { cn } from '@/lib/utils'
import { Users, UserCheck, Shield, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Users | Platform Admin',
  description: 'View user accounts, roles, and recent access across the platform.',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  // Fetch ECD Admins & Staff
  const { data: ecdAdminProfiles } = await admin
    .from('user_profiles')
    .select('*, ecd_admins!ecd_admins_user_id_fkey(ecd_id, ecd_centres(name, subscriptions(tier)))')
    .in('role', ['ecd_admin', 'ecd_staff'])
    .order('created_at', { ascending: false })

  const { data: authUsers } = await admin.auth.admin.listUsers()
  const userMap = new Map<string, { email?: string; last_sign_in_at?: string }>(
    authUsers.users.map((u: { id: string; email?: string; last_sign_in_at?: string }) => [u.id, u])
  )

  const ecdAdminRows = (ecdAdminProfiles ?? []).map((p) => {
    const auth = userMap.get(p.id) as { email?: string; last_sign_in_at?: string } | undefined
    const ecdInfo = Array.isArray(p.ecd_admins) ? p.ecd_admins[0] : p.ecd_admins
    const centreName = (ecdInfo as any)?.ecd_centres?.name
    const tier = (ecdInfo as any)?.ecd_centres?.subscriptions?.[0]?.tier

    return {
      ...p,
      email: auth?.email,
      last_sign_in_at: auth?.last_sign_in_at,
      centreName,
      tier,
    }
  })

  // Platform Aggregates
  const { count: totalParents } = await admin.from('parents').select('*', { count: 'exact', head: true })
  const { count: totalChildren } = await admin.from('children').select('*', { count: 'exact', head: true })
  const totalEcdStaff = ecdAdminRows.length
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const monthlyActiveParents = authUsers.users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= thirtyDaysAgo).length

  return (
    <AdminPageLayout
      title="Users"
      description="View platform users, centre staff, and account access in one place."
      roleLabel="Platform Admin"
      wide
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Total Parents</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{totalParents}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">Parent accounts on CentreConnect</p>
            </div>
            <Users className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>

        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Total Children</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{totalChildren}</h3>
              <p className="text-[10px] text-cyber-violet mt-1">Children linked to parent accounts</p>
            </div>
            <Zap className="w-4 h-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">ECD Personnel</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{totalEcdStaff}</h3>
              <p className="text-[10px] text-cyber-green mt-1">Centre admins and staff with access</p>
            </div>
            <Shield className="w-4 h-4 text-cyber-green" />
          </div>
        </CyberCard>

        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1">Active Users</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{monthlyActiveParents}</h3>
              <p className="text-[10px] text-cyber-cyan mt-1">Signed in within the last 30 days</p>
            </div>
            <UserCheck className="w-4 h-4 text-cyber-cyan" />
          </div>
        </CyberCard>
      </section>

      <CyberCard className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
          <h2 className="font-orbitron text-xs font-bold text-white tracking-widest uppercase text-cyber-cyan">Centre staff directory ({ecdAdminRows.length})</h2>
          <Button variant="outline" size="sm" className="font-orbitron text-[9px] tracking-widest uppercase border-white/10 hover:bg-white/5">Export list</Button>
        </div>
        <div className="bg-slate-950/40">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">User</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Contact</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Centre</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Role</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Last sign in</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ecdAdminRows.map((row: any) => (
                <TableRow key={row.id} className="border-white/5 hover:bg-white/5 group">
                  <TableCell className="p-4">
                    <span className="font-medium text-white block">{row.full_name}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-tighter">ID: {row.id.slice(0,8)}</span>
                  </TableCell>
                  <TableCell className="p-4 text-slate-300 text-xs">{row.email ?? 'No email saved'}</TableCell>
                  <TableCell className="p-4">
                    <span className="text-white text-xs block">{row.centreName ?? '-'}</span>
                    <span className="text-[10px] text-cyber-cyan uppercase font-bold">{row.tier ?? 'FREE'}</span>
                  </TableCell>
                  <TableCell className="p-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                      row.role === 'ecd_admin' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : 
                      "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    )}>
                      {row.role.replace('ecd_', '')}
                    </span>
                  </TableCell>
                  <TableCell className="p-4 text-slate-400 text-xs">{formatDateTime(row.last_sign_in_at)}</TableCell>
                  <TableCell className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button size="sm" className="h-7 text-[10px] uppercase tracking-widest font-orbitron bg-white/5 border-white/10 hover:bg-white/10">View</Button>
                       <Button size="sm" className="h-7 text-[10px] uppercase tracking-widest font-orbitron bg-white/5 border-white/10 hover:bg-white/10 text-rose-400">Revoke</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CyberCard>
    </AdminPageLayout>
  )
}
