import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Baby, BookOpenCheck, CheckCircle2, Circle, Clock3, ExternalLink, MapPin, MessageCircle, Phone, ShieldCheck, Users, Wallet } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout/container'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { ContactCentreSheet } from '@/components/public/ContactCentreSheet'
import { CentreContactCard } from '@/components/public/CentreContactCard'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { getCentreOperationalStatus } from '@/lib/time/centre-operational-status'
import {
  buildDefaultOperatingSchedule,
  getOperatingScheduleSummary,
  readOperatingHoursSummaryFromSettings,
  readOperatingScheduleFromSettings,
  type CentreOperatingSchedule,
} from '@/lib/time/centre-operating-schedule'
import { MobileCentreDetailsSheet } from './mobile-centre-details-sheet'
import { GovernmentRegisteredBadge, PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { isPilotCentreIdentity, UNCLAIMED_CENTRE_DISCLAIMER } from '@/lib/ecd/pilot-centres'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'
import { formatAgeRangeSummary } from '@/lib/ecd/age-groups'
import { readAftercareConfig } from '@/lib/ecd/centre-public-profile'
import { readCentreLocationMetadata } from '@/lib/geo/centre-location-metadata'

type CentreTrustDocument = {
  documentType: string
  label: string
  status: string
  fileUrl: string | null
  expiresAt: string | null
  notes: string | null
}

export type Centre = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  email: string | null
  phone: string | null
  address: string | null
  suburb: string | null
  city: string | null
  province: string | null
  age_groups: string[] | null
  logo_url: string | null
  cover_image_url: string | null
  is_registered: boolean | null
  capacity: number | null
  fees_display_mode: 'exact' | 'range' | 'contact' | null
  monthly_fee_min: number | null
  monthly_fee_max: number | null
  registration_fee: number | null
  subsidy_accepted: boolean | null
  fees_notes: string | null
  fees_last_updated_at: string | null
  contact_whatsapp: string | null
  contact_phone: string | null
  registration_number?: string | null
  emis_number?: string | null
  dsd_reg_number?: string | null
  npo_reg?: string | null
  operating_schedule?: CentreOperatingSchedule | null
  operating_hours_summary?: string | null
  communication_automation_settings?: unknown
  aftercare_available?: boolean | null
  aftercare_end_time?: string | null
  classrooms?: Array<{ id?: string | null; name?: string | null; age_group?: string | null; practitioner_name?: string | null }> | null
  owner_id?: string | null
  onboarding_complete?: boolean | null
  website_published?: boolean | null
}

export type ExistingApplication = {
  id: string
  status: string | null
}

export type ProgramCard = {
  title: string
  description: string
}

export type WebsiteContentState = {
  aboutText: string
  programCards: ProgramCard[]
  galleryUrls: string[]
  visibleSections: string[]
}

export const DEFAULT_VISIBLE_SECTIONS = ['hero', 'about', 'programs', 'gallery', 'contact']

const programCardIcons = [BookOpenCheck, Users, Baby, MessageCircle] as const
const ALLOWED_IMAGE_HOST_SUFFIXES = ['.supabase.co']
const ALLOWED_IMAGE_HOSTS = new Set(['images.pexels.com', 'thumbs.dreamstime.com'])

export function fromParagraphBlocks(contentBlocks: unknown): string {
  if (!Array.isArray(contentBlocks)) return ''
  const values = contentBlocks
    .map((block) => {
      if (typeof block === 'string') return block.trim()
      if (block && typeof block === 'object' && 'content' in block && typeof block.content === 'string') {
        return block.content.trim()
      }
      return ''
    })
    .filter((value) => value.length > 0)
  return values.join('\n')
}

export function fromProgramBlocks(contentBlocks: unknown): ProgramCard[] {
  if (!Array.isArray(contentBlocks)) return []
  return contentBlocks
    .map((block, index) => {
      if (!block || typeof block !== 'object') return null
      const title = 'title' in block && typeof block.title === 'string' ? block.title.trim() : ''
      const description =
        'description' in block && typeof block.description === 'string' ? block.description.trim() : ''
      if (!title && !description) return null
      return {
        title: title || `Programme ${index + 1}`,
        description: description || title,
      }
    })
    .filter((value): value is ProgramCard => Boolean(value))
}

