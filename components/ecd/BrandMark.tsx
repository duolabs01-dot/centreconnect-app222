import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type BrandMarkProps = {
  href?: string
  label?: string
  className?: string
  compact?: boolean
  hideLabelOnMobile?: boolean
}

export function BrandMark({
  href = '/',
  label = 'CentreConnect',
  className,
  compact = false,
  hideLabelOnMobile = false,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)}
    >
      <Image
        src="/centreconnect-logo.svg"
        alt={`${label} logo`}
        width={compact ? 56 : 72}
        height={compact ? 56 : 72}
        className="object-contain"
        priority
      />
      <span className={cn('font-semibold text-foreground', compact ? 'text-lg' : 'text-2xl', hideLabelOnMobile && 'hidden sm:inline')}>
        {label}
      </span>
    </Link>
  )
}
