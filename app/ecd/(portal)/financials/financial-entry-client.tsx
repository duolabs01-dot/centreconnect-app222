'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteLineItem, saveLineItem, upsertMonthlySnapshot } from './actions'

type Snapshot = {
  period_month: string
  revenue_total: number | string | null
  expenses_total: number | string | null
  assets_total: number | string | null
  liabilities_total: number | string | null
  notes: string | null
}

type LineItem = {
  id: string
  category: string
  type: 'revenue' | 'expense' | 'asset' | 'liability'
  label: string
  amount: number | string
  notes: string | null
}

type FinancialEntryClientProps = {
  ecdId: string
  canEdit: boolean
  currentPeriod: string
  currentSnapshot: Snapshot
  lineItems: LineItem[]
}

function formatRand(value: number) {
  return `R${value.toLocaleString('en-ZA')}`
}

function parseNumberish(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function periodToMonthKey(period: string) {
  return period.slice(0, 7)
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  return new Date(year, month - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
}

function getMonthOptions(period: string) {
  const [year, month] = periodToMonthKey(period).split('-').map(Number)
  const base = new Date(year, (month ?? 1) - 1, 1)
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - index, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { value: monthKey, label: getMonthLabel(monthKey) }
  })
}

function PLSummary({ revenue, expenses }: { revenue: number; expenses: number }) {
  const pl = revenue - expenses
  const label = pl > 0 ? 'Profit' : pl < 0 ? 'Loss' : 'Break-even'
  const cls = pl > 0 ? 'text-emerald-700' : pl < 0 ? 'text-rose-700' : 'text-slate-500'
  return (
    <div className="rounded-2xl border border-border bg-card/90 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly P&amp;L</p>
      <p className={`mt-2 text-4xl font-black ${cls}`}>
        {label}: {formatRand(Math.abs(pl))}
      </p>
      <p className="mt-1 text-xs text-slate-500">Revenue - Expenses</p>
    </div>
  )
}

