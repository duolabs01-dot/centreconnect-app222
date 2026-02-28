import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionProps {
  id?: string;
  emoji?: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, emoji, title, children, className }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 space-y-4", className)}>
      <div className="flex items-center gap-3">
        {emoji && <span className="text-3xl">{emoji}</span>}
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      </div>
      <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
