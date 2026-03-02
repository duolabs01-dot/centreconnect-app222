interface StatusBadgeProps {
  status: 'paid' | 'pending' | 'overdue' | 'draft';
}

const STATUS_STYLES: Record<StatusBadgeProps['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
