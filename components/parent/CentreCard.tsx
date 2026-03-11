'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Baby, MapPin, MessageCircle, Phone, ShieldCheck, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { GovernmentRegisteredBadge, PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { formatAgeRangeSummary } from '@/lib/ecd/age-groups'
import { type CentreOperatingSchedule } from '@/lib/time/centre-operating-schedule'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'
import { ContactCentreSheet } from '@/components/public/ContactCentreSheet'

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
  contact_whatsapp?: string | null
  contact_phone?: string | null
  phone?: string | null
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

function normalizePhoneNumber(phone?: string | null) {
  const digits = (phone ?? '').replace(/[^\d]/g, '')
  return digits.length > 0 ? digits : null
}

function buildWhatsappHref(phone?: string | null, centreName?: string) {
  const digits = normalizePhoneNumber(phone)
  if (!digits) return null
  const message = centreName
    ? `Hi ${centreName}, I would like to ask about space for my child.`
    : 'Hi, I would like to ask about space for my child.'
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function buildCallHref(phone?: string | null) {
  const digits = normalizePhoneNumber(phone)
  return digits ? `tel:${digits}` : null
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
  contact_whatsapp,
  contact_phone,
  phone,
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

  const feeSummary = formatFeeSummary({ feesLabel, fees_display_mode, monthly_fee_min, monthly_fee_max })
  const ageSummary = formatAgeSummary(age_groups)
  const locationSummary = formatLocation({ suburb, city, address })
  const hasRealCoverImage = typeof cover_image_url === 'string' && cover_image_url.trim().length > 0
  const usesPreviewImage = !hasRealCoverImage
  const previewImageSrc = buildCentrePreviewImage({ name, suburb, isClaimed: is_claimed })
  const heroImageSrc = hasRealCoverImage ? cover_image_url.trim() : previewImageSrc
  const isOnCentreConnect = Boolean(is_claimed)
  const isVerifiedForParents = Boolean(is_claimed && is_registered)
  const primaryLabel = existingApplicationId ? formatExistingStatus(existingApplicationStatus) : 'Apply online'
  const whatsappHref = buildWhatsappHref(contact_whatsapp ?? contact_phone ?? phone, name)
  const callHref = buildCallHref(contact_phone ?? phone ?? contact_whatsapp)
  const publicPrimaryHref = whatsappHref ?? callHref ?? detailHref
  const publicPrimaryLabel = whatsappHref ? 'WhatsApp centre' : callHref ? 'Call centre' : 'View details'
  const publicSecondaryHref = whatsappHref && callHref ? callHref : detailHref
  const publicSecondaryLabel = whatsappHref && callHref ? 'Call centre' : 'View details'
  const claimHref = slug ? `/for-centres/register?flow=confirm&claim=${encodeURIComponent(slug)}` : null
  const showClaimLink = !is_claimed && viewerRole !== 'parent_user' && Boolean(claimHref)

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
  const showRecommendedChip = !isVerifiedForParents && isFeatured
  const showPilotChip = !isVerifiedForParents && !isFeatured && isPilot
  const inquiryTemplates = [
    { label: 'Ask about space', message: `Hi ${name}, do you still have space for my child?` },
    { label: 'Ask about fees', message: `Hi ${name}, please share your fees and what is included.` },
    { label: 'Ask for a visit', message: `Hi ${name}, I would like to visit before I decide.` },
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
          <div className="relative aspect-[16/5.9] overflow-hidden bg-[#F4ECE2]">
            <Image
              src={heroImageSrc}
              alt={usesPreviewImage ? `${name} preview image` : name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={usesPreviewImage}
            />

          </div>

          <CardContent className="flex flex-1 flex-col gap-2.5 px-4 pb-3.5 pt-3.5">
            <div className="flex items-start gap-3">
              {resolvedLogoUrl ? (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_10px_24px_rgba(31,44,39,0.12)]">
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
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white bg-[#F5EFE6] text-base font-black text-[#0D9488] shadow-[0_10px_24px_rgba(31,44,39,0.12)]">
                  {name.charAt(0)}
                </div>
              )}

              <div className="min-w-0 flex-1 pt-0.5">
                <h3
                  className="line-clamp-2 text-[1rem] font-bold leading-[1.12] tracking-[-0.02em] text-[#22312E] sm:text-[1.05rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7B827E]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{locationSummary}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {isOnCentreConnect ? <PremiumVerifiedBadge compact label="On CentreConnect" className="border-[#F3E3B3] bg-[#FFF8DA] text-[#6C4700]" /> : null}
              {isVerifiedForParents ? <GovernmentRegisteredBadge compact /> : null}
              {showRecommendedChip ? (
                <Badge className="flex items-center gap-1 border-amber-100 bg-amber-50/70 px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-amber-700/90 shadow-none">
                  <ShieldCheck className="h-3 w-3" />
                  Recommended
                </Badge>
              ) : showPilotChip ? (
                <Badge className="border border-cyan-200 bg-cyan-50/80 px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-cyan-700 shadow-none">
                  Pilot Partner
                </Badge>
              ) : null}
              {is_claimed ? (
                <Badge className="border border-[#DCEEE8] bg-[#F4FBF8] px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-[#0D9488] shadow-none">
                  Apply now
                </Badge>
              ) : (
                <Badge className="border border-[#E7DDD1] bg-[#FAF8F4] px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] text-[#6A7672] shadow-none">
                  Public listing
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {compactMeta.map((item) => (
                <CompactMetaItem key={item.key} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </div>

            <p className="text-[12px] leading-5 text-[#4E5D59]">
              {is_claimed ? 'Apply online or message the centre in the app.' : 'Call or WhatsApp the centre if you want to act now.'}
            </p>
          </CardContent>
        </Link>

        <CardFooter className="flex flex-col items-stretch gap-2.5 border-t border-[#E8DDD0] px-4 pb-4 pt-3">
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
              <ContactCentreSheet
                centreId={id}
                centreName={name}
                templates={inquiryTemplates}
                triggerLabel="Message Centre"
                triggerClassName="h-11 rounded-2xl border-[#CDE7E0] bg-white text-sm font-semibold text-[#1F4B42] transition-all hover:border-[#A7D8CC] hover:bg-[#F7FCFA]"
                title={`Message ${name}`}
                description="Send a quick question without leaving the directory. Replies stay inside CentreConnect so your next step stays clear."
              />

            </>
          ) : null}

          {!is_claimed ? (
            <>
              <Button
                asChild
                type="button"
                className="h-12 rounded-2xl bg-[#1F4B42] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(31,75,66,0.18)] transition-all hover:bg-[#193D36] active:scale-95"
              >
                <Link href={publicPrimaryHref} target={publicPrimaryHref === detailHref ? undefined : '_blank'} rel={publicPrimaryHref === detailHref ? undefined : 'noopener noreferrer'}>
                  {publicPrimaryLabel}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-[#DDD5C8] bg-white text-sm font-semibold text-[#4E5D59] transition-all hover:bg-[#FAF8F4]"
              >
                <Link href={publicSecondaryHref} target={publicSecondaryHref === detailHref ? undefined : '_blank'} rel={publicSecondaryHref === detailHref ? undefined : 'noopener noreferrer'}>
                  {publicSecondaryLabel === 'Call centre' ? <Phone className="h-4 w-4" /> : null}
                  {publicSecondaryLabel}
                </Link>
              </Button>
              <p className="text-center text-[11px] font-medium leading-5 text-[#7B827E]">
                Public listing only. Contact the centre directly for space and next steps.
              </p>
              {showClaimLink ? (
                <Link href={claimHref!} className="text-center text-[11px] font-semibold leading-5 text-[#0D9488] hover:underline">
                  Do you run this creche? Claim it
                </Link>
              ) : null}
            </>
          ) : null}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default CentreCard



