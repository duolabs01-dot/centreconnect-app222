import { cn } from '@/lib/utils'

type StatusType = string

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-900 border-emerald-200 shadow-emerald-50',
  enrolled: 'bg-emerald-100 text-emerald-900 border-emerald-200 shadow-emerald-50',
  accepted: 'bg-emerald-100 text-emerald-900 border-emerald-200 shadow-emerald-50',
  paid: 'bg-emerald-500 text-white border-transparent shadow-emerald-100',
  pending: 'bg-amber-100 text-amber-900 border-amber-200 shadow-amber-50',
  submitted: 'bg-amber-100 text-amber-900 border-amber-200 shadow-amber-50',
  in_review: 'bg-amber-100 text-amber-900 border-amber-200 shadow-amber-50',
  requested: 'bg-cyan-100 text-cyan-900 border-cyan-200 shadow-cyan-50',
  quoted: 'bg-teal-100 text-teal-900 border-teal-200 shadow-teal-50',
  waitlisted: 'bg-violet-100 text-violet-900 border-violet-200 shadow-violet-50',
  rejected: 'bg-rose-100 text-rose-900 border-rose-200 shadow-rose-50',
  withdrawn: 'bg-slate-100 text-slate-700 border-slate-200 shadow-slate-50',
  overdue: 'bg-rose-500 text-white border-transparent shadow-rose-100',
  draft: 'bg-slate-100 text-slate-700 border-slate-200 shadow-slate-50',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase()
  const label = normalizedStatus.replaceAll('_', ' ')
  const showApprovalCelebrate = normalizedStatus === 'approved'
  const styleClass = STATUS_STYLES[normalizedStatus] ?? 'bg-slate-100 text-slate-600 border-slate-200 shadow-slate-50'

  return (
    <span
      data-status={normalizedStatus}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all',
        styleClass,
        showApprovalCelebrate ? 'cc-approval-confetti' : undefined,
        className
      )}
    >
      {label}
    </span>
  )
}
