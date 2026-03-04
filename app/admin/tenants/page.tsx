import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { AdminTenantsOnboarding } from '@/components/admin/admin-tenants-onboarding'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tenant Onboarding | CC Admin',
  description: 'Hybrid onboarding and tenant operations console.',
}

const centreIdSchema = z.string().uuid()

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  return { user, admin }
}

async function deleteTenantAction(formData: FormData) {
  'use server'
  const parsedId = centreIdSchema.safeParse(String(formData.get('centreId') ?? ''))
  if (!parsedId.success) {
    redirect('/admin/tenants?notice=invalid_centre')
  }

  const { admin } = await requirePlatformAdmin()
  const centreId = parsedId.data

  const { error: deleteError } = await admin.from('ecd_centres').delete().eq('id', centreId)
  if (deleteError) {
    const { error: archiveError } = await admin.from('ecd_centres').update({ is_active: false }).eq('id', centreId)
    if (archiveError) {
      redirect('/admin/tenants?notice=delete_failed')
    }
    redirect('/admin/tenants?notice=archived')
  }

  redirect('/admin/tenants?notice=deleted')
}

type PageSearchParams = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
}

function noticeText(value: string | undefined) {
  if (value === 'deleted') return 'Tenant deleted.'
  if (value === 'archived') return 'Tenant could not be deleted due to linked records and was archived (inactive).'
  if (value === 'delete_failed') return 'Delete failed.'
  if (value === 'invalid_centre') return 'Invalid centre ID.'
  return null
}

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>
}) {
  const { admin } = await requirePlatformAdmin()
  const resolved = (await searchParams) ?? {}
  const audience = one(resolved.audience) === 'parent' ? 'parent' : 'ecd'
  const notice = noticeText(one(resolved.notice))

  const [centresResult, invitationsResult] = await Promise.all([
    admin
      .from('ecd_centres')
      .select('id,name,email,phone,contact_phone,is_active,owner_id,created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    admin
      .from('ecd_admin_invitations')
      .select('ecd_id,accepted_at,invited_at')
      .eq('role', 'ecd_admin')
      .order('invited_at', { ascending: false })
      .limit(5000),
  ])

  const centres = (centresResult.data ?? []) as Array<{
    id: string
    name: string | null
    email: string | null
    phone: string | null
    contact_phone?: string | null
    is_active: boolean | null
    owner_id: string | null
    created_at: string
  }>
  const invitationRows = (invitationsResult.data ?? []) as Array<{
    ecd_id: string
    accepted_at: string | null
    invited_at: string | null
  }>

  const claimedByCentre = new Map<string, string>()
  for (const row of invitationRows) {
    if (!row.accepted_at) continue
    const existing = claimedByCentre.get(row.ecd_id)
    if (!existing || new Date(row.accepted_at).getTime() > new Date(existing).getTime()) {
      claimedByCentre.set(row.ecd_id, row.accepted_at)
    }
  }

  const tenants = centres.map((centre) => {
    const claimedDate = claimedByCentre.get(centre.id) ?? null
    const ownerPhone = centre.contact_phone?.trim() || centre.phone?.trim() || '-'
    const ownerEmail = centre.email?.trim() || '-'
    const isClaimed = Boolean(centre.owner_id) || Boolean(claimedDate)
    const status = !centre.is_active ? 'Inactive' : isClaimed ? 'Claimed' : 'Unclaimed'
    return {
      id: centre.id,
      name: centre.name?.trim() || 'Untitled Centre',
      ownerEmail,
      ownerPhone,
      status,
      claimedDate: claimedDate ?? (isClaimed ? centre.created_at : null),
    }
  })
  const existingCentres = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    ownerEmail: tenant.ownerEmail === '-' ? null : tenant.ownerEmail,
  }))

  return (
    <div className="space-y-8 pb-16">
      <Card className="border-cyan-500/20 bg-gradient-to-br from-[#040913] via-[#061021] to-[#03111f]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">CC Admin</Badge>
            <Badge className="border-slate-700 bg-slate-900 text-slate-300">Hybrid Onboarding</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black tracking-tight text-white">Tenants</CardTitle>
            <CardDescription className="text-slate-300">
              Single centre onboarding, bulk team invites, and full tenant operations in one place.
            </CardDescription>
          </div>
          <div className="inline-flex rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-1">
            <Button
              asChild
              size="sm"
              className={audience === 'parent' ? 'bg-transparent text-slate-300 hover:bg-slate-800' : 'bg-cyan-500 text-black hover:bg-cyan-400'}
            >
              <Link href="/admin/tenants?audience=ecd">ECD</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className={audience === 'parent' ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-transparent text-slate-300 hover:bg-slate-800'}
            >
              <Link href="/admin/tenants?audience=parent">Parent</Link>
            </Button>
          </div>
          {notice ? (
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">{notice}</div>
          ) : null}
          {audience === 'parent' ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              Parent mode selected. Tenant onboarding below remains ECD-focused.
            </div>
          ) : null}
        </CardHeader>
      </Card>

      <AdminTenantsOnboarding existingCentres={existingCentres} />

      <Card className="border-cyan-500/20 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">All Tenants</CardTitle>
          <CardDescription className="text-slate-400">Complete tenant registry with quick actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Owner Email</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Owner Phone</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Claimed Date</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500 text-right">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No tenants found.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="border-slate-800">
                    <TableCell className="font-semibold text-slate-100">{tenant.name}</TableCell>
                    <TableCell className="text-slate-300">{tenant.ownerEmail}</TableCell>
                    <TableCell className="text-slate-300">{tenant.ownerPhone}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          tenant.status === 'Claimed'
                            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                            : tenant.status === 'Inactive'
                              ? 'border-slate-600 bg-slate-800 text-slate-300'
                              : 'border-amber-500/30 bg-amber-500/15 text-amber-200'
                        }
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{formatDate(tenant.claimedDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild size="sm" variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                          <Link href={`/admin/tenants/${tenant.id}`}>Edit</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                          <Link href={`/admin/tenants/${tenant.id}`}>View</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                          <Link href={`/admin/tenants/${tenant.id}#invite`}>Invite</Link>
                        </Button>
                        <form action={deleteTenantAction}>
                          <input type="hidden" name="centreId" value={tenant.id} />
                          <Button type="submit" size="sm" variant="destructive" className="bg-rose-600/90 text-white hover:bg-rose-500">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
