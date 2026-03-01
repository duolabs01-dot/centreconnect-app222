import { cn } from "@/lib/utils";

type StatusType = 'paid' | 'pending' | 'overdue' | 'draft' | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const styles: Record<string, string> = {
    paid: "bg-emerald-500 text-white shadow-emerald-100",
    pending: "bg-amber-100 text-amber-900 border-amber-200 shadow-amber-50",
    overdue: "bg-rose-500 text-white shadow-rose-100",
    draft: "bg-slate-100 text-slate-700 border-slate-200 shadow-slate-50",
  };

  const currentStyle = styles[normalizedStatus] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm border border-transparent transition-all",
        currentStyle,
        className
      )}
    >
      {normalizedStatus}
    </span>
  );
}
