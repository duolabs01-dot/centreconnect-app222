'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'
import { TrendingUp, TrendingDown, MoreHorizontal, Activity } from 'lucide-react'

interface AdminKpiCardProps {
  label: string
  value: string | number
  trend?: number
  sparklineData: number[]
  className?: string
  accent?: 'cyan' | 'teal' | 'rose' | 'emerald'
  deltaLabel?: string
  deltaTone?: 'up' | 'down' | 'neutral'
}

export function AdminKpiCard({ label, value, trend, sparklineData, className, accent = 'cyan', deltaLabel, deltaTone = 'neutral' }: AdminKpiCardProps) {
  const isUp = trend && trend > 0
  const deltaClass = deltaTone === 'up'
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    : deltaTone === 'down'
      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
      : 'bg-slate-700/30 text-slate-200 border-white/10'
  const deltaIcon = deltaTone === 'up' ? <TrendingUp className="w-3 h-3" /> : deltaTone === 'down' ? <TrendingDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />

  return (
    <div className={cn(
      "tile transform-gpu [will-change:transform] relative bg-[var(--cyber-card)] border border-white/5 rounded-3xl p-6 sm:p-8 hover:bg-[var(--cyber-card)] transition-transform duration-200 group overflow-hidden shadow-2xl shadow-black/40",
      className
    )}>
      {/* Background glow overlay */}
      <div className="absolute -right-4 -top-4 h-24 w-24 bg-cyan-500/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      
      {/* Header Info */}
      <div className="flex justify-between items-start mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500/50 shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-cyan-400 transition-colors duration-500">
              {label}
            </p>
          </div>
          <h3 className="text-3xl font-black text-white mt-2 tracking-tighter sm:text-4xl">
            {value}
          </h3>
          {deltaLabel ? (
            <div className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]', deltaClass)}>
              {deltaIcon}
              <span className="truncate">{deltaLabel}</span>
            </div>
          ) : null}
        </div>
        <button className="rounded-lg bg-white/5 p-1.5 text-slate-600 transition-colors duration-200 hover:bg-white/10 hover:text-white">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      {/* Sparkline & Trend */}
      <div className="flex items-end justify-between gap-6 pt-4 border-t border-white/[0.03]">
        <div className="flex-1 min-w-0 h-10 flex items-center">
          <Sparkline 
            data={sparklineData} 
            width={140} 
            height={40} 
            color={isUp ? "var(--cyber-cyan)" : "var(--cyber-rose)"} 
          />
        </div>
        
        {trend !== undefined && (
          <div className="flex flex-col items-end gap-1">
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg",
              isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-500 transition-colors">
              Last 7D
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
