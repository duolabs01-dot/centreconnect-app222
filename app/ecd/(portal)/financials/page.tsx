import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { FinancialEntryClient } from './financial-entry-client'
import { PlChart } from './pl-chart'

export const metadata: Metadata = {
  title: 'Financial Intelligence - CentreConnect',
  description: 'Track monthly P&L, manage line items, and monitor trend performance.',
}

type SnapshotRow = {
  period_month: string
  revenue_total: number | string | null
  expenses_total: number | string | null
  assets_total: number | string | null
  liabilities_total: number | string | null
  notes: string | null
}

type LineItemRow = {
  id: string
  category: string
  type: 'revenue' | 'expense' | 'asset' | 'liability'
  label: string
  amount: number | string
  notes: string | null
}

type FinancialsPageProps = {
  searchParams?: {
    period?: string
  }
}

function resolvePeriod(periodParam?: string): string {
  if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
    return `${periodParam}-01`
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export default async function EcdFinancialsPage({ searchParams }: FinancialsPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const canEdit = role === 'ecd_admin' || role === 'ecd_supervisor'
  const currentPeriod = resolvePeriod(searchParams?.period)
  const currentPeriodDate = new Date(`${currentPeriod}T00:00:00`)
  const sixMonthsAgo = new Date(currentPeriodDate.getFullYear(), currentPeriodDate.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10)

  const [snapshotsResult, lineItemsResult] = await Promise.all([
    supabase
      .from('ecd_financial_snapshots')
      .select('period_month,revenue_total,expenses_total,assets_total,liabilities_total,notes')
      .eq('ecd_id', ecdId)
      .gte('period_month', sixMonthsAgo)
      .lte('period_month', currentPeriod)
      .order('period_month', { ascending: true }),
    supabase
      .from('ecd_financial_line_items')
      .select('id,category,type,label,amount,notes')
      .eq('ecd_id', ecdId)
      .eq('period_month', currentPeriod)
      .order('type', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const snapshots = ((snapshotsResult.data ?? []) as SnapshotRow[]) ?? []
  const lineItems = ((lineItemsResult.data ?? []) as LineItemRow[]) ?? []

  const currentSnapshot =
    snapshots.find((snapshot) => snapshot.period_month.startsWith(currentPeriod.slice(0, 7))) ?? {
      period_month: currentPeriod,
      revenue_total: 0,
      expenses_total: 0,
      assets_total: 0,
      liabilities_total: 0,
      notes: null,
    }

  return (
    <EcdOsShell
      title="Financial Intelligence"
      description="Track monthly P&L, manage line items, and monitor 6-month trends."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? ''}
      userRole={role}
    >
      <div className="space-y-8">
        <FinancialEntryClient
          ecdId={ecdId}
          canEdit={canEdit}
          currentPeriod={currentPeriod}
          currentSnapshot={currentSnapshot}
          lineItems={lineItems}
        />
        <PlChart snapshots={snapshots} />
      </div>
    </EcdOsShell>
  )
}

