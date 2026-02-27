import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatChipProps {
  label: string;
  value: string | number;
  icon?: ReactNode; // Made optional as per original usage in page.tsx
  accent?: 'emerald'; // Kept from page.tsx usage
}

export function StatChip({ label, value, icon, accent }: StatChipProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center min-w-[120px] text-center", // Kept from original page.tsx usage
      )}
    >
      <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</span>
      <span
        className={cn(
          'mt-1 text-sm font-semibold whitespace-nowrap',
          accent === 'emerald' ? 'text-emerald-600' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}