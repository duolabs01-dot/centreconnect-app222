import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatChipProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
  accent?: 'teal' | 'default';
}

export function StatChip({ label, value, icon, className, accent = 'default' }: StatChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 min-w-[140px]",
        className
      )}
    >
      {icon && (
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl",
          accent === 'teal' ? "bg-[#065A82]/10 text-[#065A82]" : "bg-slate-50 text-slate-500"
        )}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

