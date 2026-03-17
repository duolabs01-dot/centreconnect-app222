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
        "inline-flex items-center rounded-full bg-cyan-700/10 px-4 py-1.5 text-xs font-bold text-cyan-700 uppercase tracking-widest border border-cyan-700/20 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
