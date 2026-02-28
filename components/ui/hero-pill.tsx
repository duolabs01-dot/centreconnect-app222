import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HeroPillProps {
  children: ReactNode;
  className?: string;
}

export function HeroPill({ children, className }: HeroPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-[#065A82]/10 px-4 py-1.5 text-xs font-bold text-[#065A82] uppercase tracking-widest border border-[#065A82]/20 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
