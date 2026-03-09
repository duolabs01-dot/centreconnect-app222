'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Baby, CheckCircle2, Circle, Clock3, MapPin, Phone, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/layout/container'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { ContactCentreSheet } from './contact-centre-sheet'
import { CentreContactCard } from '@/components/public/CentreContactCard'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { getCentreOperationalStatus } from '@/lib/time/centre-operational-status'
import { MobileCentreDetailsSheet } from './mobile-centre-details-sheet'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { isPilotCentreIdentity, UNCLAIMED_CENTRE_DISCLAIMER } from '@/lib/ecd/pilot-centres'
import { normalizeCentreSlug, resolveCentreSlugCandidates } from '@/lib/ecd/centre-slug'

type Centre = {
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
  owner_id?: string | null
  onboarding_complete?: boolean | null
}

type ExistingApplication = {
  id: string
  status: string | null
}

type ProgramCard = {
  title: string
  description: string
}

type WebsiteContentState = {
  aboutText: string
  programCards: ProgramCard[]
  galleryUrls: string[]
  visibleSections: string[]
}

const DEFAULT_VISIBLE_SECTIONS = ['hero', 'about', 'programs', 'gallery', 'contact']
const ALLOWED_IMAGE_HOST_SUFFIXES = ['.supabase.co']
const ALLOWED_IMAGE_HOSTS = new Set(['images.pexels.com', 'thumbs.dreamstime.com'])

