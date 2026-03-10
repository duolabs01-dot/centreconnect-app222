import { BadgeCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type PremiumVerifiedBadgeProps = {
  label?: string
  compact?: boolean
  className?: string
}

export function PremiumVerifiedBadge({
  label = 'Verified',
  compact = false,
  className,
}: PremiumVerifiedBadgeProps) {
  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 border border-[#E7DDD1] bg-[#FFF8DA] text-[#6C4700] shadow-none',
        compact ? 'px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]' : 'px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]',
        className
      )}
    >
      <BadgeCheck className={cn('shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      <span>{label}</span>
    </Badge>
  )
}

