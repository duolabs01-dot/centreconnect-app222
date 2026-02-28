import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import type { TransportConfig } from '@/components/public/TransportSection'
import { TransportSection } from '@/components/public/TransportSection'
import { InteractionActions } from './interaction-actions'
import { ContactCentreSheet } from './contact-centre-sheet'
import { ShareCentreSheet } from './share-centre-sheet'
import { CentreContactCard } from '@/components/public/CentreContactCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { formatDate, formatLongDate } from '@/lib/utils'
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Star, 
  Wallet, 
  Clock, 
  MapPin, 
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Sparkles
} from 'lucide-react'

// Import premium UI components
import { HeroPill } from '@/components/ui/hero-pill'
import { StatChip } from '@/components/ui/stat-chip'
import { Section } from '@/components/ui/section'
import { ModernCard } from '@/components/ui/modern-card'
import { ProgressBar } from '@/components/ui/progress-bar'

type CentrePageProps = {
  params: {
    slug: string
  }
}

type Centre = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  email: string | null
  phone: string | null
  address: string | null
  suburb: string
  city: string
  province: string
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
  ecd_content: Array<{
    id: string
    section: string
    content_blocks: unknown
  }> | null
  ecd_media: EcdMedia[] | null
}

type EcdMedia = {
  id: string
  title: string | null
  alt_text: string | null
  storage_path: string
}

type Job = {
  id: string
  title: string
  role_type: string
  description: string | null
  requirements: string | null
  closes_at: string | null
}

