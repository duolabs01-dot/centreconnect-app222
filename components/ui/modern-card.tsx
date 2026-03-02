import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ModernCard({ children, className, onClick }: ModernCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "tile transform-gpu [will-change:transform] rounded-[2rem] border border-slate-50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-200",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
