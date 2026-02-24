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
import { ArrowRight, CheckCircle2 } from 'lucide-react'

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

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
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

function formatEventDate(value: string) {
  return formatLongDate(value)
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

    const fallback = await supabase
      .from('public_ecd_centres')
      .select(
        'id,slug,name,tagline,description,suburb,city,province,age_groups,logo_url,cover_image_url,is_registered,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,fees_notes,fees_last_updated_at,contact_whatsapp,contact_phone'
      )
      .eq('slug', slug)
      .maybeSingle()

    if (!fallback.data) return null

    return {
      id: fallback.data.id,
      slug: fallback.data.slug,
      name: fallback.data.name ?? 'Unnamed centre',
      tagline: fallback.data.tagline ?? null,
      description: fallback.data.description ?? null,
      email: null,
      phone: fallback.data.contact_phone ?? null,
      address: null,
      suburb: fallback.data.suburb,
      city: fallback.data.city,
      province: fallback.data.province,
      age_groups: fallback.data.age_groups ?? null,
      logo_url: fallback.data.logo_url ?? null,
      cover_image_url: fallback.data.cover_image_url ?? null,
      is_registered: fallback.data.is_registered ?? false,
      capacity: null,
      fees_display_mode: fallback.data.fees_display_mode ?? 'range',
      monthly_fee_min: fallback.data.monthly_fee_min ?? null,
      monthly_fee_max: fallback.data.monthly_fee_max ?? null,
      registration_fee: fallback.data.registration_fee ?? null,
      subsidy_accepted: fallback.data.subsidy_accepted ?? false,
      fees_notes: fallback.data.fees_notes ?? null,
      fees_last_updated_at: fallback.data.fees_last_updated_at ?? null,
      contact_whatsapp: fallback.data.contact_whatsapp ?? null,
      contact_phone: fallback.data.contact_phone ?? null,
      ecd_content: [],
      ecd_media: [],
    }
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: CentrePageProps): Promise<Metadata> {
  const centre = await getCentreBySlug(params.slug)

  if (!centre) {
    return {
      title: 'Centre Not Found | CentreConnect',
      description: 'This centre could not be found.',
    }
  }

  const title = `${centre.name} \u2014 ECD Centre in ${centre.suburb} | CentreConnect`
  const description =
    centre.tagline ?? centre.description ?? `Learn about ${centre.name} in ${centre.suburb}.`

  return {
    title,
    description,
    openGraph: {
      title: centre.name,
      description: centre.tagline ?? '',
      images: centre.cover_image_url ? [centre.cover_image_url] : [],
    },
  }
}