function toWhatsAppHref(raw: string | null) {
  if (!raw) return null
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

function toCallHref(raw: string | null) {
  if (!raw) return null
  return `tel:${raw}`
}

const getCentreBySlug = cache(async (slug: string): Promise<Centre | null> => {
  try {
    const supabase = await createClient()
    const { data: centre, error } = await supabase
      .from('ecd_centres')
      .select(
        `id,slug,name,tagline,description,email,phone,address,suburb,city,province,age_groups,logo_url,cover_image_url,is_registered,capacity,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,fees_notes,fees_last_updated_at,contact_whatsapp,contact_phone,
        ecd_content(id,section,content_blocks),
        ecd_media(id,title,alt_text,storage_path)`
      )
      .eq('slug', slug)
      .single()

    if (!error && centre) {
      return {
        id: centre.id,
        slug: centre.slug,
        name: centre.name ?? 'Unnamed centre',
        tagline: centre.tagline ?? null,
        description: centre.description ?? null,
        email: centre.email ?? null,
        phone: centre.phone ?? null,
        address: centre.address ?? null,
        suburb: centre.suburb,
        city: centre.city,
        province: centre.province,
        age_groups: centre.age_groups ?? null,
        logo_url: centre.logo_url ?? null,
        cover_image_url: centre.cover_image_url ?? null,
        is_registered: centre.is_registered ?? false,
        capacity: centre.capacity ?? null,
        fees_display_mode: centre.fees_display_mode ?? 'range',
        monthly_fee_min: centre.monthly_fee_min ?? null,
        monthly_fee_max: centre.monthly_fee_max ?? null,
        registration_fee: centre.registration_fee ?? null,
        subsidy_accepted: centre.subsidy_accepted ?? false,
        fees_notes: centre.fees_notes ?? null,
        fees_last_updated_at: centre.fees_last_updated_at ?? null,
        contact_whatsapp: centre.contact_whatsapp ?? null,
        contact_phone: centre.contact_phone ?? null,
        ecd_content: (centre.ecd_content ?? []) as Array<{
          id: string
          section: string
          content_blocks: unknown
        }>,
        ecd_media: (centre.ecd_media ?? []) as EcdMedia[],
      }
    }

    const fallbackResponse = await supabase
      .from('public_ecd_centres')
      .select(
        'id,slug,name,tagline,description,suburb,city,province,age_groups,logo_url,cover_image_url,is_registered,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,fees_notes,fees_last_updated_at,contact_whatsapp,contact_phone'
      )
      .eq('slug', slug)
      .maybeSingle()

    if (!fallbackResponse.data) return null
    const fallbackData = fallbackResponse.data

    return {
      id: fallbackData.id,
      slug: fallbackData.slug,
      name: fallbackData.name ?? 'Unnamed centre',
      tagline: fallbackData.tagline ?? null,
      description: fallbackData.description ?? null,
      email: null,
      phone: fallbackData.contact_phone ?? null,
      address: null,
      suburb: fallbackData.suburb,
      city: fallbackData.city,
      province: fallbackData.province ?? 'Unknown',
      age_groups: fallbackData.age_groups ?? null,
      logo_url: fallbackData.logo_url ?? null,
      cover_image_url: fallbackData.cover_image_url ?? null,
      is_registered: fallbackData.is_registered ?? false,
      capacity: null,
      fees_display_mode: fallbackData.fees_display_mode ?? 'range',
      monthly_fee_min: fallbackData.monthly_fee_min ?? null,
      monthly_fee_max: fallbackData.monthly_fee_max ?? null,
      registration_fee: fallbackData.registration_fee ?? null,
      subsidy_accepted: fallbackData.subsidy_accepted ?? false,
      fees_notes: fallbackData.fees_notes ?? null,
      fees_last_updated_at: fallbackData.fees_last_updated_at ?? null,
      contact_whatsapp: fallbackData.contact_whatsapp ?? null,
      contact_phone: fallbackData.contact_phone ?? null,
      ecd_content: [],
      ecd_media: [],
    }
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: CentrePageProps): Promise<Metadata> {
  const centre = await getCentreBySlug(params.slug)
  if (!centre) return { title: 'Centre Not Found' }

  return {
    title: `${centre.name} | CentreConnect`,
    description: centre.tagline ?? centre.description ?? `Learn about ${centre.name}.`,
  }
}

export default async function CentrePage({ params }: CentrePageProps) {
  const centre = await getCentreBySlug(params.slug)
  if (!centre) notFound()

  const heroImage = getCentreHeroImage(centre.slug, centre.cover_image_url)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [mediaResult, jobsResult, transportResult, profileResult] = await Promise.all([
    supabase.from('ecd_media').select('id,storage_path,file_name').eq('ecd_id', centre.id).limit(6),
    supabase.from('jobs').select('id,title,role_type,description,requirements,closes_at').eq('ecd_id', centre.id).eq('is_published', true).limit(4),
    supabase.from('transport_configs').select('offers_transport,fee_per_month,fee_description,coverage_areas,notes').eq('ecd_id', centre.id).maybeSingle(),
    user ? supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
  ])

  const userRole = profileResult.data?.role ?? null
  const transportConfig: TransportConfig | null = transportResult.data ?? null
  const jobs: Job[] = jobsResult.data ?? []
  const media = mediaResult.data ?? []

  const heroFacts = [
    centre.is_registered ? 'DSD Registered' : null,
    centre.subsidy_accepted ? 'Subsidy Friendly' : null,
    transportConfig?.offers_transport ? 'Transport Available' : null,
    'Verified Profile'
  ].filter(Boolean) as string[]

  const feesLabel = centre.fees_display_mode === 'exact' 
    ? `R${centre.monthly_fee_min}` 
    : centre.fees_display_mode === 'range' 
      ? `R${centre.monthly_fee_min} - R${centre.monthly_fee_max}` 
      : 'Contact Us'

  const programs = (centre.ecd_content ?? []).find(s => s.section === 'programs')?.content_blocks as any[] ?? []

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-32">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        <Image src={heroImage} alt={centre.name} fill className="object-cover" priority quality={90} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <PageContainer className="relative h-full">
          <div className="flex h-full flex-col justify-end pb-12">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/30">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                4.8 Premium
              </div>
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/30">
                <MapPin className="h-3 w-3" />
                {centre.suburb}, {centre.city}
              </div>
            </div>
            
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              {centre.name}
            </h1>
            
            {centre.tagline && (
              <p className="mt-4 max-w-2xl text-lg font-medium text-white/80 sm:text-xl">
                {centre.tagline}
              </p>
            )}
          </div>
        </PageContainer>
      </section>

      <PageContainer className="-mt-8 space-y-12">
        {/* Quick Facts Pill Row */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none relative z-10">
          {heroFacts.map((fact) => (
            <HeroPill key={fact}>{fact}</HeroPill>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatChip label="Ages" value={centre.age_groups?.join(', ') || 'All ages'} icon={<Users className="h-5 w-5" />} accent="teal" />
          <StatChip label="Monthly Fee" value={feesLabel} icon={<Wallet className="h-5 w-5" />} accent="teal" />
          <StatChip label="Capacity" value={centre.capacity || 'Varies'} icon={<GraduationCap className="h-5 w-5" />} accent="teal" />
          <StatChip label="Hours" value="07:00 - 17:30" icon={<Clock className="h-5 w-5" />} accent="teal" />
        </div>

        {/* Main Content Split */}
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            {/* About Section */}
            <Section id="about" emoji="👋" title="About Us">
              <p className="text-lg leading-relaxed">
                {centre.description || 'Welcome to our centre. We provide a safe, nurturing environment for your children to learn and grow.'}
              </p>
              
              {centre.capacity && (
                <div className="mt-8">
                  <ProgressBar 
                    value={85} 
                    label="Current Enrollment" 
                    subLabel={`${centre.capacity} total capacity available`} 
                  />
                </div>
              )}
            </Section>

            {/* Gallery Section */}
            {media.length > 0 && (
              <Section emoji="📸" title="Gallery">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {media.map((item) => (
                    <ModernCard key={item.id} className="p-0 overflow-hidden aspect-square relative group">
                      <Image 
                        src={supabase.storage.from('ecd-media').getPublicUrl(item.storage_path).data.publicUrl} 
                        alt={item.file_name || 'Gallery image'}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </ModernCard>
                  ))}
                </div>
              </Section>
            )}

            {/* Programs Section */}
            {programs.length > 0 && (
              <Section emoji="🎓" title="Our Programmes">
                <div className="grid gap-4 sm:grid-cols-2">
                  {programs.map((prog, i) => (
                    <ModernCard key={i} className="flex flex-col gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#065A82]/10 text-[#065A82]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-slate-900">{prog.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{prog.description}</p>
                    </ModernCard>
                  ))}
                </div>
              </Section>
            )}

            {/* Transport Section */}
            <Section emoji="🚐" title="Transport & Logistics">
              <TransportSection centre={{ id: centre.id, name: centre.name }} transport={transportConfig} />
            </Section>
          </div>

          {/* Sidebar Sidebar */}
          <aside className="space-y-6">
            <ModernCard className="sticky top-24 space-y-6 border-t-4 border-t-[#065A82]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Applications</p>
                  <h3 className="text-xl font-black text-slate-900">Get a Spot</h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#065A82] flex items-center justify-center text-white shadow-lg">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              
              <p className="text-sm text-slate-500 leading-relaxed">
                We manage our applications through CentreConnect to ensure a fair and transparent process for all families.
              </p>

              <div className="space-y-3">
                <ApplyCTA variant="hero" centreSlug={centre.slug} userRole={userRole} />
                <ContactCentreSheet centreId={centre.id} centreName={centre.name} />
                <SaveCentreButton centreId={centre.id} initialSaved={false} />
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Instant application confirmation</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Secure document handling</p>
                </div>
              </div>
            </ModernCard>

            <CentreContactCard centreId={centre.id} centreName={centre.name} />
          </aside>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col items-center justify-center gap-6 pt-12 text-center">
          <Sparkles className="h-12 w-12 text-[#065A82]/20" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Think this is the one?</h2>
            <p className="text-slate-500">Secure your child&apos;s spot at {centre.name} today.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <ApplyCTA variant="hero" centreSlug={centre.slug} userRole={userRole} />
            <ShareCentreSheet centreName={centre.name} centreSlug={centre.slug} suburb={centre.suburb} city={centre.city} />
          </div>
        </div>
      </PageContainer>

      {/* Persistent Floating Bottom Actions */}
      <div className="fixed bottom-24 inset-x-4 z-40 md:hidden">
        <div className="bg-[#1A1A2E] rounded-pill p-2 shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-xl">
          <div className="flex-1 pl-4">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">Starting from</p>
            <p className="text-base font-bold text-white leading-tight">{feesLabel}</p>
          </div>
          <div className="flex-1">
            <ApplyCTA variant="hero" centreSlug={centre.slug} userRole={userRole} />
          </div>
        </div>
      </div>
    </main>
  )
}

function SectionHeader({
  emoji,
  title,
  titleClass = 'text-foreground',
  emojiSize = 'text-2xl',
}: {
  emoji: string
  title: string
  titleClass?: string
  emojiSize?: string
}) {
  return (
    <div className="flex items-center gap-3">
      {!!emoji && <span className={emojiSize}>{emoji}</span>}
      <h2 className={cn('text-2xl font-bold', titleClass)}>{title}</h2>
    </div>
  )
}

function JobTeaserCard({ job, centreSlug }: { job: Job; centreSlug: string }) {
  const isExpired = job.closes_at ? new Date(job.closes_at) < new Date() : false
  if (isExpired) return null
  return (
    <Link href={`/c/${centreSlug}/jobs/${job.id}`} className="group">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevation-1)] transition-all hover:border-cyan-500/30 hover:bg-muted">
        <div>
          <p className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-cyan-700">{job.title}</p>
          {job.closes_at ? (
            <p className="text-xs text-slate-500">Apply by {formatDate(job.closes_at)}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-cyan-700 text-sm font-medium">
          View & Apply <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}