function fromParagraphBlocks(contentBlocks: unknown): string {
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

function fromProgramBlocks(contentBlocks: unknown): ProgramCard[] {
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

function fromGalleryBlocks(contentBlocks: unknown): string[] {
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
  if (url.startsWith('/')) return true

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

function createWhatsappClickToChatLink(rawPhone: string | null | undefined, message: string) {
  const raw = String(rawPhone ?? '').trim()
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits || !message.trim()) return null

  let normalized = digits
  if (digits.startsWith('0')) normalized = `27${digits.slice(1)}`
  else if (digits.startsWith('27')) normalized = digits
  else if (raw.startsWith('+')) normalized = raw.replace(/[^\d]/g, '')

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `R${new Intl.NumberFormat('en-ZA').format(amount)}`
}

function parseAgeValue(age: string) {
  const match = age.match(/(\d+)(?:\s*)([my])/i)
  if (!match) return Number.MAX_SAFE_INTEGER
  const value = Number(match[1])
  const unit = match[2]?.toLowerCase()
  return unit === 'y' ? value * 12 : value
}

function formatAgeToken(age: string) {
  return age.replace(/(\d+)\s*([my])/gi, '$1 $2')
}

function formatAgeSummary(ageGroups: string[] | null | undefined) {
  const clean = (ageGroups ?? []).map((age) => age.trim()).filter(Boolean)
  if (clean.length === 0) return 'All ages welcome'

  const ordered = [...clean].sort((a, b) => parseAgeValue(a) - parseAgeValue(b))
  const first = formatAgeToken(ordered[0])
  const last = formatAgeToken(ordered[ordered.length - 1])

  return first === last ? first : `${first} to ${last}`
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

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="space-y-2">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A86C3A]">{eyebrow}</p> : null}
      <h2 className="text-[2rem] leading-[1] tracking-[-0.03em] text-[#22312E] sm:text-[2.35rem]" style={{ fontFamily: 'var(--font-serif)' }}>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B827E]">{label}</p>
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B827E]">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#22312E]">{value}</p>
      </div>
    </div>
  )
}
export function CentreClient({ slug }: { slug: string }) {
  const [centre, setCentre] = useState<Centre | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [existingApplication, setExistingApplication] = useState<ExistingApplication | null>(null)
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentState>({
    aboutText: '',
    programCards: [],
    galleryUrls: [],
    visibleSections: DEFAULT_VISIBLE_SECTIONS,
  })

  useEffect(() => {
    async function fetchCentre() {
      const supabase = createClient()
      let resolvedCentre: Centre | null = null
      const slugCandidates = resolveCentreSlugCandidates(slug)

      if (slugCandidates.length === 0) {
        setCentre(null)
        setWebsiteContent({
          aboutText: '',
          programCards: [],
          galleryUrls: [],
          visibleSections: DEFAULT_VISIBLE_SECTIONS,
        })
        setUserRole(null)
        setExistingApplication(null)
        setLoading(false)
        return
      }

      try {
        const { data: centreRows } = await supabase.from('ecd_centres').select('*').in('slug', slugCandidates).limit(1)
        const centreData = Array.isArray(centreRows) && centreRows.length > 0 ? (centreRows[0] as Centre) : null

        if (centreData) {
          resolvedCentre = centreData
        } else {
          const { data: fallbackRows } = await supabase
            .from('public_ecd_centres')
            .select('*')
            .in('slug', slugCandidates)
            .limit(1)

          resolvedCentre = Array.isArray(fallbackRows) && fallbackRows.length > 0 ? (fallbackRows[0] as Centre) : null
        }

        setCentre(resolvedCentre)

        if (resolvedCentre?.id) {
          const { data: contentRows } = await supabase
            .from('ecd_content')
            .select('section,content_blocks')
            .eq('ecd_id', resolvedCentre.id)
            .in('section', ['about', 'programs', 'gallery', 'website_sections'])

          const sectionMap = new Map((contentRows ?? []).map((row) => [row.section, row.content_blocks]))
          const sections = Array.isArray(sectionMap.get('website_sections'))
            ? (sectionMap.get('website_sections') as string[])
            : DEFAULT_VISIBLE_SECTIONS

          setWebsiteContent({
            aboutText: fromParagraphBlocks(sectionMap.get('about')),
            programCards: fromProgramBlocks(sectionMap.get('programs')),
            galleryUrls: fromGalleryBlocks(sectionMap.get('gallery')),
            visibleSections: sections,
          })
        } else {
          setWebsiteContent({
            aboutText: '',
            programCards: [],
            galleryUrls: [],
            visibleSections: DEFAULT_VISIBLE_SECTIONS,
          })
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const [{ data: profile }, existingApplicationResult] = await Promise.all([
            supabase.from('user_profiles').select('role').eq('id', user.id).single(),
            resolvedCentre?.id
              ? supabase
                  .from('applications')
                  .select('id,status')
                  .eq('parent_id', user.id)
                  .eq('ecd_id', resolvedCentre.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ])

          setUserRole(profile?.role ?? null)
          setExistingApplication(
            existingApplicationResult?.data?.id
              ? {
                  id: existingApplicationResult.data.id,
                  status: existingApplicationResult.data.status ?? null,
                }
              : null
          )
        } else {
          setUserRole(null)
          setExistingApplication(null)
        }
      } catch (error) {
        console.error('[centre-client] Failed to load centre details:', error)
        setCentre(null)
        setWebsiteContent({
          aboutText: '',
          programCards: [],
          galleryUrls: [],
          visibleSections: DEFAULT_VISIBLE_SECTIONS,
        })
        setUserRole(null)
        setExistingApplication(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCentre()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0D9488] border-t-transparent" />
      </div>
    )
  }

  if (!centre) {
    return (
      <main className="min-h-screen bg-[#FAF8F4] py-10 sm:py-16">
        <Container className="max-w-2xl">
          <div className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-6 text-center shadow-[0_14px_34px_rgba(31,44,39,0.05)] sm:p-8">
            <h1 className="text-[2.1rem] leading-none tracking-[-0.03em] text-[#22312E]" style={{ fontFamily: 'var(--font-serif)' }}>
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

  const fallbackHeroImage = getCentreHeroImage(centre.slug, null)
  const heroImage = getSafeImageUrl(getCentreHeroImage(centre.slug, centre.cover_image_url), fallbackHeroImage)
  const centreLogo = centre.logo_url && isSafeImageUrl(centre.logo_url) ? centre.logo_url : null
  const centreInitial = (centre.name?.trim().charAt(0) || 'C').toUpperCase()
  const operationalStatus = getCentreOperationalStatus()
  const isPilotCentre = isPilotCentreIdentity({ name: centre.name, slug: centre.slug })
  const hasOwnerId = typeof centre.owner_id === 'string' && centre.owner_id.trim().length > 0
  const isClaimed = hasOwnerId
  const showPilotTrustInfo = isPilotCentre
  const showUnclaimedDisclaimer = !hasOwnerId
  const pilotBadges = showPilotTrustInfo
    ? [centre.is_registered ? 'Verified ECD' : null, centre.subsidy_accepted ? 'Subsidy friendly' : null, 'Parent-ready profile'].filter(Boolean) as string[]
    : []
  const locationLabel = [centre.suburb?.trim(), centre.city?.trim()].filter(Boolean).join(', ')
  const fallbackAddressLabel = centre.address?.trim() || locationLabel || 'Address shared on request'
  const safeCentreSlug = normalizeCentreSlug(centre.slug) ?? centre.slug
  const claimHref = `/for-centres/register?flow=confirm&claim=${encodeURIComponent(safeCentreSlug)}`
  const showClaimLink = !isClaimed && userRole !== 'parent_user'
  const whatsappHref = createWhatsappClickToChatLink(
    centre.contact_whatsapp || centre.contact_phone || centre.phone,
    `Hi ${centre.name}, I found your centre on CentreConnect and would like to ask about enrolment.`
  )

  const feesLabel = formatFeesLabel(centre)
  const ageGroupsLabel = formatAgeSummary(centre.age_groups)
  const trustLabel = centre.is_registered
    ? centre.subsidy_accepted
      ? 'Verified and subsidy friendly'
      : 'Verified by CentreConnect'
    : isClaimed
      ? 'Profile is live'
      : 'Public listing only'
  const practicalLabel = centre.capacity
    ? `Space for about ${centre.capacity} children`
    : centre.subsidy_accepted
      ? 'Subsidy friendly centre'
      : 'Ask about availability'

  const visibleSectionSet = new Set(websiteContent.visibleSections)
  const showAbout = visibleSectionSet.has('about')
  const showPrograms = visibleSectionSet.has('programs')
  const safeGalleryUrls = websiteContent.galleryUrls.filter((url) => isSafeImageUrl(url))
  const showGallery = visibleSectionSet.has('gallery') && safeGalleryUrls.length > 0
  const showContact = visibleSectionSet.has('contact')
  const aboutCopy =
    websiteContent.aboutText.trim() ||
    centre.description ||
    'This centre provides a safe, warm space for children to learn, play, and settle into a steady routine.'

  const fallbackPrograms: ProgramCard[] = [
    {
      title: 'A calm daily routine',
      description: 'Children move through meals, play, learning time, rest, and collection in a way that feels clear and familiar to parents.',
    },
    {
      title: 'Age-appropriate groups',
      description: 'Babies, toddlers, and older children can be placed into groups that match their age and stage as the centre grows.',
    },
  ]
  const programCards = websiteContent.programCards.length > 0 ? websiteContent.programCards : fallbackPrograms

  const quickFacts = [
    { icon: Wallet, label: 'Fees', value: feesLabel },
    { icon: Baby, label: 'Ages', value: ageGroupsLabel },
    { icon: Clock3, label: 'Hours', value: operationalStatus.schedule },
    { icon: ShieldCheck, label: 'Trust', value: trustLabel },
  ] as const

  const parentHighlights = [
    isClaimed
      ? 'Parents can save this crèche, apply online, and track progress from their phone.'
      : 'Parents can still view the profile now, then contact the centre directly while they finish joining CentreConnect.',
    centre.subsidy_accepted
      ? 'The centre says it accepts subsidy support, which can help families compare fit more quickly.'
      : 'Subsidy support is not listed yet, so it helps to ask directly if that matters for your family.',
    centre.capacity
      ? `The centre says it can care for around ${centre.capacity} children.`
      : 'Capacity is not listed yet, so asking early can help if you need a place soon.',
  ]

  return (
    <main className="min-h-screen bg-[#FAF8F4] pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16">
      <Container className="space-y-8 py-6 sm:py-8 lg:space-y-10">
        <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="overflow-hidden rounded-[2.4rem] border border-[#E7DDD1] bg-white shadow-[0_20px_48px_rgba(31,44,39,0.07)]">
            <div className="relative aspect-[16/10] sm:aspect-[16/9]">
              <Image src={heroImage} alt={centre.name} fill className="object-cover" priority quality={90} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10211D]/72 via-[#10211D]/18 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <div className="flex items-end gap-3">
                  {centreLogo ? (
                    <div className="h-16 w-16 overflow-hidden rounded-[1.5rem] border-2 border-white/90 bg-white shadow-xl">
                      <Image src={centreLogo} alt={`${centre.name} logo`} width={64} height={64} className="h-full w-full object-cover" />
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
                    <h1 className="mt-1 text-[2rem] leading-[0.95] tracking-[-0.03em] text-white sm:text-[2.7rem]" style={{ fontFamily: 'var(--font-serif)' }}>
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
                {Boolean(centre.is_registered) ? <PremiumVerifiedBadge label="Verified ECD" /> : null}
                {centre.subsidy_accepted ? (
                  <Badge className="rounded-full border border-[#E7D6A8] bg-[#FFF5D9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8F6200] shadow-none">
                    Subsidy friendly
                  </Badge>
                ) : null}
                {!isClaimed ? (
                  <Badge className="rounded-full border border-[#DDD5C8] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6A7672] shadow-none">
                    Public listing
                  </Badge>
                ) : null}
              </div>

              {centre.tagline ? <p className="mt-4 text-base leading-7 text-[#5F6C68] sm:text-[17px]">{centre.tagline}</p> : null}

              <p className="mt-4 text-sm leading-7 text-[#5F6C68] sm:text-base">
                Parents want three things quickly here: what the fees look like, which ages are welcome, and whether this centre feels trusted. This page keeps those answers simple.
              </p>

              {showUnclaimedDisclaimer ? (
                <div className="mt-5 rounded-[1.6rem] border border-[#E7D6A8] bg-[#FFF7E7] p-4">
                  <p className="text-sm leading-6 text-[#6C4700]">{UNCLAIMED_CENTRE_DISCLAIMER}</p>
                  {showClaimLink ? (
                    <Link href={claimHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0D9488] hover:underline">
                      Own this crèche? Claim it here <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#E7DDD1] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B827E]">What parents need first</p>
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

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickFacts.map((fact) => (
            <QuickFact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value} />
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_22rem] lg:items-start">
          <div className="space-y-8">
            {showAbout ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-5 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-7">
                <SectionHeading eyebrow="About" title="About this crèche" description="A quick, parent-friendly summary before you decide whether to ask more questions." />
                <p className="mt-5 whitespace-pre-line text-sm leading-8 text-[#4E5D59] sm:text-base">{aboutCopy}</p>
              </section>
            ) : null}

            {showPrograms ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-5 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-7">
                <SectionHeading
                  eyebrow="Daily life"
                  title="What children do here"
                  description="These are the parts of the day most parents usually want to understand before applying."
                />
                <div className={`mt-5 grid gap-4 ${programCards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {programCards.map((program, index) => (
                    <div
                      key={`${program.title}-${index}`}
                      className="rounded-[1.5rem] border border-[#E7DDD1] bg-white p-5 shadow-[0_8px_20px_rgba(31,44,39,0.03)]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDF0E6] text-[#D4935A]">
                        {index % 2 === 0 ? <Sparkles className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </div>
                      <h3 className="mt-4 text-[1.35rem] leading-tight text-[#22312E]" style={{ fontFamily: 'var(--font-serif)' }}>
                        {program.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#5F6C68]">{program.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {showGallery ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-5 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-7">
                <SectionHeading eyebrow="Photos" title="A better look around" description="Parents can scan the space quickly before they decide whether to message or apply." />
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {safeGalleryUrls.slice(0, 12).map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-[1.6rem] border border-[#E7DDD1] bg-white">
                      <Image
                        src={url}
                        alt={`${centre.name} gallery image ${index + 1}`}
                        width={420}
                        height={320}
                        className="h-40 w-full object-cover sm:h-48"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {showContact ? (
              <section className="rounded-[2rem] border border-[#E7DDD1] bg-[#FFFDF9] p-5 shadow-[0_12px_30px_rgba(31,44,39,0.04)] sm:p-7">
                <SectionHeading eyebrow="Practical details" title="Where to find them" description="Simple details for parents who want to visit, call, or compare one more time." />
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B827E]">Next step</p>
                <h3 className="mt-3 text-[2rem] leading-[1.02] tracking-[-0.03em] text-[#22312E]" style={{ fontFamily: 'var(--font-serif)' }}>
                  Ready to ask about a place?
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5F6C68]">
                  Save this crèche if you still want to compare options, or apply now if it already feels like the right fit.
                </p>

                <div className="mt-5 rounded-[1.3rem] border border-[#E7DDD1] bg-white p-4">
                  <p className={`flex items-center gap-2 text-sm font-semibold ${operationalStatus.isOnline ? 'text-emerald-700' : 'text-[#7B827E]'}`}>
                    <Circle className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                    {operationalStatus.label}
                  </p>
                  <p className="mt-1 text-sm text-[#5F6C68]">{operationalStatus.schedule}</p>
                </div>

                {showPilotTrustInfo ? (
                  <div className="mt-5 rounded-[1.5rem] border border-[#E7D6A8] bg-[linear-gradient(135deg,#FFF9E8_0%,#FFF2D2_100%)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {centre.is_registered ? <PremiumVerifiedBadge compact label="Verified ECD" /> : null}
                      {!centre.is_registered ? (
                        <Badge className="rounded-full border border-[#E7D6A8] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8F6200] shadow-none">
                          Verification in progress
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#6C4700]">
                      This listing has stronger details so parents can feel confident before they enquire.
                    </p>
                    {pilotBadges.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pilotBadges.map((badge) => (
                          <span key={badge} className="rounded-full border border-[#E7D6A8] bg-white px-3 py-1 text-[11px] font-semibold text-[#6C4700]">
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
                      This centre is not yet taking digital applications, but parents can still save the listing or message them directly.
                    </p>
                  {showClaimLink ? (
                    <Link href={claimHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0D9488] hover:underline">
                      Own this crèche? Claim it here <ArrowRight className="h-4 w-4" />
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
                    isAvailable={isClaimed}
                    unavailableLabel="Online applications not available yet"
                    helperText={
                      isClaimed ? null : 'You can still save this centre or contact them directly while they finish joining CentreConnect.'
                    }
                    fallbackHref={!isClaimed ? whatsappHref : null}
                    fallbackLabel={!isClaimed && whatsappHref ? 'Chat on WhatsApp' : null}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <ContactCentreSheet centreId={centre.id} centreName={centre.name} />
                    <div className="flex items-center justify-center rounded-2xl border border-[#E7DDD1] bg-white">
                      <SaveCentreButton centreId={centre.id} initialSaved={false} />
                    </div>
                  </div>
                </div>
              </div>

              <CentreContactCard centreId={centre.id} centreName={centre.name} />
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
        ageGroupsLabel={ageGroupsLabel}
        capacityLabel={practicalLabel}
        trustLabel={trustLabel}
        isRegistered={Boolean(centre.is_registered)}
        isClaimed={isClaimed}
        isOnline={operationalStatus.isOnline}
        schedule={operationalStatus.schedule}
        subsidyAccepted={Boolean(centre.subsidy_accepted)}
        userRole={userRole}
        showPilotTrustInfo={showPilotTrustInfo}
        pilotBadges={pilotBadges}
        existingApplicationId={existingApplication?.id ?? null}
        existingApplicationStatus={existingApplication?.status ?? null}
        whatsappHref={whatsappHref}
      />
    </main>
  )
}




