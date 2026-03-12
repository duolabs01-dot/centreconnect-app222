import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OpenClawOpsDashboard } from '@/components/admin/openclaw-ops-dashboard'
import { getOpenClawOpsSnapshot } from '@/lib/ai/openclaw-ops/service'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenClaw Operations',
  description: 'Read-only founder view for OpenClaw agents, subagents, recent work, and handoffs.',
}

export default async function AdminOpenClawPage() {
  const identity = await requirePlatformAdmin()
  if (!identity) redirect('/login')

  const snapshot = await getOpenClawOpsSnapshot()

  return <OpenClawOpsDashboard snapshot={snapshot} />
}
