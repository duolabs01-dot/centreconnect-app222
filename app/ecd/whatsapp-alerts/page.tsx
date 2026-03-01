// app/ecd/whatsapp-alerts/page.tsx
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'
import { MessageCircleMore } from 'lucide-react'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export default async function WhatsappAlertsComingSoon() {
  const { user, role } = await requireEcdPortalSession()
  return (
    <EcdOsShell
      title="WhatsApp Alerts"
      description="Automated parent notifications via WhatsApp."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : 'Staff'}
      userEmail={user.email ?? ''}
    >
      <ComingSoonCard 
        title="Official WhatsApp API Alerts"
        description="Send automated updates, reminders, and emergencies directly to parents on WhatsApp. Launching in Phase 6."
        icon={MessageCircleMore}
      />
    </EcdOsShell>
  )
}
