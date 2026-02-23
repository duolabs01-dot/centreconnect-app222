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
      className={cn('inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500', className)}
    >
      <Image
        src="/Logo.jpeg"
        alt={`${label} logo`}
        width={compact ? 56 : 72}
        height={compact ? 56 : 72}
        className="rounded-md object-cover"
        priority
      />
      <span className={cn('font-semibold text-white', compact ? 'text-lg' : 'text-2xl', hideLabelOnMobile && 'hidden sm:inline')}>
        {label}
      </span>
    </Link>
  )
}
