'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, MapPin, Check, Phone, ArrowRight, ShieldCheck } from 'lucide-react'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'
import { type CentreCardData, formatAgeRange } from '@/types/centre-card'
import { cn } from '@/lib/utils'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'

// ─── Age group helpers ──────────────────────────────────────────────────────

type AgeCategory = 'babies' | 'toddlers' | 'preschool' | 'aftercare' | 'dsd'

function deriveAgeCategories(data: CentreCardData): AgeCategory[] {
  const cats = new Set<AgeCategory>()

  if (data.is_dsd_registered) cats.add('dsd')

  // Prefer raw age_groups strings for accurate labelling
  if (data.age_groups && data.age_groups.length > 0) {
    for (const g of data.age_groups) {
      const lower = g.toLowerCase()
      if (lower.includes('infant') || lower.includes('baby') || lower.includes('babies') ||
          lower.includes('0-1') || lower.includes('0 – 1') || (lower.includes('month') && !lower.includes('year'))) {
        cats.add('babies')
      } else if (lower.includes('toddler') || lower.includes('1-3') || lower.includes('1 – 3') ||
                 lower.includes('2-4') || lower.includes('2 – 4')) {
        cats.add('toddlers')
      } else if (lower.includes('pre') || lower.includes('preschool') || lower.includes('pre-school') ||
                 lower.includes('3-6') || lower.includes('3 – 6') || lower.includes('4-6') || lower.includes('2-6')) {
        cats.add('preschool')
      } else if (lower.includes('after') || lower.includes('grade') || lower.includes('school-age')) {
        cats.add('aftercare')
      } else {
        // Fall back to raw month ranges
        const { age_min_months: min, age_max_months: max } = data
        if (min !== null && min <= 12) cats.add('babies')
        if ((min !== null && min >= 12 && min <= 36) || (max !== null && max >= 12 && max <= 48)) cats.add('toddlers')
        if (max !== null && max >= 36) cats.add('preschool')
      }
    }
  } else {
    // Derive from months
    const { age_min_months: min, age_max_months: max } = data
    if (min !== null && min <= 12) cats.add('babies')
    if ((min !== null && min >= 12 && min <= 36) || (max !== null && max >= 12 && max <= 48)) cats.add('toddlers')
    if (max !== null && max >= 36) cats.add('preschool')
    if (max !== null && max > 72) cats.add('aftercare')
  }

  // Enforce display order
  const order: AgeCategory[] = ['dsd', 'babies', 'toddlers', 'preschool', 'aftercare']
  return order.filter(c => cats.has(c))
}

const AGE_BADGE_STYLES: Record<AgeCategory, { label: string; className: string }> = {
  dsd:       { label: 'DSD Registered', className: 'bg-sky-50 text-[#0369A1] border border-sky-100' },
  babies:    { label: 'Babies',         className: 'bg-rose-50 text-[#BE123C] border border-rose-100' },
  toddlers:  { label: 'Toddlers',       className: 'bg-amber-50 text-[#B45309] border border-amber-100' },
  preschool: { label: 'Pre-school',     className: 'bg-purple-50 text-[#7C3AED] border border-purple-100' },
  aftercare: { label: 'Aftercare',      className: 'bg-green-50 text-[#15803D] border border-green-100' },
}

// ─── WhatsApp icon ───────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

// ─── Fee label ───────────────────────────────────────────────────────────────

function FeeLabel({ min, max, compact }: { min: number | null; max: number | null; compact?: boolean }) {
  const suffix = compact ? '/mo' : '/month'
  if (min && max) {
    return (
      <span>
        <span className="font-bold text-slate-800">R{min.toLocaleString()}&nbsp;&ndash;&nbsp;R{max.toLocaleString()}</span>
        <span className="text-slate-500">{suffix}</span>
      </span>
    )
  }
  if (min) return <span><span className="font-bold text-slate-800">From&nbsp;R{min.toLocaleString()}</span><span className="text-slate-500">{suffix}</span></span>
  return <span className="italic text-slate-400">Contact for fees</span>
}

// ─── Shared image / gradient resolver ────────────────────────────────────────

function resolveHeroSrc(data: CentreCardData): string {
  const fromHero = getCentreHeroImage(data.slug, data.hero_image_url)
  if (fromHero && !fromHero.startsWith('data:')) return fromHero
  return buildCentrePreviewImage({ name: data.name, suburb: data.suburb, isClaimed: data.is_claimed })
}

function isRealPhoto(src: string) {
  return !src.startsWith('data:')
}

// ─── LogoBubble ───────────────────────────────────────────────────────────────

