import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import DeletedCentresBinTable, { type DeletedCentre } from '@/components/admin/deleted-centres-bin-table'

export const metadata: Metadata = {
  title: 'Deleted Centres | Platform Admin',
  description: 'Review centres that were moved to the bin and restore them when needed.',
}

export default async function DeletedTenantsBinPage() {
  const platformAdmin = await requirePlatformAdmin()
  if (!platformAdmin) redirect('/login')

  const admin = createAdminClient()
  const { data: centres } = await admin
    .from('ecd_centres')
    .select('id,name,slug,deleted_at,deleted_by')
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false })

  const sanitized = (centres ?? []) as DeletedCentre[]

  return (
    <main className="space-y-8 px-4 py-10 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin Bin</p>
        <h1 className="text-3xl font-black text-white">Deleted centres</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          These centres were moved to the bin by a platform admin. You can restore them here before they are permanently removed.
        </p>
        <div className="pt-2">
          <Link href="/admin/tenants" className="text-sm font-semibold text-cyan-400 hover:text-cyan-200">
            ← Back to active centres
          </Link>
        </div>
      </section>
      <section className="space-y-3">
        <DeletedCentresBinTable centres={sanitized} />
      </section>
    </main>
  )
}
