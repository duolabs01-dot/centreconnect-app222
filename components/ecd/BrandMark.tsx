import { LiteImage } from '@/components/ui/LiteImage' // Changed to LiteImage
import Link from 'next/link'
import { cn } from '@/lib/utils'

type BrandMarkProps = {
  href?: string
  label?: string
  className?: string
  compact?: boolean
  hideLabelOnMobile?: boolean
  hideLabel?: boolean
}

export function BrandMark({
  href = '/',
  label = 'CentreConnect',
  className,
  compact = false,
  hideLabelOnMobile = false,
  hideLabel = false,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)}
      aria-label={hideLabel ? label : undefined}
    >
      <LiteImage // Changed to LiteImage
        src="/centreconnect-logo.svg"
        alt={`${label} logo`}
        width={compact ? 56 : 72}
        height={compact ? 56 : 72}
        className="object-contain"
        priority
        sizes="(max-width: 768px) 56px, (max-width: 1200px) 72px, 72px"
      />
      <span
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-lg' : 'text-2xl',
          hideLabel ? 'sr-only' : hideLabelOnMobile ? 'hidden sm:inline' : ''
        )}
      >
        {label}
      </span>
    </Link>
  )
}