function LogoBubble({ data, size = 44 }: { data: CentreCardData; size?: number }) {
  const s = size
  if (data.logo_url) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border-[3px] border-white bg-white shadow-md ring-2 ring-white/90"
        style={{ width: s, height: s, flexShrink: 0 }}
      >
        <Image src={data.logo_url} alt={data.name} fill className="object-cover" sizes={`${s}px`} />
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-xl border-[3px] border-white bg-gradient-to-br from-teal-600 to-cyan-600 text-white font-black shadow-md ring-2 ring-white/90"
      style={{ width: s, height: s, fontSize: s * 0.38, flexShrink: 0 }}
    >
      {(data.name.trim().charAt(0) || 'C').toUpperCase()}
    </div>
  )
}

// ─── HeartButton ─────────────────────────────────────────────────────────────

function HeartButton({ isSaved, onToggle, size = 32 }: { isSaved: boolean; onToggle: (e: React.MouseEvent) => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isSaved ? 'Remove from shortlist' : 'Save to shortlist'}
      className={cn(
        'flex items-center justify-center rounded-full backdrop-blur-md shadow transition-colors',
        isSaved
          ? 'bg-rose-50 text-rose-500'
          : 'bg-white/85 text-slate-400 hover:text-rose-400'
      )}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <Heart className={cn('transition-all', isSaved && 'fill-rose-500')} style={{ width: size * 0.5, height: size * 0.5 }} />
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SharedCentreCardProps {
  centre: CentreCardData
  variant?: 'full' | 'compact'
  onSave?: (centreId: string) => void
  isSaved?: boolean
}

// ─── FULL CARD ────────────────────────────────────────────────────────────────

function FullCard({ centre, onSave, isSaved = false }: Omit<SharedCentreCardProps, 'variant'>) {
  const heroSrc = resolveHeroSrc(centre)
  const hasRealPhoto = isRealPhoto(heroSrc)
  const ageCategories = deriveAgeCategories(centre)
  const isPromoted = Boolean(centre.is_pilot || centre.is_featured)
  const showClaimLink = !centre.is_claimed && centre.viewer_role !== null && centre.viewer_role !== 'parent_user'

  function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onSave?.(centre.id)
  }

  const applyHref = `/c/${centre.slug}`

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'bg-white rounded-2xl overflow-hidden shadow-sm border',
        centre.is_claimed ? 'border-slate-100' : 'border-slate-200 opacity-90'
      )}
    >
      {/* Hero */}
      <div className={cn('relative h-[140px] overflow-hidden rounded-t-2xl', !centre.is_claimed && 'grayscale-[20%]')}>
        {hasRealPhoto ? (
          <Image
            src={heroSrc}
            alt={centre.name}
            fill
            loading="lazy"
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <Image
            src={heroSrc}
            alt={centre.name}
            fill
            loading="lazy"
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        )}
        {/* Gradient overlay — covers bottom 70% */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" style={{ top: '30%' }} />

        {/* Top-left: status badge */}
        <div className="absolute left-2.5 top-2.5 z-10">
          {centre.is_claimed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-green-600 backdrop-blur-sm shadow-sm">
              <Check className="h-3 w-3" />
              Free to apply
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/75 px-2.5 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-sm shadow-sm">
              Not on CentreConnect yet
            </span>
          )}
        </div>

        {/* Top-right: Heart save button */}
        <div className="absolute right-2.5 top-2.5 z-10">
          {onSave ? (
            <HeartButton isSaved={isSaved} onToggle={handleSave} size={32} />
          ) : (
            <SaveCentreButton centreId={centre.id} initialSaved={isSaved} />
          )}
        </div>

        {/* Bottom-left: Logo bubble — overlaps into body */}
        <div className="absolute bottom-0 left-3.5 z-10 translate-y-1/2">
          <LogoBubble data={centre} size={44} />
        </div>
      </div>

      {/* Body */}
      <Link href={applyHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-b-2xl">
        <div className="px-4 pb-3.5 pt-[26px]">
          {/* Name */}
          <p className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-800">
            {centre.name}
          </p>

          {/* Suburb + area */}
          {(centre.suburb || centre.area) && (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{[centre.suburb, centre.area].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {isPromoted ? (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                <ShieldCheck className="h-3 w-3" />
                Promoted
              </span>
            </div>
          ) : null}

          {/* Stats row */}
          <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-600">
            <span>
              <FeeLabel min={centre.fee_min} max={centre.fee_max} />
            </span>
            {(centre.age_min_months !== null || centre.age_max_months !== null) && (
              <span className="text-slate-500">{formatAgeRange(centre.age_min_months, centre.age_max_months)}</span>
            )}
          </div>

          {/* Age category badges */}
          {ageCategories.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ageCategories.map(cat => (
                <span
                  key={cat}
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    AGE_BADGE_STYLES[cat].className
                  )}
                >
                  {AGE_BADGE_STYLES[cat].label}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3.5 flex gap-2">
            {centre.is_claimed ? (
              <>
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-teal-600 py-2.5 text-[13px] font-semibold text-white">
                  <Check className="h-3.5 w-3.5" />
                  Apply free
                </span>
                {centre.contact_whatsapp && (
                  <a
                    href={`https://wa.me/${centre.contact_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center rounded-[10px] bg-[#E8F5E8] px-3.5 text-[#1B8B2D]"
                    aria-label="WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </a>
                )}
              </>
            ) : (
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-slate-600 py-2.5 text-[13px] font-semibold text-white">
                <Phone className="h-3.5 w-3.5" />
                Call or WhatsApp
              </span>
            )}
          </div>
        </div>

        {/* Trust line */}
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[10.5px] text-slate-400">
            {centre.is_claimed
              ? '\u{1F6E1}\uFE0F No registration fee \u00B7 Apply free and hear back directly'
              : '\u{1F4DE} Call or WhatsApp the cr\u00E8che to ask about space'}
          </p>
        </div>
      </Link>

      {/* Unclaimed: claim listing link — outside the main Link to avoid nested <a> */}
      {!centre.is_claimed && showClaimLink && (
        <div className="px-4 pb-3">
          <a
            href="/ecd/claim"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-600 transition-colors"
          >
            Are you the owner? Claim this listing
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </motion.div>
  )
}

// ─── COMPACT CARD ─────────────────────────────────────────────────────────────

function CompactCard({ centre, onSave, isSaved = false }: Omit<SharedCentreCardProps, 'variant'>) {
  const heroSrc = resolveHeroSrc(centre)
  const hasRealPhoto = isRealPhoto(heroSrc)
  const ageCategories = deriveAgeCategories(centre)
  const isPromoted = Boolean(centre.is_pilot || centre.is_featured)
  const showClaimLink = !centre.is_claimed && centre.viewer_role !== null && centre.viewer_role !== 'parent_user'

  function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onSave?.(centre.id)
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(!centre.is_claimed && 'opacity-90')}
    >
      <Link
        href={`/c/${centre.slug}`}
        className={cn(
          'flex min-h-[108px] overflow-hidden rounded-[10px] border bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
          centre.is_claimed ? 'border-stone-100' : 'border-slate-200'
        )}
      >
        {/* Image block */}
        <div className="relative w-[100px] shrink-0 overflow-hidden">
          {hasRealPhoto ? (
            <Image
              src={heroSrc}
              alt={centre.name}
              fill
              loading="lazy"
              className="object-cover"
              sizes="100px"
            />
          ) : (
            <Image
              src={heroSrc}
              alt={centre.name}
              fill
              loading="lazy"
              className="object-cover"
              sizes="100px"
              unoptimized
            />
          )}
          {/* Heart button */}
          <div className="absolute left-1.5 top-1.5 z-10">
            {onSave ? (
              <HeartButton isSaved={isSaved} onToggle={handleSave} size={26} />
            ) : (
              <SaveCentreButton centreId={centre.id} initialSaved={isSaved} />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-between p-2.5 min-w-0">
          {/* Top section */}
          <div>
            <p className="line-clamp-2 text-[13.5px] font-bold leading-snug text-stone-900">
              {centre.name}
            </p>
            {(centre.suburb || centre.area) && (
              <p className="mt-0.5 truncate text-[11px] text-stone-500">
                {[centre.suburb, centre.area].filter(Boolean).join(', ')}
                {centre.is_dsd_registered && (
                  <span className="ml-1 text-[#0369A1]">&middot; DSD</span>
                )}
              </p>
            )}
            {isPromoted ? (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Promoted
                </span>
              </div>
            ) : null}
            {ageCategories.filter(c => c !== 'dsd').length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {ageCategories.filter(c => c !== 'dsd').map(cat => (
                  <span
                    key={cat}
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                      AGE_BADGE_STYLES[cat].className
                    )}
                  >
                    {AGE_BADGE_STYLES[cat].label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: fee + CTA */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] text-stone-600 truncate">
              <FeeLabel min={centre.fee_min} max={centre.fee_max} compact />
            </span>
            <span className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white',
              centre.is_claimed ? 'bg-teal-600' : 'bg-slate-600'
            )}>
              {centre.is_claimed ? 'Apply free' : 'Call'}
            </span>
          </div>
        </div>
      </Link>

      {/* Unclaimed: claim link — outside Link to avoid nested <a> */}
      {!centre.is_claimed && showClaimLink && (
        <a
          href="/ecd/claim"
          className="mt-1 inline-flex items-center gap-1 px-1 text-[10.5px] text-slate-400 hover:text-teal-600 transition-colors"
        >
          Are you the owner? Claim this listing
          <ArrowRight className="h-3 w-3" />
        </a>
      )}
    </motion.div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

export function SharedCentreCard({ centre, variant = 'compact', onSave, isSaved }: SharedCentreCardProps) {
  if (variant === 'full') {
    return <FullCard centre={centre} onSave={onSave} isSaved={isSaved ?? centre.is_saved ?? false} />
  }
  return <CompactCard centre={centre} onSave={onSave} isSaved={isSaved ?? centre.is_saved ?? false} />
}
