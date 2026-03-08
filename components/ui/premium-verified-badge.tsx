import { BadgeCheck, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type PremiumVerifiedBadgeProps = {
  label?: string
  compact?: boolean
  className?: string
}

export function PremiumVerifiedBadge({
  label = 'Verified ECD',
  compact = false,
  className,
}: PremiumVerifiedBadgeProps) {
  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 border border-[#DAB45A] bg-[linear-gradient(135deg,#FFF8DA_0%,#F6D57A_52%,#E0B44B_100%)] text-[#6C4700] shadow-[0_10px_22px_rgba(212,147,90,0.18)]',
        compact ? 'px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]' : 'px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]',
        className
      )}
    >
      <BadgeCheck className={cn('shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      <span>{label}</span>
      <Sparkles className={cn('shrink-0 text-[#8F6200]', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
    </Badge>
  )
}

