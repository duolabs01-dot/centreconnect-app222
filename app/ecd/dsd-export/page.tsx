// app/ecd/dsd-export/page.tsx
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'
import { Download } from 'lucide-react'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export default async function DsdExportComingSoon() {
  const { user, role } = await requireEcdPortalSession()
  return (
    <EcdOsShell
      title="DSD Export"
      description="One-click subsidy reporting and registration exports."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : 'Staff'}
      userEmail={user.email ?? ''}
    >
      <ComingSoonCard 
        title="DSD & Subsidy Exports"
        description="One-click generation of attendance and registration records formatted for DSD subsidy claims. Launching in Phase 6."
        icon={Download}
      />
    </EcdOsShell>
  )
}
