import { cn } from '@/lib/utils'

interface AdminStatCardProps {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  className?: string
}

export function AdminStatCard({ label, value, change, trend, icon, className }: AdminStatCardProps) {
  return (
    <div className={cn('rounded-squircle bg-admin-surface border border-admin-border p-5 border-t-2 border-t-admin-accent', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-admin-text-muted uppercase tracking-wider">{label}</span>
        {icon && <span className="text-admin-accent">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-admin-text">{value}</div>
      {change && (
        <div className={cn('mt-1 text-xs font-medium',
          trend === 'up' && 'text-admin-success',
          trend === 'down' && 'text-admin-danger',
          trend === 'neutral' && 'text-admin-text-muted',
        )}>{trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{change}</div>
      )}
    </div>
  )
}
