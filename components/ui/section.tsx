// components/ui/section.tsx
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Sparkles } from "lucide-react"; // Example icon if emoji is not set

interface SectionProps {
  id?: string;
  emoji?: string; // Optional emoji string
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, emoji, title, children, className }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20 mt-10 p-6 rounded-2xl border border-gray-100 bg-white shadow-lg", className)}>
      <div className="flex items-center gap-3 mb-6">
        {emoji ? (
          <span className="text-3xl">{emoji}</span>
        ) : (
          // Default icon if no emoji is provided, matching teal accent
          <Sparkles className="h-8 w-8 text-teal-500" />
        )}
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
      </div>
      <div className="prose prose-slate max-w-none">
        {children}
      </div>
    </section>
  );
}