export function FinancialEntryClient({
  ecdId,
  canEdit,
  currentPeriod,
  currentSnapshot,
  lineItems,
}: FinancialEntryClientProps) {
  const router = useRouter()
  const monthKey = periodToMonthKey(currentPeriod)
  const monthOptions = useMemo(() => getMonthOptions(currentPeriod), [currentPeriod])
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)
  const [lineItemType, setLineItemType] = useState<'revenue' | 'expense' | 'asset' | 'liability'>('revenue')
  const [revenueTotal, setRevenueTotal] = useState(parseNumberish(currentSnapshot.revenue_total))
  const [expensesTotal, setExpensesTotal] = useState(parseNumberish(currentSnapshot.expenses_total))
  const [assetsTotal, setAssetsTotal] = useState(parseNumberish(currentSnapshot.assets_total))
  const [liabilitiesTotal, setLiabilitiesTotal] = useState(parseNumberish(currentSnapshot.liabilities_total))
  const [notes, setNotes] = useState(currentSnapshot.notes ?? '')

  useEffect(() => {
    setRevenueTotal(parseNumberish(currentSnapshot.revenue_total))
    setExpensesTotal(parseNumberish(currentSnapshot.expenses_total))
    setAssetsTotal(parseNumberish(currentSnapshot.assets_total))
    setLiabilitiesTotal(parseNumberish(currentSnapshot.liabilities_total))
    setNotes(currentSnapshot.notes ?? '')
    setStatus(null)
  }, [currentSnapshot])

  const netWorth = assetsTotal - liabilitiesTotal

  const onSaveSnapshot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) return

    const payload = new FormData()
    payload.set('period_month', currentPeriod)
    payload.set('revenue_total', revenueTotal.toString())
    payload.set('expenses_total', expensesTotal.toString())
    payload.set('assets_total', assetsTotal.toString())
    payload.set('liabilities_total', liabilitiesTotal.toString())
    payload.set('notes', notes)

    startTransition(async () => {
      const result = await upsertMonthlySnapshot(payload)
      if ('error' in result) {
        setStatus({ type: 'error', message: result.error })
        return
      }
      setStatus({ type: 'ok', message: `Saved ${getMonthLabel(monthKey)} snapshot.` })
      router.refresh()
    })
  }

  const onAddLineItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) return
    const form = event.currentTarget
    const payload = new FormData(form)
    payload.set('period_month', currentPeriod)

    startTransition(async () => {
      const result = await saveLineItem(payload)
      if ('error' in result) {
        setStatus({ type: 'error', message: result.error })
        return
      }
      form.reset()
      setLineItemType('revenue')
      setStatus({ type: 'ok', message: 'Line item added.' })
      router.refresh()
    })
  }

  const onDeleteLineItem = (id: string) => {
    if (!canEdit) return
    const payload = new FormData()
    payload.set('id', id)
    startDeleteTransition(async () => {
      const result = await deleteLineItem(payload)
      if ('error' in result) {
        setStatus({ type: 'error', message: result.error })
        return
      }
      setStatus({ type: 'ok', message: 'Line item removed.' })
      router.refresh()
    })
  }

  return (
    <section className="space-y-6">
      <Card className="border-border">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Monthly Financial Entry</CardTitle>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centre</p>
              <p className="text-sm text-foreground">{ecdId.slice(0, 8)}...</p>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Month
              <select
                className="cc-native-field mt-1 min-w-[220px]"
                value={monthKey}
                onChange={(event) => {
                  const nextMonth = event.target.value
                  router.push(`/ecd/financials?period=${nextMonth}`)
                }}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSaveSnapshot} className="space-y-4">
            {canEdit ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Revenue (R)
                  <input
                    type="number"
                    className="cc-native-field mt-1"
                    min="0"
                    step="0.01"
                    value={revenueTotal}
                    onChange={(event) => setRevenueTotal(Number(event.target.value) || 0)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Expenses (R)
                  <input
                    type="number"
                    className="cc-native-field mt-1"
                    min="0"
                    step="0.01"
                    value={expensesTotal}
                    onChange={(event) => setExpensesTotal(Number(event.target.value) || 0)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assets (R)
                  <input
                    type="number"
                    className="cc-native-field mt-1"
                    min="0"
                    step="0.01"
                    value={assetsTotal}
                    onChange={(event) => setAssetsTotal(Number(event.target.value) || 0)}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Liabilities (R)
                  <input
                    type="number"
                    className="cc-native-field mt-1"
                    min="0"
                    step="0.01"
                    value={liabilitiesTotal}
                    onChange={(event) => setLiabilitiesTotal(Number(event.target.value) || 0)}
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-card/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revenue</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{formatRand(revenueTotal)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expenses</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{formatRand(expensesTotal)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assets</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{formatRand(assetsTotal)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liabilities</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{formatRand(liabilitiesTotal)}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <PLSummary revenue={revenueTotal} expenses={expensesTotal} />
              <div className="rounded-2xl border border-border bg-card/90 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Net Worth</p>
                <p className={`mt-2 text-4xl font-black ${netWorth >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>
                  {netWorth >= 0 ? '+' : '-'}
                  {formatRand(Math.abs(netWorth))}
                </p>
                <p className="mt-1 text-xs text-slate-500">Assets - Liabilities</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
                {canEdit ? (
                  <textarea
                    className="cc-native-field mt-1 h-auto min-h-20 py-2"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional monthly context"
                  />
                ) : (
                  <div className="mt-1 min-h-20 rounded-md border border-border bg-card/80 p-3 text-sm text-slate-700">
                    {notes.trim() || 'No notes for this month.'}
                  </div>
                )}
              </label>
            </div>

            {canEdit ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Monthly Snapshot'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Staff members can view monthly financial data but cannot edit it.
              </p>
            )}
          </form>

          {status ? (
            <p className={`text-sm ${status.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{status.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Line Items ({lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No line items for this month yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Label
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                    {canEdit ? (
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Action
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 capitalize text-foreground">{item.type}</td>
                      <td className="px-3 py-2 text-foreground">{item.category}</td>
                      <td className="px-3 py-2 text-foreground">{item.label}</td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {formatRand(parseNumberish(item.amount))}
                      </td>
                      {canEdit ? (
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => onDeleteLineItem(item.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canEdit ? (
            <form onSubmit={onAddLineItem} className="grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type
                <select
                  name="type"
                  className="cc-native-field mt-1"
                  value={lineItemType}
                  onChange={(event) =>
                    setLineItemType(event.target.value as 'revenue' | 'expense' | 'asset' | 'liability')
                  }
                >
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
                <input name="category" className="cc-native-field mt-1" placeholder="General" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Label
                <input name="label" className="cc-native-field mt-1" placeholder="Item label" required />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount (R)
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="cc-native-field mt-1"
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
                <input name="line_item_notes" className="cc-native-field mt-1" placeholder="Optional" />
              </label>
              <div className="md:col-span-2 xl:col-span-5">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Adding...' : 'Add Line Item'}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
