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
        "tile rounded-[2rem] border border-slate-50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors duration-200",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
