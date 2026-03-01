// app/ecd/parent-invoicing/page.tsx
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'
import { Receipt } from 'lucide-react'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export default async function ParentInvoicingComingSoon() {
  const { user, role } = await requireEcdPortalSession()
  return (
    <EcdOsShell
      title="Parent Invoicing"
      description="Direct billing and automated fee tracking."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : 'Staff'}
      userEmail={user.email ?? ''}
    >
      <ComingSoonCard 
        title="Automated Parent Invoicing"
        description="Generate invoices, track payments, and send reminders automatically. Launching in Phase 5."
        icon={Receipt}
      />
    </EcdOsShell>
  )
}
