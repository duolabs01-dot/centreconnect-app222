import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 100
  label: string;
  subLabel?: string;
  className?: string;
}

export function ProgressBar({ value, label, subLabel, className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {subLabel && <p className="text-xs font-medium text-slate-500">{subLabel}</p>}
        </div>
        <p className="text-sm font-black text-cyan-700">{percentage}%</p>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-700 to-blue-500 transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
