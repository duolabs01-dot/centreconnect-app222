import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type AiSuggestedBadgeProps = {
  confidence?: number
  className?: string
}

export function AiSuggestedBadge({ confidence, className }: AiSuggestedBadgeProps) {
  if (!confidence || confidence <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700',
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      AI suggested {confidence}%
    </span>
  )
}

