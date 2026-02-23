// components/cc-admin/KpiCard.tsx
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CyberCard } from './CyberCard'

interface KpiCardProps {
  label: string
  value: string | number
  subValue?: string
  trend?: number // percentage
  trendLabel?: string
  icon: LucideIcon
  accent?: 'cyan' | 'violet'
  index?: number
}

export function KpiCard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon: Icon,
  accent = 'cyan',
  index = 0
}: KpiCardProps) {
  const isUp = trend && trend >= 0

  return (
    <CyberCard 
      accent={accent} 
      glow 
      className="p-5"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-orbitron text-2xl font-bold text-white tracking-tighter">
              {value}
            </h3>
            {subValue && (
              <span className="text-[10px] text-slate-500 font-medium">
                {subValue}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "p-2 rounded-lg bg-white/5 border border-white/10",
          accent === 'cyan' ? "text-cyber-cyan" : "text-cyber-violet"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
            isUp ? "trend-up" : "trend-down"
          )}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
        {trendLabel && (
          <p className="text-[10px] text-slate-500 font-medium tracking-wide">
            {trendLabel}
          </p>
        )}
      </div>
    </CyberCard>
  )
}
