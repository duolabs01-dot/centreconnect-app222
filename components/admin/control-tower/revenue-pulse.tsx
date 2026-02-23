import { ArrowDown, ArrowUp, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { cn } from '@/lib/utils'

interface RevenuePulseProps {
  netRevenueMovement: number
  mrr: number
  arr: number
  churnRate: number
  arpu: number
  failedPaymentsCount: number
  failedPaymentsAmount: number
}

export function RevenuePulse({
  netRevenueMovement,
  mrr,
  arr,
  churnRate,
  arpu,
  failedPaymentsCount,
  failedPaymentsAmount,
}: RevenuePulseProps) {
  const isPositive = netRevenueMovement >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-cyan-500 shadow-[var(--shadow-elevation-1)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Net Revenue Movement (30d)</CardTitle>
          <TrendingUp className={cn("h-4 w-4", isPositive ? "text-emerald-500" : "text-rose-500")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", isPositive ? "text-emerald-600" : "text-rose-600")}>
            {isPositive ? '+' : ''}R {netRevenueMovement.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">
            New subs + upgrades - churn - failed
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-elevation-1)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">MRR & ARR</CardTitle>
          <DollarSign className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">R {mrr.toLocaleString()}</div>
          <p className="text-xs text-slate-500">
            ARR: R {arr.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-elevation-1)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Churn & Health</CardTitle>
          <ArrowDown className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{churnRate.toFixed(1)}%</div>
          <p className="text-xs text-slate-500">
            ARPU: R {arpu.toLocaleString()}
          </p>
        </CardContent>
      </Card>

       <Card className={cn("shadow-[var(--shadow-elevation-1)]", failedPaymentsCount > 0 ? "border-rose-200 bg-rose-50" : "")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Failed Payments</CardTitle>
          <AlertTriangle className={cn("h-4 w-4", failedPaymentsCount > 0 ? "text-rose-500" : "text-slate-400")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", failedPaymentsCount > 0 ? "text-rose-600" : "text-slate-900")}>
            {failedPaymentsCount}
          </div>
          <p className="text-xs text-slate-500">
            Value: R {failedPaymentsAmount.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


