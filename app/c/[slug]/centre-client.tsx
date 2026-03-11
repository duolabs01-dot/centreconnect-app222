import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Baby, BellRing, BookOpenCheck, CheckCircle2, Circle, Clock3, FileText, MapPin, MessageCircle, Phone, ShieldCheck, Users, Wallet } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout/container'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { ContactCentreSheet } from './contact-centre-sheet'
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
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { isPilotCentreIdentity, UNCLAIMED_CENTRE_DISCLAIMER } from '@/lib/ecd/pilot-centres'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { buildCentrePreviewImage } from '@/lib/ui/centre-preview-image'
import { formatAgeRangeSummary } from '@/lib/ecd/age-groups'
import { readAftercareConfig } from '@/lib/ecd/centre-public-profile'
import { readCentreLocationMetadata } from '@/lib/geo/centre-location-metadata'

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

const parentBenefitIcons = [BellRing, ShieldCheck, FileText, BookOpenCheck] as const
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

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="space-y-2">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A86C3A]">{eyebrow}</p> : null}
      <h2 className="text-[1.95rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#22312E] sm:text-[2.25rem]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {description ? <p className="max-w-2xl text-sm leading-7 text-[#5F6C68] sm:text-base">{description}</p> : null}
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
    <div className="rounded-[1.6rem] border border-[#E7DDD1] bg-[#FFFDF9] p-4 shadow-[0_8px_24px_rgba(31,44,39,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDF0E6] text-[#D4935A]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#22312E]">{value}</p>
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
    <div className="flex items-start gap-3 rounded-[1.3rem] border border-[#E7DDD1] bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF8F4] text-[#0D9488]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#22312E]">{value}</p>
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
}: {
  slug: string
  centre: Centre | null
  websiteContent?: WebsiteContentState
  userRole?: string | null
  existingApplication?: ExistingApplication | null
}) {

  if (!centre) {
    return (
      <main className="min-h-screen bg-[#FAF8F4] py-10 sm:py-16">
        <Container className="max-w-2xl">
          <div className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-6 text-center shadow-[0_14px_34px_rgba(31,44,39,0.05)] sm:p-8">
            <h1 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#22312E]" style={{ fontFamily: 'var(--font-display)' }}>
              Centre profile unavailable
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5F6C68]">
              We could not load this centre right now. Please return to the directory and try again.
            </p>
            <div className="mt-6">
              <Link
                href="/directory"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0D9488] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
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
    ? [isVerifiedForParents ? 'Verified' : null, centre.subsidy_accepted ? 'Subsidy friendly' : null, 'Parent-ready profile'].filter(Boolean) as string[]
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
    ? centre.subsidy_accepted
      ? 'Verified and subsidy friendly'
      : 'Verified by CentreConnect'
    : isClaimed
      ? 'Live profile, photos pending'
      : 'Not yet on CentreConnect'
  const practicalLabel = centre.capacity
    ? `Space for about ${centre.capacity} children`
    : centre.subsidy_accepted
      ? 'Subsidy friendly centre'
      : 'Ask about availability'

  const visibleSectionSet = new Set(websiteContent.visibleSections)
  const showAbout = visibleSectionSet.has('about')
  const showPrograms = visibleSectionSet.has('programs')
  const safeGalleryUrls = websiteContent.galleryUrls.filter((url) => isSafeImageUrl(url))
  const showGallery = visibleSectionSet.has('gallery') && safeGalleryUrls.length > 0 && !isClaimed
  const galleryPreviewUrls = safeGalleryUrls.slice(0, 4)
  const showContact = visibleSectionSet.has('contact')
  const aboutCopy =
    websiteContent.aboutText.trim() ||
    centre.description ||
    (isClaimed
      ? 'This centre is on CentreConnect, so parents can move faster from first question to application without repeating forms or chasing updates.'
      : 'This centre provides a safe, warm space for children to learn, play, and settle into a steady routine.')

  const fallbackPrograms: ProgramCard[] = isClaimed
    ? [
        {
          title: 'Learning through play',
          description: 'The day is built around guided play, songs, movement, and hands-on learning so children stay engaged while building confidence.',
        },
        {
          title: 'Routine, meals, and rest',
          description: 'Parents can expect a steady rhythm of arrival, meals, learning time, naps or quiet rest, and calm collection at the end of the day.',
        },
        {
          title: 'Early foundations',
          description: 'Children build language, counting, listening, and social skills in ways that prepare them for the next stage without making the day feel too formal.',
        },
        {
          title: 'Safety and parent communication',
          description: 'CentreConnect supports parent updates, report cards, and safer pickup coordination so families know what is happening without paper going missing.',
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
  const programCards = (websiteContent.programCards.length > 0 ? websiteContent.programCards : fallbackPrograms).slice(0, isClaimed ? 1 : 2)
  const visibleClassrooms = isClaimed ? classrooms.slice(0, 2) : classrooms
  const showPracticalSection = showContact && !isClaimed

  const quickFacts = [
    { icon: Wallet, label: 'Monthly fees', value: feesLabel },
    { icon: Wallet, label: 'Registration fee', value: registrationFeeLabel },
    { icon: Baby, label: 'Ages', value: ageGroupsLabel },
    { icon: Clock3, label: 'Open', value: operationalStatus.schedule },
    { icon: ShieldCheck, label: 'Trust', value: trustLabel },
  ] as const

  const parentHighlights = isClaimed
    ? [
        'Apply once, keep your documents in one secure parent profile, and reuse them when life changes.',
        'Get updates, reminders, and safer pickup communication without chasing paper or phone calls.',
      ]
    : [
        'Parents can still view the profile now, then contact the centre directly while they finish joining CentreConnect.',
        centre.subsidy_accepted
          ? 'The centre says it accepts subsidy support, which can help families compare fit more quickly.'
          : 'Subsidy support is not listed yet, so it helps to ask directly if that matters for your family.',
        centre.capacity
          ? `The centre says it can care for around ${centre.capacity} children.`
          : 'Capacity is not listed yet, so asking early can help if you need a place soon.',
      ]

  const inquiryTemplates = [
    { label: 'Ask about space', message: `Hi ${centre.name}, I would like to ask if you still have space for my child.` },
    { label: 'Ask about fees', message: `Hi ${centre.name}, I would like to ask about your fees and what is included.` },
    { label: 'Ask about subsidy', message: `Hi ${centre.name}, I would like to ask whether subsidy support applies to my child.` },
    { label: 'Ask for a visit', message: `Hi ${centre.name}, I would like to ask if I can visit the centre before I apply.` },
  ]


  return (
    <main className="min-h-screen bg-[#FAF8F4] pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16">
      <Container className="space-y-8 py-6 sm:py-8 lg:space-y-10">
        <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="overflow-hidden rounded-[2.4rem] border border-[#E7DDD1] bg-white shadow-[0_20px_48px_rgba(31,44,39,0.07)]">
            <div className="relative aspect-[16/10] sm:aspect-[16/9]">
              <Image src={heroImage} alt={centre.name} fill className="object-cover" priority quality={90} unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10211D]/72 via-[#10211D]/18 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <div className="flex items-end gap-3">
                  {centreLogo ? (
                    <div className="h-16 w-16 overflow-hidden rounded-[1.5rem] border-2 border-white/90 bg-white shadow-xl">
                      <Image src={centreLogo} alt={`${centre.name} logo`} width={64} height={64} className="h-full w-full object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-2 border-white/90 bg-[#F5EFE6] text-xl font-black text-[#0D9488] shadow-xl">
                      {centreInitial}
                    </div>
                  )}
                  <div className="min-w-0 text-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Parent listing view</p>
                      {isPilotCentre ? (
                        <Badge className="rounded-full border border-cyan-400/50 bg-cyan-900/40 px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-50 shadow-none backdrop-blur-sm">
                          Pilot Partner
                        </Badge>
                      ) : null}
                    </div>
                    <h1 className="mt-1 text-[1.95rem] font-extrabold leading-[1.02] tracking-[-0.025em] text-white sm:text-[2.55rem]" style={{ fontFamily: 'var(--font-display)' }}>
                      {centre.name}
                    </h1>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLabel || 'Johannesburg'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[2.4rem] border border-[#E7DDD1] bg-[#FFFDF9] p-5 shadow-[0_20px_48px_rgba(31,44,39,0.06)] sm:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {isVerifiedForParents ? <PremiumVerifiedBadge /> : null}
                {centre.subsidy_accepted ? (
                  <Badge className="rounded-full border border-[#E7D6A8] bg-[#FFF5D9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8F6200] shadow-none">
                    Subsidy friendly
                  </Badge>
                ) : null}
                {showExactLocationBadge ? (
                  <Badge className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 shadow-none">
                    Exact location
                  </Badge>
                ) : null}
                {!isClaimed ? (
                  <Badge className="rounded-full border border-[#DDD5C8] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6A7672] shadow-none">
                    Not yet on CentreConnect
                  </Badge>
                ) : null}
              </div>

              {centre.tagline ? <p className="mt-4 text-base leading-7 text-[#5F6C68] sm:text-[17px]">{centre.tagline}</p> : null}

              <p className="mt-4 text-sm leading-7 text-[#5F6C68] sm:text-base">
                {isClaimed
                  ? 'This centre is on CentreConnect, so family admin feels lighter: fewer surprises, less paper, and one calmer place to manage updates for your child.'
                  : 'Parents want three things quickly here: what the fees look like, which ages are welcome, and whether this centre feels trusted. This page keeps those answers simple.'}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {quickFacts.map((fact) => (
                  <QuickFact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value} />
                ))}
              </div>

              {showUnclaimedDisclaimer ? (
                <div className="mt-5 rounded-[1.6rem] border border-[#E7D6A8] bg-[#FFF7E7] p-4">
                  <p className="text-sm leading-6 text-[#6C4700]">{UNCLAIMED_CENTRE_DISCLAIMER}</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-[#8F6200]">
                    The hero image above is a preview until the centre uploads real photos.
                  </p>
                  {showClaimLink ? (
                    <Link href={claimHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0D9488] hover:underline">
                      Own this creche? Claim it here <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#E7DDD1] bg-white p-4">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">{isClaimed ? 'CentreConnect parent benefits' : 'What parents need first'}</p>
              <div className="mt-3 space-y-3">
                {parentHighlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF6F2] text-[#0D9488]">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <p className="text-sm leading-6 text-[#4E5D59]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_22rem] lg:items-start">
          <div className="space-y-6">
            {showAbout && !isClaimed ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading eyebrow="About" title="About this creche" description={isClaimed ? 'A stronger centre profile helps parents decide faster, with fewer unanswered questions before they apply.' : 'A quick, parent-friendly summary before you decide whether to ask more questions.'} />
                <p className="mt-5 whitespace-pre-line text-sm leading-8 text-[#4E5D59] sm:text-base">{aboutCopy}</p>
              </section>
            ) : null}

            {showPrograms ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading
                  eyebrow="Curriculum and daily rhythm"
                  title="What children do here"
                  description={isClaimed ? 'One quick look at the rhythm, routine, and learning style before you decide to apply.' : 'These are the parts of the day most parents usually want to understand before applying.'}
                />
                <div className={`mt-5 grid gap-4 ${programCards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {programCards.map((program, index) => {
                    const Icon = programCardIcons[index % programCardIcons.length]
                    return (
                      <div
                        key={`${program.title}-${index}`}
                        className="rounded-[1.5rem] border border-[#E7DDD1] bg-white p-5 shadow-[0_8px_20px_rgba(31,44,39,0.03)]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDF0E6] text-[#D4935A]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-[1.35rem] leading-tight text-[#22312E]" style={{ fontFamily: 'var(--font-display)' }}>
                          {program.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-[#5F6C68]">{program.description}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {showGallery ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading eyebrow="Photos" title="Photos parents can scan quickly" description="A short visual look at the space before you decide whether to apply or send a question." />
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryPreviewUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-[1.6rem] border border-[#E7DDD1] bg-white">
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

            <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
              <SectionHeading
                eyebrow="Classes and care"
                title="How the day is organised"
                description={isClaimed ? 'The essentials parents usually want here are age fit, class setup, aftercare, and the practical details that affect daily life.' : 'A simple look at the class setup before you contact the centre.'}
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[#E7DDD1] bg-white p-5">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">Aftercare</p>
                  <p className="mt-2 text-lg font-semibold text-[#22312E]">{aftercare.available ? `Available until ${aftercare.endTime ?? '17:30'}` : 'Not offered'}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5F6C68]">{aftercare.available ? 'Useful for working parents who need a little extra time after the main school day.' : 'Parents should plan for collection at the normal closing time.'}</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#E7DDD1] bg-white p-5">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">Classes</p>
                  <p className="mt-2 text-lg font-semibold text-[#22312E]">{classrooms.length > 0 ? `${classrooms.length} class${classrooms.length === 1 ? '' : 'es'} listed` : 'Ask the centre for class placement'}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5F6C68]">A quick summary so parents can picture where their child may fit.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {visibleClassrooms.length > 0 ? visibleClassrooms.map((room, index) => (
                  <div key={`${room.id ?? index}-${room.name}`} className="rounded-[1.5rem] border border-[#E7DDD1] bg-white p-5 shadow-[0_8px_20px_rgba(31,44,39,0.03)]">
                    <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">Class {String.fromCharCode(65 + index)}</p>
                    <h3 className="mt-2 text-[1.25rem] leading-tight text-[#22312E]" style={{ fontFamily: 'var(--font-display)' }}>{room.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-[#0D9488]">{room.age_group?.trim() || 'All ages'}</p>
                    {room.practitioner_name?.trim() ? <p className="mt-2 text-sm leading-6 text-[#5F6C68]">Led by {room.practitioner_name.trim()}</p> : null}
                  </div>
                )) : (
                  <div className="rounded-[1.5rem] border border-dashed border-[#D7CEC2] bg-[#FFFCF7] p-5 text-sm leading-6 text-[#5F6C68] sm:col-span-3">
                    Classes are not listed yet. Use the quick question button if you want the centre to guide you quickly.
                  </div>
                )}
              </div>
            </section>

            {showPracticalSection ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-4 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-6">
                <SectionHeading eyebrow="Practical details" title="Where to find them" description={isClaimed ? 'The final details most parents want before they apply.' : 'Simple details for parents who want to visit, call, or compare one more time.'} />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={MapPin} label="Address" value={fallbackAddressLabel} />
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
              <div className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-5 shadow-[0_16px_36px_rgba(31,44,39,0.06)]">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-[#7B827E]">Next step</p>
                <h3 className="mt-3 text-[1.8rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#22312E]" style={{ fontFamily: 'var(--font-display)' }}>
                  {isClaimed ? 'Choose the easiest way to move forward' : 'Keep this creche close while you decide'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5F6C68]">
                  {isClaimed
                    ? 'Apply when you are ready, or send one quick in-app message and keep every reply, update, and document in CentreConnect.'
                    : 'This creche is still joining CentreConnect. Save it now, compare the details, and come back when digital applications open.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(isClaimed
                    ? ['Apply in minutes', 'Message the creche in-app', 'Keep one parent profile']
                    : ['Save it for later', 'Compare the details', 'Come back when applications open']
                  ).map((item) => (
                    <span key={item} className="rounded-full border border-[#DCEEE8] bg-[#F4FBF8] px-3 py-1 text-[11px] font-medium text-[#315A51]">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.3rem] border border-[#E7DDD1] bg-white p-4">
                  <p className={`flex items-center gap-2 text-sm font-semibold ${operationalStatus.isOnline ? 'text-emerald-700' : 'text-[#7B827E]'}`}>
                    <Circle className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                    {operationalStatus.label}
                  </p>
                  <p className="mt-1 text-sm text-[#5F6C68]">{operationalStatus.schedule}</p>
                  <p className="mt-2 text-xs text-[#6A7672]">Registration fee: {registrationFeeLabel} | Ages: {ageGroupsLabel}</p>
                </div>

                {showPilotTrustInfo ? (
                  <div className="mt-5 rounded-[1.5rem] border border-[#E7D6A8] bg-[linear-gradient(135deg,#FFF9E8_0%,#FFF2D2_100%)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {isVerifiedForParents ? <PremiumVerifiedBadge compact /> : null}
                      {!isVerifiedForParents ? (
                        <Badge className="rounded-full border border-[#E7D6A8] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8F6200] shadow-none">
                          {isClaimed ? 'Preview image' : 'Not yet on CentreConnect'}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#6C4700]">
                      This listing gives parents a clearer feel for the creche before they message or apply.
                    </p>
                    {pilotBadges.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pilotBadges.map((badge) => (
                          <span key={badge} className="rounded-full border border-[#E7D6A8] bg-white px-3 py-1 text-[11px] font-medium text-[#6C4700]">
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!isClaimed ? (
                  <div className="mt-5 rounded-[1.4rem] border border-[#E7DDD1] bg-white p-4">
                    <p className="text-sm leading-6 text-[#5F6C68]">
                      Online applications are not open yet. Save this creche now and check the profile details while they finish joining CentreConnect.
                    </p>
                  {showClaimLink ? (
                    <Link href={claimHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0D9488] hover:underline">
                      Own this creche? Claim it here <ArrowRight className="h-4 w-4" />
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
                    existingHelperText={isClaimed ? 'CentreConnect keeps your application, replies, and updates together in one place.' : null}
                    isAvailable={isClaimed}
                    unavailableLabel="Online applications not available yet"
                    helperText={
                      isClaimed ? 'Apply online now, or send a quick question below if you want clarity first.' : 'Save this creche now and come back when applications open.'
                    }
                  />
                  {isClaimed ? (
                    <ContactCentreSheet
                      centreId={centre.id}
                      centreName={centre.name}
                      templates={inquiryTemplates}
                      triggerLabel="Ask the creche a quick question"
                      triggerClassName="h-12 w-full justify-center rounded-2xl border-[#CDE7E0] bg-white text-sm font-semibold text-[#1F4B42] hover:border-[#A7D8CC] hover:bg-[#F7FCFA]"
                      title={`Ask ${centre.name} a quick question`}
                      description="Your message goes straight to the centre inbox in CentreConnect, so replies and application updates stay together."
                    />
                  ) : (
                    <div className="rounded-[1.3rem] border border-[#E7DDD1] bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-[#22312E]">Profile details only for now</p>
                      <p className="mt-1 text-xs leading-5 text-[#6A7672]">Messaging opens when the creche joins CentreConnect.</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-[1.3rem] border border-[#E7DDD1] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#22312E]">Save for later</p>
                      <p className="text-xs text-[#6A7672]">Keep this creche in your shortlist while you compare.</p>
                    </div>
                    <SaveCentreButton centreId={centre.id} initialSaved={false} />
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
        tagline={centre.tagline}
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
      />
    </main>
  )
}