export function fromGalleryBlocks(contentBlocks: unknown): string[] {
  if (!Array.isArray(contentBlocks)) return []
  const urls = contentBlocks
    .map((block) => {
      if (typeof block === 'string') return block.trim()
      if (block && typeof block === 'object' && 'url' in block && typeof block.url === 'string') {
        return block.url.trim()
      }
      return ''
    })
    .filter((value) => value.length > 0)
  return Array.from(new Set(urls))
}

function isSafeImageUrl(url: string | null | undefined) {
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('/centres/')) return true

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    if (ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return true
    return ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix))
  } catch {
    return false
  }
}

function getSafeImageUrl(candidate: string | null | undefined, fallback: string) {
  if (candidate && isSafeImageUrl(candidate)) return candidate
  return fallback
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `R${new Intl.NumberFormat('en-ZA').format(amount)}`
}

function formatAgeSummary(ageGroups: string[] | null | undefined) {
  return formatAgeRangeSummary(ageGroups, 'All ages welcome')
}

function formatFeesLabel(centre: Centre) {
  if (centre.fees_display_mode === 'exact') return formatCurrency(centre.monthly_fee_min) ?? 'Ask for fees'
  if (centre.fees_display_mode === 'range') {
    const minimum = formatCurrency(centre.monthly_fee_min)
    const maximum = formatCurrency(centre.monthly_fee_max)
    if (minimum && maximum) return `${minimum} to ${maximum}`
  }
  return 'Ask the centre for fees'
}

function formatRegistrationFeeLabel(centre: Centre) {
  const amount = formatCurrency(centre.registration_fee)
  return amount ? `${amount} once-off` : 'Ask the centre'
}

function formatPhoneHref(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/[^\d+]/g, '')
  return cleaned ? `tel:${cleaned}` : null
}

function formatWhatsAppHref(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/[^\d]/g, '')
  return cleaned ? `https://wa.me/${cleaned}` : null
}


