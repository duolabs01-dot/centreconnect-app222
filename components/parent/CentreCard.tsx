'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Baby, Eye, MapPin, ShieldCheck, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { formatAgeRangeSummary } from '@/lib/ecd/age-groups'
import { type CentreOperatingSchedule } from '@/lib/time/centre-operating-schedule'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'

type FeeDisplayMode = 'exact' | 'range' | 'contact' | null | undefined

interface CentreCardProps {
  id: string
  slug?: string
  name: string
  image?: string
  cover_image_url?: string
  logo_url?: string
  suburb?: string
  city?: string
  address?: string
  distance?: string
  distanceLabel?: string
  rating?: number
  fees?: string
  feesLabel?: string
  fees_display_mode?: FeeDisplayMode
  monthly_fee_min?: number | null
  monthly_fee_max?: number | null
  age_groups: string[]
  tagline?: string | null
  capacity?: number
  subsidy_accepted?: boolean
  registration_fee?: number | null
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
  existingApplicationStatusLabel?: string | null
  is_claimed?: boolean
  is_registered?: boolean | null
  isPilot?: boolean
  isFeatured?: boolean
  operating_schedule?: CentreOperatingSchedule | null
  operating_hours_summary?: string | null
  communication_automation_settings?: unknown
  viewerRole?: string | null
  isSaved?: boolean
  onApply?: () => void
}

function formatAgeSummary(ageGroups: string[] | null | undefined) {
  return formatAgeRangeSummary(ageGroups, 'All ages')
}

function formatFeeSummary({
  feesLabel,
  fees_display_mode,
  monthly_fee_min,
  monthly_fee_max,
}: {
  feesLabel?: string
  fees_display_mode?: FeeDisplayMode
  monthly_fee_min?: number | null
  monthly_fee_max?: number | null
}) {
  if (feesLabel?.trim()) return feesLabel.trim()
  if (fees_display_mode === 'exact' && monthly_fee_min) return `From R${monthly_fee_min}`
  if (fees_display_mode === 'range' && monthly_fee_min && monthly_fee_max) return `R${monthly_fee_min} - R${monthly_fee_max}`
  return 'Ask for fees'
}

function formatLocation({ suburb, city, address }: { suburb?: string; city?: string; address?: string }) {
  const area = [suburb, city].map((value) => value?.trim()).filter(Boolean).join(', ')
  return area || address || 'Johannesburg'
}