export default async function CentrePage({ params }: CentrePageProps) {
  const centre = await getCentreBySlug(params.slug)

  if (!centre) {
    notFound()
  }

  const heroImage = getCentreHeroImage(centre.slug, centre.cover_image_url)

  const programsSection = (centre.ecd_content ?? []).find((section) => section.section === 'programs')
  const aboutSection = (centre.ecd_content ?? []).find((section) => section.section === 'about')
  const aboutLines = Array.isArray(aboutSection?.content_blocks)
    ? (aboutSection?.content_blocks as Array<{ content?: string }>)
        .map((block) => (typeof block?.content === 'string' ? block.content.trim() : ''))
        .filter(Boolean)
    : []
  const aboutText =
    aboutLines.length > 0
      ? aboutLines.join(' ')
      : centre.description || 'This centre has not added an about description yet.'
  const programs = Array.isArray(programsSection?.content_blocks)
    ? (programsSection?.content_blocks as Array<{ title?: string; description?: string }>)
    : []
  const supabase = await createClient()
  const authResultPromise = supabase.auth.getUser()
  const mediaPromise = supabase
    .from('ecd_media')
    .select('id,storage_path,file_name')
    .eq('ecd_id', centre.id)
    .limit(6)
  const jobsPromise = supabase
    .from('jobs')
    .select('id,title,role_type,description,requirements,closes_at')
    .eq('ecd_id', centre.id)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(8)
  const transportPromise = supabase
    .from('transport_configs')
    .select('offers_transport,fee_per_month,fee_description,coverage_areas,notes')
    .eq('ecd_id', centre.id)
    .maybeSingle()
  const {
    data: { user },
  } = await authResultPromise
  const { data: savedRow } = user
    ? await supabase
        .from('parent_shortlists')
        .select('id')
        .eq('parent_id', user.id)
        .eq('centre_id', centre.id)
        .maybeSingle()
    : { data: null }
  const initialSaved = Boolean(savedRow)
  let userRole: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    userRole = profile?.role ?? null
  }

  const [mediaResult, jobsResult, transportResult] = await Promise.all([mediaPromise, jobsPromise, transportPromise])

  const media = (mediaResult.error ? [] : mediaResult.data ?? []) as Array<{
    id: string
    storage_path: string
    file_name: string | null
  }>
  const jobs: Job[] = jobsResult.error ? [] : jobsResult.data ?? []
  const transportConfig: TransportConfig | null = transportResult.error ? null : transportResult.data ?? null
  const heroFacts = [
    centre.age_groups && centre.age_groups.length ? `Ages ${centre.age_groups.join(', ')}` : null,
    `${centre.suburb}, ${centre.city}`,
    centre.subsidy_accepted ? 'Subsidy friendly' : null,
  ].filter(Boolean)

  const feesLabel =
    centre.fees_display_mode === 'exact' && centre.monthly_fee_min !== null
      ? `R${centre.monthly_fee_min} / month`
      : centre.fees_display_mode === 'range' &&
          centre.monthly_fee_min !== null &&
          centre.monthly_fee_max !== null
        ? `R${centre.monthly_fee_min} - R${centre.monthly_fee_max} / month`
        : centre.fees_display_mode === 'contact'
          ? 'Contact centre for fees'
          : 'Contact centre for fees'

  const statChips: Array<{ label: string; value: string; accent?: 'emerald' }> = [
    {
      label: 'Ages',
      value: centre.age_groups && centre.age_groups.length ? centre.age_groups.join(', ') : 'Not specified',
    },
    {
      label: 'Fees',
      value: feesLabel,
    },
    {
      label: 'Capacity',
      value: centre.capacity ? `${centre.capacity} children` : 'Capacity varies',
    },
    {
      label: 'Verified',
      value: centre.subsidy_accepted ? 'Subsidy accepted' : 'Verification pending',
      accent: centre.subsidy_accepted ? 'emerald' : undefined,
    },
  ]

  return (
    <main className="pb-28 bg-gradient-to-b from-cyan-50/40 via-white to-slate-50">
      <PageContainer>
        <section className="relative min-h-[60vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-[var(--shadow-elevation-4)]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt={`${centre.name} hero`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-end gap-6 p-6 md:p-10">
            {centre.logo_url ? (
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/30 bg-slate-950 shadow-[var(--shadow-elevation-4)]">
                  <Image
                    src={centre.logo_url}
                    alt={`${centre.name} logo`}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">ECD centre</p>
                  <p className="text-sm text-white/70">{centre.tagline}</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-3xl font-black leading-tight md:text-5xl">{centre.name}</h1>
                {centre.is_registered ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> DSD Registered
                  </span>
                ) : null}
              </div>
              <SaveCentreButton centreId={centre.id} initialSaved={initialSaved} />
            </div>
            {centre.tagline ? (
              <p className="text-lg text-white/70 max-w-2xl">{centre.tagline}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {heroFacts.map((fact) => (
                <HeroPill key={fact}>{fact}</HeroPill>
              ))}
            </div>
            {centre.age_groups?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {(centre.age_groups ?? []).map((group) => (
                  <span key={group} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {group}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <ApplyCTA variant="hero" centreSlug={centre.slug} userRole={userRole} />
              <ContactCentreSheet centreId={centre.id} centreName={centre.name} />
              <ShareCentreSheet
                centreName={centre.name}
                centreSlug={centre.slug}
                suburb={centre.suburb ?? null}
                city={centre.city ?? null}
              />
              <a
                href="#about"
                className="flex items-center justify-center rounded-2xl border border-white/30 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.25em] text-white transition-colors hover:bg-white/10"
              >
                  Learn more
                </a>
            </div>
            <div className="max-w-3xl">
              <InteractionActions
                ecdId={centre.id}
                whatsappHref={toWhatsAppHref(centre.contact_whatsapp)}
                callHref={toCallHref(centre.contact_phone ?? centre.phone)}
              />
            </div>
          </div>
        </section>

        {media.length > 0 && (
          <section className="mt-4 grid grid-cols-3 gap-2">
            {media.map((item) => (
              <div key={item.id} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={supabase.storage.from('ecd-media').getPublicUrl(item.storage_path).data.publicUrl}
                  alt={item.file_name ?? `${centre.name} gallery image`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </section>
        )}

        <div className="mt-6">
          <CentreContactCard centreId={centre.id} centreName={centre.name} />
        </div>

        <div className="sticky top-0 z-20 mt-6 rounded-2xl border border-white/10 bg-white/90 px-4 py-3 shadow-[var(--shadow-elevation-3)] shadow-cyan-900/10 backdrop-blur md:px-6">
          <div className="flex items-center gap-4 overflow-x-auto text-sm text-slate-600 scrollbar-none">
            {statChips.map((chip) => (
              <StatChip key={chip.label} {...chip} />
            ))}
          </div>
        </div>

        <Section id="about" emoji="" title="About Us">
          <p className="text-foreground/80 text-lg leading-relaxed">{aboutText}</p>
        </Section>

        {programs.length > 0 && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-50/80 to-emerald-50/80 p-6 shadow-[var(--shadow-elevation-4)] dark:from-cyan-950/20 dark:to-emerald-950/20">
            <SectionHeader title="Our Programmes" emoji="" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {programs.map((program, index) => (
                <div
                  key={`${program.title ?? 'program'}-${index}`}
                  className="glass-card rounded-2xl border border-white/10 p-5 text-slate-900 shadow-[var(--shadow-elevation-3)] shadow-black/10"
                >
                  <p className="text-lg font-semibold text-slate-900">{program.title || `Programme ${index + 1}`}</p>
                  <p className="mt-2 text-sm text-slate-700">{program.description || 'Details coming soon.'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <TransportSection centre={{ id: centre.id, name: centre.name }} transport={transportConfig} />

        {jobs.length > 0 && (
          <section className="mt-14 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[var(--shadow-elevation-4)]">
            <SectionHeader emoji="" title="Join Our Team" emojiSize="text-3xl" />
            <div className="mt-6 space-y-3">
              {jobs.map((job) => (
                <JobTeaserCard key={job.id} job={job} centreSlug={centre.slug} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

    </main>
  )
}

function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
      {children}
    </span>
  )
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'emerald'
}) {
  return (
    <div className="flex flex-col items-center min-w-[120px] text-center">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</span>
      <span
        className={cn(
          'mt-1 text-sm font-semibold whitespace-nowrap',
          accent === 'emerald' ? 'text-emerald-600' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
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

function Section({
  id,
  emoji,
  title,
  className,
  children,
}: {
  id?: string
  emoji: string
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={cn('mt-10 rounded-2xl border border-white/10 bg-white/95 p-6 shadow-[var(--shadow-elevation-4)]', className)}>
      <SectionHeader emoji={emoji} title={title} />
      <div className="mt-4 text-base text-foreground/80">{children}</div>
    </section>
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


