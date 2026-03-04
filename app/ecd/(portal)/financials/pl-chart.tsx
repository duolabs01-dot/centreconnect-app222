type Snapshot = {
  period_month: string
  revenue_total: number | string | null
  expenses_total: number | string | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(period: string) {
  const monthIndex = Number(period.slice(5, 7)) - 1
  return MONTHS[monthIndex] ?? period.slice(5, 7)
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function PlChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (!snapshots.length) {
    return (
      <div className="rounded-2xl border border-cyber-cyan/40 bg-slate-950/80 p-6 text-center shadow-[0_22px_55px_-35px_rgba(6,182,212,0.85)] text-white">
        <p className="font-orbitron text-[11px] uppercase tracking-[0.4em] text-cyber-cyan">
          No financial data yet. Enter your first month above.
        </p>
      </div>
    )
  }

  const svgW = 600
  const svgH = 220
  const topPad = 16
  const bottomPad = 44
  const chartH = svgH - topPad - bottomPad
  const leftPad = 20
  const rightPad = 20
  const chartW = svgW - leftPad - rightPad
  const slotW = chartW / Math.max(snapshots.length, 1)
  const barW = Math.min(16, slotW * 0.28)
  const maxVal = Math.max(1, ...snapshots.flatMap((item) => [toNumber(item.revenue_total), toNumber(item.expenses_total)]))
  const plValues = snapshots.map((item) => toNumber(item.revenue_total) - toNumber(item.expenses_total))
  const minPl = Math.min(...plValues, 0)
  const maxPl = Math.max(...plValues, 0)
  const plSpan = Math.max(1, maxPl - minPl)
  const plStroke = plValues[plValues.length - 1] >= 0 ? '#14b8a6' : '#f43f5e'

  const polylinePoints = snapshots
    .map((item, index) => {
      const centreX = leftPad + index * slotW + slotW * 0.5
      const pl = toNumber(item.revenue_total) - toNumber(item.expenses_total)
      const y = topPad + chartH - ((pl - minPl) / plSpan) * chartH
      return `${centreX},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-2xl border border-cyber-cyan/30 bg-slate-950/80 p-6 shadow-[0_30px_70px_-40px_rgba(6,182,212,0.85)] text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-orbitron text-[10px] uppercase tracking-[0.4em] text-cyber-cyan">
          6-Month Revenue vs Expenses Trend
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Revenue
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Expenses
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            P&amp;L
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-56 w-full">
        {[0.25, 0.5, 0.75].map((fraction) => {
          const y = topPad + chartH * fraction
          return (
            <line
              key={fraction}
              x1={leftPad}
              y1={y}
              x2={svgW - rightPad}
              y2={y}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.7"
            />
          )
        })}

        {snapshots.map((item, index) => {
          const revenue = toNumber(item.revenue_total)
          const expenses = toNumber(item.expenses_total)
          const revenueHeight = (revenue / maxVal) * chartH
          const expensesHeight = (expenses / maxVal) * chartH
          const baseX = leftPad + index * slotW + slotW * 0.5
          const revenueX = baseX - barW - 3
          const expensesX = baseX + 3
          const labelX = baseX
          const labelY = svgH - 16

          return (
            <g key={`${item.period_month}-${index}`}>
              <rect
                x={revenueX}
                y={topPad + chartH - revenueHeight}
                width={barW}
                height={revenueHeight}
                rx={2}
                fill="#0e7490"
              />
              <rect
                x={expensesX}
                y={topPad + chartH - expensesHeight}
                width={barW}
                height={expensesHeight}
                rx={2}
                fill="#f43f5e"
              />
              <text x={labelX} y={labelY} textAnchor="middle" fontSize="10" fill="#cbd5f5">
                {monthLabel(item.period_month)}
              </text>
            </g>
          )
        })}

        <polyline points={polylinePoints} fill="none" stroke={plStroke} strokeWidth="2.2" />

        {snapshots.map((item, index) => {
          const centreX = leftPad + index * slotW + slotW * 0.5
          const pl = toNumber(item.revenue_total) - toNumber(item.expenses_total)
          const y = topPad + chartH - ((pl - minPl) / plSpan) * chartH
          const dotFill = pl >= 0 ? '#14b8a6' : '#f43f5e'
          return <circle key={`pl-${item.period_month}-${index}`} cx={centreX} cy={y} r="3.1" fill={dotFill} />
        })}
      </svg>
    </div>
  )
}
