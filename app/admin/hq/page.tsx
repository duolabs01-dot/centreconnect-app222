import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CompanyHqDashboard } from '@/components/admin/company-hq-dashboard'
import { getCompanyHqSnapshot } from '@/lib/admin/company-hq'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Company HQ',
  description: 'Founder control room for CentreConnect strategy, pilot truth, ownership, and readiness.',
}

export default async function AdminCompanyHqPage() {
  const identity = await requirePlatformAdmin()
  if (!identity) redirect('/login')

  const snapshot = await getCompanyHqSnapshot({
    ownerEmail: identity.email,
  })

  return <CompanyHqDashboard snapshot={snapshot} />
}
