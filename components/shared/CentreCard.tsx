'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { type CentreCardData, formatAgeRange } from '@/types/centre-card'

function FeeLabel({ min, max }: { min: number | null; max: number | null }) {
  if (min && max) return <span>R{min.toLocaleString()}&ndash;R{max.toLocaleString()}/month</span>
  if (min) return <span>From R{min.toLocaleString()}/month</span>
  return <span className="italic">Contact for fees</span>
}

function AgeChip({ min, max }: { min: number | null; max: number | null }) {
  const label = formatAgeRange(min, max)
  if (!label) return null
  return (
    <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
      {label}
    </span>
  )
}

function DsdBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      DSD
    </span>
  )
}

function VacancyPill({ status }: { status: 'limited' | 'full' }) {
  if (status === 'full') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
        Full
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Limited space
    </span>
  )
}

function PlaceholderThumb({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-teal-50">
      <span className="text-xl font-black text-teal-400">
        {(name.trim().charAt(0) || 'C').toUpperCase()}
      </span>
    </div>
  )
}

interface SharedCentreCardProps {
  centre: CentreCardData
}

export function SharedCentreCard({ centre }: SharedCentreCardProps) {
  const resolvedHero = getCentreHeroImage(centre.slug, centre.hero_image_url)
  const hasHero = Boolean(resolvedHero && !resolvedHero.startsWith('data:'))

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Link
        href={`/c/${centre.slug}`}
        className="flex flex-row items-stretch gap-3 rounded-xl border border-stone-100 bg-white px-3 py-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        {/* Thumbnail */}
        <div className="relative h-[80px] w-[80px] shrink-0 overflow-hidden rounded-lg bg-stone-100">
          {hasHero ? (
            <Image
              src={resolvedHero}
              alt={centre.name}
              fill
              loading="lazy"
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <PlaceholderThumb name={centre.name} />
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          {/* Name + location */}
          <div>
            <p className="line-clamp-2 text-sm font-medium leading-snug text-stone-900">
              {centre.name}
            </p>
            {(centre.suburb || centre.area) && (
              <p className="mt-0.5 truncate text-xs text-stone-500">
                {[centre.suburb, centre.area].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          {/* Fee */}
          <p className="mt-1 text-xs text-stone-700">
            <FeeLabel min={centre.fee_min} max={centre.fee_max} />
          </p>

          {/* Badges row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <AgeChip min={centre.age_min_months} max={centre.age_max_months} />
            {centre.is_dsd_registered && <DsdBadge />}
            {centre.vacancy_status && centre.vacancy_status !== 'available' && (
              <VacancyPill status={centre.vacancy_status} />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
