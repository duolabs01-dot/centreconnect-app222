'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// components/cc-admin/MeshAreaChart.tsx

type RevenuePoint = {
  month: string
  revenue: number
}

function getLastSixMonthDates() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    date.setHours(0, 0, 0, 0)
    return date
  })
}

function buildEmptyRevenueSeries(): RevenuePoint[] {
  return getLastSixMonthDates().map((date) => ({
    month: date.toLocaleString('en-ZA', { month: 'short', year: '2-digit' }),
    revenue: 0,
  }))
}

export function MeshAreaChart() {
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>(() => buildEmptyRevenueSeries())
  const W = 400
  const H = 160

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const fetchRevenue = async () => {
      try {
        const monthDates = getLastSixMonthDates()
        const monthLabels = monthDates.map((date) =>
          date.toLocaleString('en-ZA', { month: 'short', year: '2-digit' })
        )
        const sixMonthsAgoISO = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total, paid_at')
          .eq('status', 'paid')
          .gte('paid_at', sixMonthsAgoISO)
          .order('paid_at', { ascending: true })

        const monthlyRevenue =
          invoices?.reduce((acc, inv) => {
            if (!inv.paid_at) return acc
            const month = new Date(inv.paid_at).toLocaleString('en-ZA', { month: 'short', year: '2-digit' })
            acc[month] = (acc[month] ?? 0) + Number(inv.total ?? 0)
            return acc
          }, {} as Record<string, number>) ?? {}

        const nextSeries: RevenuePoint[] = monthLabels.map((month) => ({
          month,
          revenue: monthlyRevenue[month] ?? 0,
        }))

        if (active) {
          setRevenueSeries(nextSeries)
        }
      } catch {
        if (active) {
          setRevenueSeries(buildEmptyRevenueSeries())
        }
      }
    }

    void fetchRevenue()
    const interval = setInterval(() => {
      void fetchRevenue()
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const { revenueY, trendY, monthLabels } = useMemo(() => {
    const revenues = revenueSeries.map((point) => point.revenue)
    const trend = revenues.map((_, index) => {
      const start = Math.max(0, index - 2)
      const values = revenues.slice(start, index + 1)
      const sum = values.reduce((acc, value) => acc + value, 0)
      return values.length > 0 ? sum / values.length : 0
    })
    const maxRevenue = Math.max(...revenues, ...trend, 1)
    const topPadding = 10
    const bottomPadding = 10
    const graphHeight = H - topPadding - bottomPadding
    const toY = (value: number) => H - bottomPadding - (value / maxRevenue) * graphHeight

    return {
      revenueY: revenues.map(toY),
      trendY: trend.map(toY),
      monthLabels: revenueSeries.map((point) => point.month),
    }
  }, [revenueSeries])

  const generatePath = (data: number[], height: number, isArea: boolean) => {
    const step = W / (data.length - 1)
    let path = `M 0,${isArea ? H : data[0]}`
    
    data.forEach((val, i) => {
      const x = i * step
      if (i === 0) {
        path = `M ${x},${val}`
      } else {
        const prevX = (i - 1) * step
        const prevVal = data[i - 1]
        const cp1x = prevX + step / 2
        const cp2x = prevX + step / 2
        path += ` C ${cp1x},${prevVal} ${cp2x},${val} ${x},${val}`
      }
    })

    if (isArea) {
      path += ` L ${W},${H} L 0,${H} Z`
    }
    return path
  }

  const sessionsArea = generatePath(revenueY, H, true)
  const sessionsLine = generatePath(revenueY, H, false)
  const loadArea = generatePath(trendY, H, true)
  const loadLine = generatePath(trendY, H, false)

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: 'var(--cyber-cyan)' }} />
          <span className="font-inter text-[10px]" style={{ color: 'rgb(74, 85, 104)', fontWeight: 500 }}>
            Paid Revenue
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: 'var(--cyber-violet)' }} />
          <span className="font-inter text-[10px]" style={{ color: 'rgb(74, 85, 104)', fontWeight: 500 }}>
            3-Month Trend
          </span>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sessions-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--cyber-cyan)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--cyber-cyan)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="load-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--cyber-violet)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--cyber-violet)" stopOpacity="0.02" />
            </linearGradient>
            <pattern id="mesh" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(var(--cyber-cyan-rgb),0.06)" strokeWidth="0.5"/>
            </pattern>
          </defs>

          <rect width={W} height={H} fill="url(#mesh)" />

          <motion.path d={sessionsArea} fill="url(#sessions-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
          <motion.path d={loadArea} fill="url(#load-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.2 }} />

          <motion.path
            d={sessionsLine}
            fill="none"
            stroke="var(--cyber-cyan)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
            style={{ filter: 'drop-shadow(0 0 4px var(--cyber-cyan))' }}
          />

          <motion.path
            d={loadLine}
            fill="none"
            stroke="var(--cyber-violet)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
            style={{ filter: 'drop-shadow(0 0 4px var(--cyber-violet))' }}
          />

        </svg>

        <div className="flex justify-between px-0 mt-1">
          {monthLabels.map((t) => (
            <span key={t} className="font-inter text-[9px]" style={{ color: '#4A5568', fontWeight: 400 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
