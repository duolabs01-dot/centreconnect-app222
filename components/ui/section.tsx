import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionHeaderProps {
  emoji?: string;
  title: string;
  titleClass?: string;
  emojiSize?: string;
}

export function SectionHeader({
  emoji,
  title,
  titleClass = 'text-foreground',
  emojiSize = 'text-2xl',
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {!!emoji && <span className={emojiSize}>{emoji}</span>}
      <h2 className={cn('text-2xl font-bold', titleClass)}>{title}</h2>
    </div>
  );
}

interface SectionProps {
  id?: string;
  emoji?: string;
  title: string;
  className?: string;
  children: ReactNode;
}

export function Section({
  id,
  emoji,
  title,
  className,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn('mt-10 rounded-2xl border border-white/10 bg-white/95 p-6 shadow-[var(--shadow-elevation-4)]', className)}>
      <SectionHeader emoji={emoji} title={title} />
      <div className="mt-4 text-base text-foreground/80">{children}</div>
    </section>
  );
}