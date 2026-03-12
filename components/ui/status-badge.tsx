import { Badge } from '@/components/ui/badge'
import { formatStatusBadgeLabel, toStatusBadgeStatus, type StatusBadgeStatus } from '@/lib/status-badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string | null | undefined
  label?: string
  className?: string
}

const STATUS_STYLES: Record<StatusBadgeStatus, string> = {
  active: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  issue: 'border-rose-200 bg-rose-50 text-rose-700',
  waiting: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const tone = toStatusBadgeStatus(status)
  const resolvedLabel = label ?? formatStatusBadgeLabel(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-none',
        STATUS_STYLES[tone],
        className
      )}
    >
      {resolvedLabel}
    </Badge>
  )
}

export type { StatusBadgeStatus }
