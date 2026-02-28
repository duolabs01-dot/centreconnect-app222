import React from 'react'
import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface AdminKpiCardProps {
  label: string
  value: string | number
  trend?: number
  sparklineData: number[]
  className?: string
}

export function AdminKpiCard({ label, value, trend, sparklineData, className }: AdminKpiCardProps) {
  const isUp = trend && trend > 0
  
  return (
    <div className={cn(
      "bg-[#161B22] border border-white/5 rounded-2xl p-5 hover:bg-[#1C2128] transition-all duration-300 group",
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-cyan-500 transition-colors">
            {label}
          </p>
          <h3 className="text-2xl font-black text-white mt-1 tracking-tight">
            {value}
          </h3>
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg",
            isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between gap-4 mt-2">
        <div className="flex-1 min-w-0">
          <Sparkline 
            data={sparklineData} 
            width={120} 
            height={32} 
            color={isUp ? "#10B981" : "#F43F5E"} 
          />
        </div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
          Live Sync
        </p>
      </div>
    </div>
  )
}
