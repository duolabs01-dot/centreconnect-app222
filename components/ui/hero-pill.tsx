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
        "inline-flex items-center rounded-full bg-teal-100 px-4 py-1.5 text-sm font-medium text-teal-800 border border-teal-200 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
