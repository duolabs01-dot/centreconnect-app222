// app/ecd/report-cards/page.tsx
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'
import { FileText } from 'lucide-react'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export default async function ReportCardsComingSoon() {
  const { user, role } = await requireEcdPortalSession()
  return (
    <EcdOsShell
      title="Report Cards"
      description="Digital developmental tracking and parent feedback."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : 'Staff'}
      userEmail={user.email ?? ''}
    >
      <ComingSoonCard 
        title="Digital Report Cards"
        description="Automated developmental tracking and professional report cards for parents. Launching in Phase 5."
        icon={FileText}
      />
    </EcdOsShell>
  )
}
