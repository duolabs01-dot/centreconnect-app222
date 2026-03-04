'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  CheckCircle2, 
  Users, 
  Star, 
  Wallet, 
  Clock, 
  MapPin, 
  ShieldCheck,
  Circle,
  BadgeCheck,
  GraduationCap,
  Sparkles,
  Phone,
} from 'lucide-react'

// Import premium UI components
import { HeroPill } from '@/components/ui/hero-pill'
import { StatChip } from '@/components/ui/stat-chip'
import { Section } from '@/components/ui/section'
import { ModernCard } from '@/components/ui/modern-card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Container } from '@/components/layout/container'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { ContactCentreSheet } from './contact-centre-sheet'
import { CentreContactCard } from '@/components/public/CentreContactCard'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { getCentreOperationalStatus } from '@/lib/time/centre-operational-status'
import { MobileCentreDetailsSheet } from './mobile-centre-details-sheet'
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
const ALLOWED_IMAGE_HOSTS = new Set(['images.pexels.com'])

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
        // Primary fetch from centres table, fallback to public view.
        const { data: centreRows } = await supabase
          .from('ecd_centres')
          .select('*')
          .in('slug', slugCandidates)
          .limit(1)

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

        // Get user role if logged in
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#065A82] border-t-transparent" />
      </div>
    )
  }

  if (!centre) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] py-16">
        <Container className="max-w-2xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Centre profile unavailable</h1>
            <p className="mt-3 text-sm font-medium text-slate-600">
              We could not load this centre right now. Please return to Discover and try again.
            </p>
            <div className="mt-6">
              <Link
                href="/directory"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white"
              >
                Back to Discover
              </Link>
            </div>
          </div>
        </Container>
      </main>
    )
  }

  const fallbackHeroImage = getCentreHeroImage(centre.slug, null)
  const heroImage = getSafeImageUrl(getCentreHeroImage(centre.slug, centre.cover_image_url), fallbackHeroImage)
  const operationalStatus = getCentreOperationalStatus()
  const isPilotCentre = isPilotCentreIdentity({ name: centre.name, slug: centre.slug })
  const hasOwnerId = typeof centre.owner_id === 'string' && centre.owner_id.trim().length > 0
  const isClaimed = hasOwnerId
  const showPilotTrustInfo = isPilotCentre
  const showUnclaimedDisclaimer = !hasOwnerId
  const pilotBadges = showPilotTrustInfo
    ? [
    centre.is_registered ? 'Verified' : null,
    centre.is_registered ? 'Priority Listing' : null,
      ].filter(Boolean) as string[]
    : []
  const locationLabel = [centre.suburb?.trim(), centre.city?.trim()].filter(Boolean).join(', ')
  const fallbackAddressLabel = locationLabel || 'Address shared on request'
  const safeCentreSlug = normalizeCentreSlug(centre.slug) ?? centre.slug
  const claimHref = `/for-centres/register?flow=confirm&claim=${encodeURIComponent(safeCentreSlug)}`
  const heroFacts = showPilotTrustInfo
    ? [
        centre.is_registered ? 'DSD Registered' : null,
        centre.subsidy_accepted ? 'Subsidy Friendly' : null,
        'Verified Profile',
        'Open for 2026',
      ].filter(Boolean) as string[]
    : ['Open for 2026']

  const feesLabel = centre.fees_display_mode === 'exact' 
    ? `R${centre.monthly_fee_min}` 
    : centre.fees_display_mode === 'range' 
      ? `R${centre.monthly_fee_min} - R${centre.monthly_fee_max}` 
      : 'Contact Us'
  const visibleSectionSet = new Set(websiteContent.visibleSections)
  const showAbout = visibleSectionSet.has('about')
  const showPrograms = visibleSectionSet.has('programs')
  const safeGalleryUrls = websiteContent.galleryUrls.filter((url) => isSafeImageUrl(url))
  const showGallery = visibleSectionSet.has('gallery') && safeGalleryUrls.length > 0
  const showContact = visibleSectionSet.has('contact')
  const aboutCopy =
    websiteContent.aboutText.trim() ||
    centre.description ||
    'Welcome to our centre. We provide a safe, nurturing environment for your children to learn and grow.'
  const fallbackPrograms: ProgramCard[] = [
    {
      title: 'Holistic Curriculum',
      description:
        'Our play-based learning approach focuses on social, emotional, and cognitive development for all ages.',
    },
    {
      title: 'Age-Appropriate Groups',
      description:
        'Children are grouped by developmental stage to ensure they receive the right level of care and stimulation.',
    },
  ]
  const programCards = websiteContent.programCards.length > 0 ? websiteContent.programCards : fallbackPrograms

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-32">
      {/* Premium Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <Image src={heroImage} alt={centre.name} fill className="object-cover" priority quality={90} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        <Container className="relative h-full">
          <div className="flex h-full flex-col justify-end pb-16">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-black text-white backdrop-blur-xl border border-white/30 shadow-2xl">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                4.8 Premium ECD
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-black text-white backdrop-blur-xl border border-white/30 shadow-2xl">
                <MapPin className="h-3.5 w-3.5" />
                {centre.suburb}, {centre.city}
              </div>
            </div>
            
            <h1 className="text-5xl font-black tracking-tighter text-white sm:text-7xl lg:text-8xl leading-[0.9]">
              {centre.name}
            </h1>
            
            {centre.tagline && (
              <p className="mt-6 max-w-2xl text-xl font-medium text-white/90 sm:text-2xl leading-relaxed">
                {centre.tagline}
              </p>
            )}
          </div>
        </Container>
      </section>

      <Container className="-mt-12 space-y-16 relative z-10">
        {/* Facts Row */}
        <div className="flex flex-wrap gap-3 overflow-x-auto pb-4 scrollbar-none">
          {heroFacts.map((fact) => (
            <HeroPill key={fact} className="whitespace-nowrap bg-white text-slate-900 border-none shadow-xl px-6 py-3 text-sm">
              {fact}
            </HeroPill>
          ))}
        </div>

        {showUnclaimedDisclaimer ? (
          <ModernCard className="space-y-3 border-amber-200 bg-amber-50 text-amber-900">
            <p className="text-sm font-bold leading-relaxed">{UNCLAIMED_CENTRE_DISCLAIMER}</p>
            <Link
              href={claimHref}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-amber-300 bg-white px-4 text-sm font-black text-amber-700"
            >
              Claim & Update
            </Link>
          </ModernCard>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatChip label="Age Groups" value={centre.age_groups?.join(', ') || '3m - 6y'} icon={<Users className="h-6 w-6" />} accent="teal" />
          <StatChip label="Monthly Fee" value={feesLabel} icon={<Wallet className="h-6 w-6" />} accent="teal" />
          <StatChip label="Capacity" value={centre.capacity || 'Varies'} icon={<GraduationCap className="h-6 w-6" />} accent="teal" />
          <StatChip label="Hours" value="07:00 - 17:30" icon={<Clock className="h-6 w-6" />} accent="teal" />
        </div>

        {/* Content Layout */}
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-16">
            
            {showAbout ? (
              <Section id="about" title="About Our Centre">
                <div className="space-y-6">
                  <p className="whitespace-pre-line text-xl leading-relaxed font-medium text-slate-700">{aboutCopy}</p>

                  {centre.capacity ? (
                    <div className="pt-4">
                      <ProgressBar
                        value={82}
                        label="Available Capacity"
                        subLabel="Applying early is recommended to secure your preferred intake date."
                      />
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {showPrograms ? (
              <Section id="programs" title="Programmes & Learning">
                <div className={`grid gap-6 ${programCards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {programCards.map((program, index) => (
                    <ModernCard
                      key={`${program.title}-${index}`}
                      className={`flex flex-col gap-4 border-l-4 ${
                        index % 2 === 0 ? 'border-l-[#065A82]' : 'border-l-cyan-500'
                      }`}
                    >
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                          index % 2 === 0 ? 'bg-[#065A82]/10 text-[#065A82]' : 'bg-cyan-50 text-cyan-600'
                        }`}
                      >
                        {index % 2 === 0 ? <Sparkles className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{program.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{program.description}</p>
                    </ModernCard>
                  ))}
                </div>
              </Section>
            ) : null}

            {showGallery ? (
              <Section id="gallery" title="Gallery">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {safeGalleryUrls.slice(0, 12).map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                      <Image
                        src={url}
                        alt={`${centre.name} gallery image ${index + 1}`}
                        width={420}
                        height={320}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {showContact ? (
              <Section id="location" title="Location & Contact">
                <div className="grid gap-6 sm:grid-cols-2">
                  <ModernCard className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Address</p>
                        <p className="text-sm font-bold text-slate-900">{centre.address || fallbackAddressLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Phone</p>
                        <p className="text-sm font-bold text-slate-900">{centre.contact_phone || 'Available on request'}</p>
                      </div>
                    </div>
                  </ModernCard>
                  <div className="h-[240px] rounded-[2rem] bg-slate-100 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Map View Coming Soon</p>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

          </div>

          {/* Sidebar */}
          <aside className="hidden space-y-6 lg:block">
            <ModernCard className="sticky top-24 space-y-8 border-t-8 border-t-[#065A82] shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admissions</p>
                  <ShieldCheck className="h-6 w-6 text-[#065A82]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Apply for a Spot</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Secure and transparent application process managed through CentreConnect.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    No application fees. Only pay once your child is accepted.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className={`flex items-center gap-2 text-sm font-bold ${operationalStatus.isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <Circle className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                  {operationalStatus.isOnline ? 'Online' : 'Offline'}
                </p>
                <p className="mt-1 text-xs text-slate-600">{operationalStatus.schedule}</p>
              </div>

              {showPilotTrustInfo ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">DSD checklist</p>
                  <ul className="mt-2 space-y-1.5 text-xs text-emerald-900">
                    <li className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      {centre.is_registered ? 'DSD registered' : 'DSD registration in progress'}
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      Safety and compliance oversight expected.
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-emerald-700" />
                      Subsidy readiness supports quality operations.
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-emerald-900/90">
                    Government subsidy = higher quality & safety oversight.
                  </p>
                </div>
              ) : null}

              {pilotBadges.length > 0 ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Pilot advantages</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pilotBadges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-bold text-teal-700"
                      >
                        <BadgeCheck className="h-3 w-3" />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isClaimed ? (
                <Link
                  href={claimHref}
                  className="flex h-11 items-center justify-center rounded-2xl border border-teal-600 bg-white px-4 text-sm font-black text-teal-700"
                >
                  Claim & Update
                </Link>
              ) : null}

              <div className="space-y-3 pt-4">
                <ApplyCTA
                  variant="hero"
                  centreSlug={centre.slug}
                  userRole={userRole}
                  existingApplicationId={existingApplication?.id ?? null}
                  existingApplicationStatus={existingApplication?.status ?? null}
                />
                <div className="grid grid-cols-2 gap-2">
                  <ContactCentreSheet centreId={centre.id} centreName={centre.name} />
                  <SaveCentreButton centreId={centre.id} initialSaved={false} />
                </div>
              </div>
            </ModernCard>

            <CentreContactCard centreId={centre.id} centreName={centre.name} />
          </aside>
        </div>
      </Container>

      <MobileCentreDetailsSheet
        centreId={centre.id}
        centreSlug={centre.slug}
        centreName={centre.name}
        locationLabel={locationLabel}
        feesLabel={feesLabel}
        isRegistered={Boolean(centre.is_registered)}
        isClaimed={isClaimed}
        isOnline={operationalStatus.isOnline}
        schedule={operationalStatus.schedule}
        userRole={userRole}
        showPilotTrustInfo={showPilotTrustInfo}
        pilotBadges={pilotBadges}
        existingApplicationId={existingApplication?.id ?? null}
        existingApplicationStatus={existingApplication?.status ?? null}
      />
    </main>
  )
}
