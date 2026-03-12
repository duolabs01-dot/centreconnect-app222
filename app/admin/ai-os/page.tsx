import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AiCompanyOsDashboard } from '@/components/admin/ai-company-os-dashboard'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { getAiCompanyOperatingSystemSnapshot } from '@/lib/ai/company-os/service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Company OS | Platform Admin',
  description: 'Feature-flagged internal operating system foundation for CEO, CTO, Ops, and Growth AI roles.',
}

export default async function AdminAiCompanyOperatingSystemPage() {
  const identity = await requirePlatformAdmin()
  if (!identity) redirect('/login')

  const snapshot = await getAiCompanyOperatingSystemSnapshot({
    ownerEmail: identity.email,
  })

  return <AiCompanyOsDashboard snapshot={snapshot} />
}
