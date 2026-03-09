'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Baby, Clock3, MapPin, ShieldCheck, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'

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
  tagline?: string
  capacity?: number
  subsidy_accepted?: boolean
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
  existingApplicationStatusLabel?: string | null
  is_claimed?: boolean
  is_registered?: boolean | null
  isPilot?: boolean
  isFeatured?: boolean
  contact_whatsapp?: string | null
  contact_phone?: string | null
  phone?: string | null
  viewerRole?: string | null
  isSaved?: boolean
  onApply?: () => void
}

function parseAgeValue(age: string) {
  const match = age.match(/(\d+)(?:\s*)([my])/i)
  if (!match) return Number.MAX_SAFE_INTEGER
  const value = Number(match[1])
  const unit = match[2]?.toLowerCase()
  return unit === 'y' ? value * 12 : value
}

function formatAgeSummary(ageGroups: string[]) {
  const clean = ageGroups.map((age) => age.trim()).filter(Boolean)
  if (clean.length === 0) return 'All ages'

  const ordered = [...clean].sort((a, b) => parseAgeValue(a) - parseAgeValue(b))
  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  if (first === last) return first.replace(/(\d+)([my])/gi, '$1 $2')
  return `${first.replace(/(\d+)([my])/gi, '$1 $2')} to ${last.replace(/(\d+)([my])/gi, '$1 $2')}`
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

function buildCentreWhatsappHref({
  centreName,
  centrePath,
  contactWhatsapp,
  contactPhone,
  phone,
}: {
  centreName: string
  centrePath: string
  contactWhatsapp?: string | null
  contactPhone?: string | null
  phone?: string | null
}) {
  const rawPhone = [contactWhatsapp, contactPhone, phone].find((value) => typeof value === 'string' && value.trim().length > 0)
  if (!rawPhone) return null

  const digits = rawPhone.replace(/[^\d]/g, '')
  if (!digits) return null

  let normalized = digits
  if (digits.startsWith('0')) normalized = `27${digits.slice(1)}`
  else if (!digits.startsWith('27') && rawPhone.startsWith('+')) normalized = digits

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://centreconnect.co.za').replace(/\/$/, '')
  const centreUrl = centrePath.startsWith('http') ? centrePath : `${baseUrl}${centrePath}`
  const message = `Hi ${centreName}! I found your crèche on CentreConnect. Your details are listed there, but your profile says you are not on CentreConnect yet. I would like to ask about fees and space. Here is the page I saw: ${centreUrl}`

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

function CentreFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#E7DDD1] bg-[#FFFCF7] p-3 shadow-[0_8px_18px_rgba(31,44,39,0.03)]">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FDF0E6] text-[#D4935A]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B827E]">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#22312E]">{value}</p>
        </div>
      </div>
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
  contact_whatsapp,
  contact_phone,
  phone,
  feesLabel,
  fees_display_mode,
  monthly_fee_min,
  monthly_fee_max,
  age_groups,
  tagline,
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
  const whatsappHref = !is_claimed
    ? buildCentreWhatsappHref({
        centreName: name,
        centrePath: detailHref,
        contactWhatsapp: contact_whatsapp,
        contactPhone: contact_phone,
        phone,
      })
    : null

  const feeSummary = formatFeeSummary({ feesLabel, fees_display_mode, monthly_fee_min, monthly_fee_max })
  const ageSummary = formatAgeSummary(age_groups)
  const locationSummary = formatLocation({ suburb, city, address })
  const trustSummary = is_registered
    ? subsidy_accepted
      ? 'Verified and subsidy friendly'
      : 'Verified by CentreConnect'
    : is_claimed
      ? 'Profile live'
      : 'Public listing only'
  const hoursSummary = 'Weekdays, Sat mornings'
  const primaryLabel = existingApplicationId ? formatExistingStatus(existingApplicationStatus) : 'Apply now'

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28 }}
      className="group h-full"
    >
      <Card className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-[#FFFDF9] shadow-[0_10px_28px_rgba(31,44,39,0.05)] transition-all duration-300 hover:shadow-[0_18px_44px_rgba(31,44,39,0.08)]",
        isFeatured ? "border-amber-400 ring-1 ring-amber-400/20" : "border-[#E8DDD0]"
      )}>
        <div className="absolute left-4 top-4 z-20">
          <SaveCentreButton centreId={id} initialSaved={isSaved} />
        </div>

        <Link href={detailHref} className="flex flex-1 flex-col focus-visible:outline-none">
          <div className="relative aspect-[16/11] overflow-hidden">
            <Image
              src={cover_image_url || 'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'}
              alt={name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#132320]/80 via-[#132320]/24 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <div className="flex items-end gap-3">
                {resolvedLogoUrl ? (
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-white/90 bg-white shadow-xl">
                    <Image
                      src={resolvedLogoUrl}
                      alt={`${name} logo`}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/90 bg-[#F5EFE6] text-lg font-black text-[#0D9488] shadow-xl">
                    {name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    {Boolean(is_registered) ? <PremiumVerifiedBadge compact label="Verified ECD" className="border-white/60 shadow-[0_12px_28px_rgba(108,71,0,0.26)]" /> : null}
                    {isFeatured ? (
                      <Badge className="flex items-center gap-1 border-amber-300/50 bg-amber-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm">
                        <ShieldCheck className="h-3 w-3" />
                        Recommended Partner
                      </Badge>
                    ) : isPilot ? (
                      <Badge className="border border-cyan-400/50 bg-cyan-900/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-50 shadow-none backdrop-blur-sm">
                        Pilot Partner
                      </Badge>
                    ) : null}
                    {!is_claimed ? (
                      <Badge className="border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-none backdrop-blur-sm">
                        Public listing
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-[1.35rem] leading-tight tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                    {name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {locationSummary}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col space-y-4 p-5">
            {tagline ? <p className="line-clamp-2 text-sm font-medium leading-6 text-[#5F6C68]">{tagline}</p> : null}

            <div className="grid grid-cols-2 gap-2.5">
              <CentreFact icon={Wallet} label="Fees" value={feeSummary} />
              <CentreFact icon={Baby} label="Ages" value={ageSummary} />
              <CentreFact icon={ShieldCheck} label="Trust" value={trustSummary} />
              <CentreFact icon={Clock3} label="Hours" value={hoursSummary} />
            </div>

            <div className="rounded-[1.1rem] border border-[#E7DDD1] bg-[#FAF8F4] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B827E]">Before you open</p>
              <p className="mt-1 text-sm font-semibold text-[#22312E]">Tap for photos, contact details, and application steps.</p>
            </div>
          </CardContent>
        </Link>

        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-[#E8DDD0] p-5 pt-4">
          {is_claimed ? (
            <Button
              type="button"
              onClick={handleApply}
              className="h-12 rounded-2xl bg-[#0D9488] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] transition-all hover:bg-[#0B857A] active:scale-95"
            >
              {primaryLabel}
            </Button>
          ) : null}

          {!is_claimed ? (
            <>
              {whatsappHref ? (
                <Button
                  asChild
                  type="button"
                  className="h-12 rounded-2xl bg-[#25D366] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,211,102,0.18)] transition-all hover:bg-[#1EB85A] active:scale-95"
                >
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    WhatsApp this crèche
                  </a>
                </Button>
              ) : (
                <div className="rounded-[1.1rem] border border-[#E7DDD1] bg-[#FAF8F4] px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-[#22312E]">This crèche is not on CentreConnect yet.</p>
                  <p className="mt-1 text-xs leading-5 text-[#6A7672]">Open the profile to see their details and ask about space directly.</p>
                </div>
              )}

              {showClaimLink ? (
                <p className="text-center text-xs font-medium leading-5 text-[#6A7672]">
                  Own this crèche?{' '}
                  <Link href={claimHref} className="font-semibold text-[#0D9488] hover:underline">
                    Claim it here →
                  </Link>
                </p>
              ) : (
                <p className="text-center text-xs font-medium leading-5 text-[#7B827E]">
                  Listed on CentreConnect so parents can find trusted local options faster.
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-xs font-medium leading-5 text-[#7B827E]">
              Tap the card to see photos, contact details, and what parents need to know.
            </p>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default CentreCard