function formatExistingStatus(status?: string | null) {
  if (!status) return 'View application'
  return status
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function CompactMetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet
  label: string
  value: string
}) {
  return (
    <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[#E7DDD1] bg-[#FFFCF7] px-2.5 py-1.5 text-[#22312E]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#D4935A]" />
      <span className="text-[10px] font-medium text-[#7B827E]">{label}</span>
      <span className="truncate text-[12px] font-semibold leading-4 text-[#22312E]">{value}</span>
    </div>
  )
}

export function CentreCard({
  id,
  slug,
  cover_image_url,
  logo_url,
  suburb,
  city,
  address,
  distanceLabel,
  feesLabel,
  fees_display_mode,
  monthly_fee_min,
  monthly_fee_max,
  age_groups,
  subsidy_accepted = false,
  existingApplicationId,
  existingApplicationStatus,
  is_claimed = true,
  is_registered = false,
  isPilot = false,
  isFeatured = false,
  viewerRole = null,
  isSaved = false,
  name,
  onApply,
}: CentreCardProps) {
  const router = useRouter()

  const detailHref = id.startsWith('centre-')
    ? `/directory?search=${encodeURIComponent(name)}`
    : slug
      ? `/c/${encodeURIComponent(slug)}`
      : '/directory'
  const claimHref = `/for-centres/register?flow=confirm&claim=${encodeURIComponent(slug ?? id)}`
  const showClaimLink = !is_claimed && viewerRole !== 'parent_user'

  const feeSummary = formatFeeSummary({ feesLabel, fees_display_mode, monthly_fee_min, monthly_fee_max })
  const ageSummary = formatAgeSummary(age_groups)
  const locationSummary = formatLocation({ suburb, city, address })
  const hasRealCoverImage = typeof cover_image_url === 'string' && cover_image_url.trim().length > 0
  const usesPreviewImage = !hasRealCoverImage
  const previewImageSrc = buildCentrePreviewImage({ name, suburb, isClaimed: is_claimed })
  const heroImageSrc = hasRealCoverImage ? cover_image_url.trim() : previewImageSrc
  const isVerifiedForParents = Boolean(is_claimed && is_registered)
  const primaryLabel = existingApplicationId ? formatExistingStatus(existingApplicationStatus) : 'Apply online'

  const handleApply = () => {
    if (existingApplicationId) {
      router.push(`/parent/applications/${existingApplicationId}`)
      return
    }

    if (onApply) {
      onApply()
      return
    }

    if (id.startsWith('centre-')) {
      router.push('/directory')
      return
    }

    const identifier = slug ? encodeURIComponent(slug) : id
    router.push(`/apply/${identifier}`)
  }

  const resolvedLogoUrl = logo_url
    ? logo_url
    : (slug === 'bajabulile' || slug === 'bajabulile-day-care-centre')
      ? '/centres/bajabulile/logo.jpg'
      : null

  const compactMeta = [
    { key: 'fees', icon: Wallet, label: 'Fees', value: feeSummary },
    { key: 'ages', icon: Baby, label: 'Ages', value: ageSummary },
    ...(distanceLabel?.trim()
      ? [{ key: 'distance', icon: MapPin, label: 'Distance', value: distanceLabel.trim() }]
      : []),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28 }}
      className="group h-full"
    >
      <Card
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-[#FFFDF9] shadow-[0_10px_28px_rgba(31,44,39,0.05)] transition-all duration-300 hover:shadow-[0_18px_44px_rgba(31,44,39,0.08)]',
          isFeatured ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-[#E8DDD0]'
        )}
      >
        <div className="absolute right-4 top-4 z-20">
          <SaveCentreButton centreId={id} initialSaved={isSaved} />
        </div>

        <Link href={detailHref} className="flex flex-1 flex-col focus-visible:outline-none">
          <div className="relative aspect-[16/6.2] overflow-hidden bg-[#F4ECE2]">
            <Image
              src={heroImageSrc}
              alt={usesPreviewImage ? `${name} preview image` : name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={usesPreviewImage}
            />

          </div>

          <CardContent className="flex flex-1 flex-col space-y-2.5 px-4 pb-4 pt-3">
            <div className="relative min-h-[3.15rem] pl-[4.15rem]">
              <div className="absolute left-0 top-[-1.9rem]">
                {resolvedLogoUrl ? (
                  <div className="h-12 w-12 overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-[0_10px_24px_rgba(31,44,39,0.12)]">
                    <Image
                      src={resolvedLogoUrl}
                      alt={`${name} logo`}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-[3px] border-white bg-[#F5EFE6] text-base font-black text-[#0D9488] shadow-[0_10px_24px_rgba(31,44,39,0.12)]">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3
                  className="line-clamp-2 text-[1rem] font-bold leading-[1.12] tracking-[-0.02em] text-[#22312E] sm:text-[1.05rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7B827E]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{locationSummary}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {isVerifiedForParents ? <PremiumVerifiedBadge compact className="border-[#F3E3B3] bg-[#FFF8DA] text-[#6C4700]" /> : null}
              {isFeatured ? (
                <Badge className="flex items-center gap-1 border-amber-100 bg-amber-50/70 px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-amber-700/90 shadow-none">
                  <ShieldCheck className="h-3 w-3" />
                  Recommended
                </Badge>
              ) : isPilot ? (
                <Badge className="border border-cyan-200 bg-cyan-50/80 px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-cyan-700 shadow-none">
                  Pilot Partner
                </Badge>
              ) : null}
              {subsidy_accepted ? (
                <Badge className="border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-emerald-700 shadow-none">
                  Subsidy friendly
                </Badge>
              ) : null}
              {!is_claimed ? (
                <Badge className="border border-amber-200 bg-[#FFF6E8] px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-[#9A5A10] shadow-none">
                  Not yet on CentreConnect
                </Badge>
              ) : usesPreviewImage ? (
                <Badge className="border border-[#E7DDD1] bg-[#FAF8F4] px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-[#6A7672] shadow-none">
                  Preview image
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {compactMeta.map((item) => (
                <CompactMetaItem key={item.key} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </div>
          </CardContent>
        </Link>

        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-[#E8DDD0] px-4 pb-4 pt-3">
          {is_claimed ? (
            <>
              <Button
                type="button"
                onClick={handleApply}
                className="h-12 rounded-2xl bg-[#0D9488] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] transition-all hover:bg-[#0B857A] active:scale-95"
              >
                <span>{primaryLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link
                href={detailHref}
                className="text-center text-[11px] font-semibold tracking-[0.08em] text-[#0D9488] transition-colors hover:text-[#0B857A]"
              >
                View details
              </Link>
            </>
          ) : null}

          {!is_claimed ? (
            <>
              <Button
                asChild
                type="button"
                className="h-12 rounded-2xl bg-[#1F4B42] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(31,75,66,0.18)] transition-all hover:bg-[#193D36] active:scale-95"
              >
                <Link href={detailHref}>
                  View details
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <div className="rounded-[1.1rem] border border-[#E7DDD1] bg-[#FAF8F4] px-4 py-3 text-center">
                <p className="text-sm font-semibold text-[#22312E]">This creche is not on CentreConnect yet.</p>
                <p className="mt-1 text-xs leading-5 text-[#6A7672]">Open the profile to see fees, distance, and the centre details while digital applications are still offline.</p>
              </div>

              {showClaimLink ? (
                <p className="text-center text-xs font-medium leading-5 text-[#6A7672]">
                  Own this creche?{' '}
                  <Link href={claimHref} className="font-semibold text-[#0D9488] hover:underline">
                    Claim it here →
                  </Link>
                </p>
              ) : (
                <p className="text-center text-xs font-medium leading-5 text-[#7B827E]">
                  Listed on CentreConnect so parents can compare local options before the centre finishes onboarding.
                </p>
              )}
            </>
          ) : null}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default CentreCard


