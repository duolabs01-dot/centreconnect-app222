import { formatStatusBadgeLabel, toStatusBadgeStatus, type StatusBadgeStatus } from '@/lib/status-badge'

interface StatusBadgeProps {
  status: string | null | undefined;
}

const STATUS_STYLES: Record<StatusBadgeStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = toStatusBadgeStatus(status)
  const label = formatStatusBadgeLabel(status)

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm ${STATUS_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}

export type { StatusBadgeStatus }