function normalizeCentreCopy(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null

  const cleaned = trimmed
    .replace(/\b1year\b/gi, '1 year')
    .replace(/\bis a day care catering for children from\b/gi, ' is a day care for children from')
    .replace(/\bday care catering for children from\b/gi, 'Day care for children from')
    .replace(/\bgoing to school age\b/gi, 'school-going age')

  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="space-y-2">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{eyebrow}</p> : null}
      <h2 className="text-[1.95rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-slate-950 sm:text-[2.25rem]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {description ? <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p> : null}
    </div>
  )
}

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.6rem] border border-border bg-background p-4 shadow-[0_8px_24px_rgba(31,44,39,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.3rem] border border-border bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-teal-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p>
      </div>
    </div>
  )
}
export function CentreClient({
  slug,
  centre,
  websiteContent = {
    aboutText: '',
    programCards: [],
    galleryUrls: [],
    visibleSections: DEFAULT_VISIBLE_SECTIONS,
  },
  userRole = null,
  existingApplication = null,
  isSaved = false,
  trustDocuments = [],
}: {
  slug: string
  centre: Centre | null
  websiteContent?: WebsiteContentState
  userRole?: string | null
  existingApplication?: ExistingApplication | null
  isSaved?: boolean
  trustDocuments?: CentreTrustDocument[]
}) {

  if (!centre) {
    return (
      <main className="min-h-screen bg-surface-secondary py-10 sm:py-16">
        <Container className="max-w-2xl">
          <div className="rounded-[2rem] border border-border bg-background p-6 text-center shadow-[0_14px_34px_rgba(31,44,39,0.05)] sm:p-8">
            <h1 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-slate-950" style={{ fontFamily: 'var(--font-display)' }}>
              Centre profile unavailable
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We could not load this centre right now. Please return to the directory and try again.
            </p>
            <div className="mt-6">
              <Link
                href="/directory"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Back to directory
              </Link>
            </div>
          </div>
        </Container>
      </main>
    )
  }

  const hasRealCoverImage = typeof centre.cover_image_url === 'string' && centre.cover_image_url.trim().length > 0
  const centreLogo = (centre.logo_url && isSafeImageUrl(centre.logo_url)) 
    ? centre.logo_url 
    : (centre.slug === 'bajabulile' || centre.slug === 'bajabulile-day-care-centre')
      ? '/centres/bajabulile/logo.jpg'
      : null
  const centreInitial = (centre.name?.trim().charAt(0) || 'C').toUpperCase()
  const isPilotCentre = isPilotCentreIdentity({ name: centre.name, slug: centre.slug })
  const hasOwnerId = typeof centre.owner_id === 'string' && centre.owner_id.trim().length > 0
  const isClaimed = hasOwnerId || centre.onboarding_complete === true || centre.website_published === true
  const isVerifiedForParents = Boolean(isClaimed && centre.is_registered)
  const savedOperatingSchedule =
    centre.operating_schedule ??
    readOperatingScheduleFromSettings(centre.communication_automation_settings) ??
    buildDefaultOperatingSchedule()
  const operatingHoursSummary =
    centre.operating_hours_summary ??
    readOperatingHoursSummaryFromSettings(centre.communication_automation_settings) ??
    getOperatingScheduleSummary(savedOperatingSchedule)
  const operationalStatus = getCentreOperationalStatus(savedOperatingSchedule, new Date(), operatingHoursSummary)
  const aftercareSettings = readAftercareConfig(centre.communication_automation_settings)
  const locationMetadata = readCentreLocationMetadata(centre.communication_automation_settings)
  const aftercare = {
    available: centre.aftercare_available === true || aftercareSettings.available,
    endTime: centre.aftercare_end_time ?? aftercareSettings.endTime,
  }
  const classroomRows = Array.isArray(centre.classrooms) ? centre.classrooms : []
  const classrooms = classroomRows.filter((room) => room?.name?.trim())
  const fallbackHeroImage = buildCentrePreviewImage({
    name: centre.name,
    suburb: centre.suburb,
    isClaimed: isClaimed,
  })
  const heroImage = hasRealCoverImage
    ? getSafeImageUrl(getCentreHeroImage(centre.slug, centre.cover_image_url), fallbackHeroImage)
    : fallbackHeroImage
  const showPilotTrustInfo = isPilotCentre
  const showUnclaimedDisclaimer = !hasOwnerId
  const pilotBadges = showPilotTrustInfo
    ? [isClaimed ? 'Verified' : null, isVerifiedForParents ? 'DSD registered' : null, 'Parent-ready profile'].filter(Boolean) as string[]
    : []
  const locationLabel = [centre.suburb?.trim(), centre.city?.trim()].filter(Boolean).join(', ')
  const fallbackAddressLabel = centre.address?.trim() || locationLabel || 'Address shared on request'
  const safeCentreSlug = normalizeCentreSlug(centre.slug) ?? centre.slug
  const claimHref = `/for-centres/register?flow=confirm&claim=${encodeURIComponent(safeCentreSlug)}`
  const showClaimLink = !isClaimed && userRole !== 'parent_user'
  const feesLabel = formatFeesLabel(centre)
  const registrationFeeLabel = formatRegistrationFeeLabel(centre)
  const ageGroupsLabel = formatAgeSummary(centre.age_groups)
  const showExactLocationBadge = isClaimed && locationMetadata?.source === 'exact'
  const trustLabel = isVerifiedForParents
    ? 'Verified and DSD registered'
    : isClaimed
      ? 'Verified'
      : 'Not yet on CentreConnect'
  const healthPermitDocument = trustDocuments.find((document) => document.documentType === 'health_clearance') ?? null
  const primaryRegistrationNumber = centre.registration_number?.trim() || centre.dsd_reg_number?.trim() || centre.npo_reg?.trim() || null
  const showTrustProofSection = Boolean(isClaimed && (primaryRegistrationNumber || centre.emis_number?.trim() || healthPermitDocument))
    
  const practicalLabel = centre.capacity
    ? `Space for about ${centre.capacity} children`
    : 'Ask about availability'
  const phoneHref = formatPhoneHref(centre.contact_phone ?? centre.phone)
  const whatsappHref = formatWhatsAppHref(centre.contact_whatsapp ?? centre.contact_phone ?? centre.phone)
  const presentationTagline = normalizeCentreCopy(centre.tagline)
  const presentationDescription = normalizeCentreCopy(centre.description)

  const visibleSectionSet = new Set(websiteContent.visibleSections)
  const showAbout = visibleSectionSet.has('about')
  const showPrograms = visibleSectionSet.has('programs')
  const safeGalleryUrls = websiteContent.galleryUrls.filter((url) => isSafeImageUrl(url))
  const showGallery = visibleSectionSet.has('gallery') && safeGalleryUrls.length > 0 && !isClaimed
  const galleryPreviewUrls = safeGalleryUrls.slice(0, 4)
  const showContact = visibleSectionSet.has('contact')
  const aboutCopy =
    websiteContent.aboutText.trim() ||
    presentationDescription ||
    (isClaimed
      ? 'Parents are choosing a place for their child, but they also need the day to feel easier. CentreConnect keeps applications, updates, and pickup details in one place.'
      : 'This creche gives parents a simple starting point: learn the basics, ask questions, and decide whether it feels right.')

  const fallbackPrograms: ProgramCard[] = isClaimed
    ? [
        {
          title: 'Fees, hours, and support',
          description: 'See monthly fees, opening hours, and whether DSD registration is shown before you decide.',
        },
        {
          title: 'Ages and class fit',
          description: 'Check age groups now, then message the centre if you need help with placement or class fit.',
        },
      ]
    : [
        {
          title: 'A calm daily routine',
          description: 'Children move through meals, play, learning time, rest, and collection in a way that feels clear and familiar to parents.',
        },
        {
          title: 'Age-appropriate groups',
          description: 'Babies, toddlers, and older children can be placed into groups that match their age and stage as the centre grows.',
        },
      ]
  const programCards = (websiteContent.programCards.length > 0 ? websiteContent.programCards : fallbackPrograms).slice(0, isClaimed ? 2 : 2)
  const visibleClassrooms = isClaimed ? classrooms.slice(0, 3) : classrooms
  const showPracticalSection = showContact && !isClaimed

  const quickFacts = [
    { icon: Wallet, label: 'Monthly fees', value: feesLabel },
    { icon: Wallet, label: 'Registration fee', value: registrationFeeLabel },
    { icon: Baby, label: 'Ages', value: ageGroupsLabel },
    { icon: Clock3, label: 'Open', value: operationalStatus.schedule },
  ] as const

  const parentHighlights = isClaimed
    ? [
        "Apply without starting from zero each time and keep your child's documents in one secure place.",
        'See updates, reminders, and pickup details in one place instead of chasing different chats.',
        'If you need to compare or move later, your saved profile makes the next step easier.',
      ]
    : [
        'You can still compare the centre now and contact them directly while they finish joining CentreConnect.',
        isVerifiedForParents
          ? 'DSD registration is shown on this profile, so trust checks are easier to do quickly.'
          : 'DSD registration is not shown yet, so ask directly if that matters for your family.',
        centre.capacity
          ? `The centre says it can care for around ${centre.capacity} children.`
          : 'Capacity is not listed yet, so asking early can help if you need space soon.',
      ]

  const inquiryTemplates = [
    { label: 'Ask about space', message: `Hi ${centre.name}, I would like to ask if you still have space for my child.` },
    { label: 'Ask about fees', message: `Hi ${centre.name}, I would like to ask about your fees and what is included.` },
    { label: 'Ask about registration', message: `Hi ${centre.name}, I would like to ask about your DSD registration status.` },
    { label: 'Ask for a visit', message: `Hi ${centre.name}, I would like to ask if I can visit the centre before I apply.` },
  ]

  const classEmphasis = [
    'A gentle start with care, rhythm, and close attention.',
    'A playful group for growing confidence and independence.',
    'A stronger school-readiness stage with routine and curiosity.',
  ]

  const claimedFoldPromises = [
    'Apply online when you are ready',
    'Message the centre in the app',
  ]

  return (
    <main className="min-h-screen bg-surface-secondary pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16">
      <Container className="space-y-8 py-6 sm:py-8 lg:space-y-10">
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="rounded-[2.4rem] border border-border bg-background p-5 shadow-[0_20px_48px_rgba(31,44,39,0.06)] sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-border bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-none">
                Centre profile
              </Badge>
              {isClaimed ? <PremiumVerifiedBadge  /> : null}
              {isVerifiedForParents ? <GovernmentRegisteredBadge /> : null}
              {showExactLocationBadge ? (
                <Badge className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 shadow-none">
                  Exact location
                </Badge>
              ) : null}
              {!isClaimed ? (
                <Badge className="rounded-full border border-border bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-none">
                  Public listing
                </Badge>
              ) : null}
            </div>

            <div className="mt-5 flex items-start gap-4">
              {centreLogo ? (
                <div className="h-16 w-16 overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_10px_24px_rgba(31,44,39,0.10)]">
                  <Image src={centreLogo} alt={`${centre.name} logo`} width={64} height={64} className="h-full w-full object-cover" unoptimized />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-border bg-muted text-xl font-black text-teal-700 shadow-[0_10px_24px_rgba(31,44,39,0.10)]">
                  {centreInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-[2rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-950 sm:text-[2.8rem]" style={{ fontFamily: 'var(--font-display)' }}>
                  {centre.name}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationLabel || 'Johannesburg'}
                </p>
                {presentationTagline ? <p className="mt-3 text-base leading-7 text-slate-600 sm:text-[17px]">{presentationTagline}</p> : null}
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              {isClaimed
                ? 'Fees, ages, and hours first. Apply or message when you are ready.'
                : 'Fees, ages, and contact details first. Call or WhatsApp if you want to move today.'}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickFacts.map((fact) => (
                <QuickFact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value} />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(isClaimed ? claimedFoldPromises : ['Compare fast', 'Contact directly']).map((item) => (
                <span key={item} className="rounded-full border border-border bg-white px-3 py-2 text-[11px] font-semibold text-emerald-900 shadow-none">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">
              {isClaimed ? (
                <>
                  <ApplyCTA
                    variant="hero"
                    centreSlug={centre.slug}
                    userRole={userRole}
                    existingApplicationId={existingApplication?.id ?? null}
                    existingApplicationStatus={existingApplication?.status ?? null}
                    existingHelperText={null}
                    isAvailable={true}
                    helperText={null}
                  />
                  <ContactCentreSheet
                    centreId={centre.id}
                    centreName={centre.name}
                    templates={inquiryTemplates}
                    triggerLabel="Message centre"
                    triggerClassName="h-12 w-full justify-center rounded-2xl border-emerald-200 bg-white text-sm font-semibold text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/40"
                    title={`Ask ${centre.name} a quick question`}
                    description="Your message goes straight to the centre inbox in CentreConnect, so replies and next steps stay in one place."
                  />
                </>
              ) : (
                <>
                  {whatsappHref ? (
                    <Link
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp centre
                    </Link>
                  ) : null}
                  {phoneHref ? (
                    <Link
                      href={phoneHref}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 text-sm font-semibold text-slate-900"
                    >
                      <Phone className="h-4 w-4" />
                      Call centre
                    </Link>
                  ) : null}
                </>
              )}
            </div>

            {showUnclaimedDisclaimer ? (
              <div className="mt-5 rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm leading-6 text-amber-950">{UNCLAIMED_CENTRE_DISCLAIMER}</p>
                {showClaimLink ? (
                  <Link href={claimHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                    Do you run this creche? Claim it <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[2.4rem] border border-border bg-white shadow-[0_20px_48px_rgba(31,44,39,0.07)]">
            <div className="relative aspect-[16/11] sm:aspect-[16/10]">
              <Image src={heroImage} alt={centre.name} fill className="object-cover" priority quality={90} unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <Badge className="rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-900 shadow-none backdrop-blur-sm">
                  {hasRealCoverImage ? 'Real centre photo' : 'Preview image'}
                </Badge>
              </div>
            </div>
            <div className="border-t border-border p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Centre photo</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                See the centre before you visit or contact them.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_22rem] lg:items-start">
          <div className="space-y-6">
            {showAbout && !isClaimed ? (
              <section className="rounded-[2rem] border border-border bg-background p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading eyebrow="About" title="About this creche" description={isClaimed ? 'A stronger creche profile helps parents decide faster, with fewer unanswered questions before they apply.' : 'A quick, parent-friendly summary before you decide whether to ask more questions.'} />
                <p className="mt-5 whitespace-pre-line text-sm leading-8 text-slate-700 sm:text-base">{aboutCopy}</p>
              </section>
            ) : null}

            {showTrustProofSection ? (
              <section className="rounded-[2rem] border border-border bg-background p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading
                  eyebrow="Trust and safety"
                  title="The proof parents usually ask for"
                  description="Bajabulile can show key compliance details right on the profile, so families do not need to guess whether the centre is legitimate."
                />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-5">
                    <p className="text-[10px] font-semibold tracking-[0.08em] text-emerald-700">Health and safety</p>
                    <h3 className="mt-3 text-[1.25rem] leading-tight text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                      {healthPermitDocument?.label ?? 'Municipal health clearance certificate'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {healthPermitDocument?.status === 'verified'
                        ? 'CentreConnect has a verified permit on file for this centre.'
                        : 'This profile highlights the centre\'s health-clearance status for parents.'}
                    </p>
                    {healthPermitDocument?.fileUrl ? (
                      <Link
                        href={healthPermitDocument.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
                      >
                        View permit
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                  <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-[0_8px_20px_rgba(31,44,39,0.03)]">
                    <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">Registration details</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Centre registration: {primaryRegistrationNumber ?? 'Shared on request'}</p>
                    {centre.emis_number?.trim() ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">EMIS number: {centre.emis_number.trim()}</p>
                    ) : null}
                    {centre.npo_reg?.trim() ? (
                      <p className="mt-1 text-sm leading-6 text-slate-600">NPO / DSD reference: {centre.npo_reg.trim()}</p>
                    ) : null}
                    {!centre.npo_reg?.trim() && centre.dsd_reg_number?.trim() ? (
                      <p className="mt-1 text-sm leading-6 text-slate-600">DSD registration: {centre.dsd_reg_number.trim()}</p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {showPrograms ? (
              <section className="rounded-[2rem] border border-border bg-background p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading
                  eyebrow={isClaimed ? 'What parents should know first' : 'Curriculum and daily rhythm'}
                  title={isClaimed ? 'The basics that help you decide' : 'What children do here'}
                  description={isClaimed ? 'Real centre details first, so you can decide without reading through filler.' : 'These are the parts of the day most parents usually want to understand before applying.'}
                />
                <div className={`mt-5 grid gap-4 ${programCards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {programCards.map((program, index) => {
                    const Icon = programCardIcons[index % programCardIcons.length]
                    return (
                      <div
                        key={`${program.title}-${index}`}
                        className="rounded-[1.5rem] border border-border bg-white p-5 shadow-[0_8px_20px_rgba(31,44,39,0.03)]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-[1.35rem] leading-tight text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                          {program.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{program.description}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {showGallery ? (
              <section className="rounded-[2rem] border border-border bg-background p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading eyebrow="Photos" title="Photos parents can scan quickly" description="A short visual look at the space before you decide whether to apply or send a question." />
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryPreviewUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-[1.6rem] border border-border bg-white">
                      <Image
                        src={url}
                        alt={`${centre.name} gallery image ${index + 1}`}
                        width={420}
                        height={320}
                        className="h-32 w-full object-cover sm:h-40"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-border bg-background p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
              <SectionHeading
                eyebrow="Classes and care"
                title="How the day is organised"
                description={isClaimed ? undefined : 'A simple look at the class setup before you contact the centre.'}
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border bg-white p-5">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">Aftercare</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{aftercare.available ? `Available until ${aftercare.endTime ?? '17:30'}` : 'Not offered'}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{aftercare.available ? 'Helpful if you collect later in the day.' : 'Plan for normal collection times.'}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-white p-5">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">Classes</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{classrooms.length > 0 ? `${classrooms.length} class${classrooms.length === 1 ? '' : 'es'} listed` : 'Ask the centre for class placement'}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Ask the centre which class fits your child best.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {visibleClassrooms.length > 0 ? visibleClassrooms.map((room, index) => (
                  <div key={`${room.id ?? index}-${room.name}`} className={`rounded-[1.5rem] border p-5 shadow-[0_8px_20px_rgba(31,44,39,0.03)] ${isClaimed ? 'border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40' : 'border-border bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">Class {String.fromCharCode(65 + index)}</p>
                      {isClaimed ? <span className="rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-900">Parents can picture this group quickly</span> : null}
                    </div>
                    <h3 className="mt-3 text-[1.25rem] leading-tight text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>{room.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-teal-700">{room.age_group?.trim() || 'All ages'}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{classEmphasis[index] ?? 'A caring, age-matched space designed to help children feel secure, curious, and ready for the rhythm of the day.'}</p>
                    {room.practitioner_name?.trim() ? <p className="mt-3 text-sm leading-6 text-slate-600">Led by {room.practitioner_name.trim()}</p> : null}
                  </div>
                )) : (
                  <div className="rounded-[1.5rem] border border-dashed border-amber-200 bg-amber-50/40 p-5 text-sm leading-6 text-slate-600 sm:col-span-3">
                    Classes are not listed yet. Send a quick question if you need help with placement.
                  </div>
                )}
              </div>
            </section>

            {showPracticalSection ? (
              <section className="rounded-[2rem] border border-border bg-background p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading eyebrow="Practical details" title="Where to find them" description={isClaimed ? 'The final details most parents want before they apply.' : 'Simple details for parents who want to visit, call, or compare one more time.'} />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={MapPin} label="Address" value={fallbackAddressLabel} />
                  {(centre.address?.trim() || locationLabel) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(centre.address?.trim() || locationLabel)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 underline underline-offset-2"
                    >
                      <MapPin className="h-3 w-3" />
                      Get directions →
                    </a>
                  )}
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={centre.contact_phone?.trim() || centre.phone?.trim() || 'Shared after you contact the centre'}
                  />
                  <InfoRow icon={Clock3} label="Hours" value={operationalStatus.schedule} />
                  <InfoRow icon={ShieldCheck} label="Trust" value={trustLabel} />
                </div>
              </section>
            ) : null}
          </div>

          <aside className="hidden space-y-5 lg:block">
            <div className="sticky top-24 space-y-5">
              <div className="rounded-[2rem] border border-border bg-background p-5 shadow-[0_16px_36px_rgba(31,44,39,0.06)]">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">Next step</p>
                <h3 className="mt-3 text-[1.8rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-slate-950" style={{ fontFamily: 'var(--font-display)' }}>
                  {isClaimed ? 'Ready to act?' : 'Keep this creche close'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {isClaimed
                    ? 'Apply online or send one quick message.'
                    : 'Check the details, then use WhatsApp or phone if you want to act today.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(isClaimed
                    ? ['Apply online', 'Message in app', 'Updates stay together']
                    : ['Public listing', 'Call or WhatsApp', 'Apply later when live']
                  ).map((item) => (
                    <span key={item} className="rounded-full border border-emerald-100 bg-emerald-50/60 px-3 py-1 text-[11px] font-medium text-emerald-900">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.3rem] border border-border bg-white p-4">
                  <p className={`flex items-center gap-2 text-sm font-semibold ${operationalStatus.isOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <Circle className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                    {operationalStatus.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{operationalStatus.schedule}</p>
                  <p className="mt-2 text-xs text-slate-500">Registration fee: {registrationFeeLabel} | Ages: {ageGroupsLabel}</p>
                </div>


                {showPilotTrustInfo ? (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {isClaimed ? <PremiumVerifiedBadge compact  /> : null}
                      {isVerifiedForParents ? <GovernmentRegisteredBadge compact /> : null}
                      {!isVerifiedForParents ? (
                        <Badge className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-900 shadow-none">
                          {isClaimed ? 'Preview image' : 'Not yet on CentreConnect'}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-amber-950">
                      Creches on CentreConnect let parents do more straight away: apply online, send a message in the app, and follow what happens next with less confusion.
                    </p>
                    {pilotBadges.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pilotBadges.map((badge) => (
                          <span key={badge} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-medium text-amber-950">
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!isClaimed ? (
                  <div className="mt-5 rounded-[1.4rem] border border-border bg-white p-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Online applications are not open yet. If you want to act now, use the centre phone or WhatsApp details on this page.
                    </p>
                  {showClaimLink ? (
                    <Link href={claimHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                      Do you run this creche? Claim it <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  <ApplyCTA
                    variant="hero"
                    centreSlug={centre.slug}
                    userRole={userRole}
                    existingApplicationId={existingApplication?.id ?? null}
                    existingApplicationStatus={existingApplication?.status ?? null}
                    existingHelperText={isClaimed ? 'Your application, messages, and next steps stay together in CentreConnect.' : null}
                    isAvailable={isClaimed}
                    unavailableLabel="Online applications not available yet"
                    helperText={
                      isClaimed ? 'Apply now if you are ready, or send a quick message first if you need one more answer.' : 'Use the public details now, then come back when online applications open.'
                    }
                  />
                  {isClaimed ? (
                    <ContactCentreSheet
                      centreId={centre.id}
                      centreName={centre.name}
                      templates={inquiryTemplates}
                      triggerLabel="Message centre"
                      triggerClassName="h-12 w-full justify-center rounded-2xl border-emerald-200 bg-white text-sm font-semibold text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/40"
                      title={`Ask ${centre.name} a quick question`}
                      description="Your message goes straight to the centre inbox in CentreConnect, so replies and next steps stay in one place."
                    />
                  ) : (
                    <div className="rounded-[1.3rem] border border-border bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">Profile details only for now</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Messaging opens when the creche joins CentreConnect.</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-[1.3rem] border border-border bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Save this centre</p>
                      <p className="text-xs text-slate-500">Keep it in your shortlist while you compare your options.</p>
                    </div>
                    <SaveCentreButton centreId={centre.id} initialSaved={isSaved} />
                  </div>
                </div>
              </div>

              {isClaimed ? <CentreContactCard centreId={centre.id} centreName={centre.name} templates={inquiryTemplates} /> : null}
            </div>
          </aside>
        </section>
      </Container>

      <MobileCentreDetailsSheet
        centreId={centre.id}
        centreSlug={centre.slug}
        centreName={centre.name}
        tagline={presentationTagline}
        locationLabel={locationLabel}
        feesLabel={feesLabel}
        registrationFeeLabel={registrationFeeLabel}
        ageGroupsLabel={ageGroupsLabel}
        capacityLabel={practicalLabel}
        trustLabel={trustLabel}
        isRegistered={isVerifiedForParents}
        isClaimed={isClaimed}
        isOnline={operationalStatus.isOnline}
        schedule={operationalStatus.schedule}
        subsidyAccepted={Boolean(centre.subsidy_accepted)}
        userRole={userRole}
        showPilotTrustInfo={showPilotTrustInfo}
        pilotBadges={pilotBadges}
        existingApplicationId={existingApplication?.id ?? null}
        existingApplicationStatus={existingApplication?.status ?? null}
        inquiryTemplates={inquiryTemplates}
        isSaved={isSaved}
      />
    </main>
  )
}















