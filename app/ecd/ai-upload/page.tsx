// app/ecd/ai-upload/page.tsx
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'
import { Bot } from 'lucide-react'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export default async function AiUploadComingSoon() {
  const { user, role } = await requireEcdPortalSession()
  return (
    <EcdOsShell
      title="AI Documentation"
      description="Instant document processing and digital entry."
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : 'Staff'}
      userEmail={user.email ?? ''}
    >
      <ComingSoonCard 
        title="AI-Powered Document Entry"
        description="Snap a photo of any ID or certificate and let AI handle the data entry. Launching in Phase 6."
        icon={Bot}
      />
    </EcdOsShell>
  )
}
