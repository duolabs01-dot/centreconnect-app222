import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { normalizeCentreSlug, resolveCentreSlugCandidates } from '@/lib/ecd/centre-slug'
import {
  CentreClient,
  DEFAULT_VISIBLE_SECTIONS,
  fromGalleryBlocks,
  fromParagraphBlocks,
  fromProgramBlocks,
  type Centre,
  type ExistingApplication,
  type WebsiteContentState,
} from './centre-client'
import { demoCentrePageBySlug, shouldUseDemoCentreData } from '@/lib/demo/demo-centres'

type MetadataCentre = {
  name: string
  tagline: string | null
}

type CentrePagePayload = {
  centre: Centre | null
  websiteContent: WebsiteContentState
  userRole: string | null
  existingApplication: ExistingApplication | null
}

const PUBLIC_CENTRE_SELECT = [
  'id',
  'slug',
  'name',
  'tagline',
  'description',
  'suburb',
  'city',
  'province',
  'postal_code',
  'age_groups',
  'logo_url',
  'cover_image_url',
  'primary_color',
  'is_registered',
  'fees_display_mode',
  'monthly_fee_min',
  'monthly_fee_max',
  'registration_fee',
  'subsidy_accepted',
  'contact_whatsapp',
  'contact_phone',
].join(',')

const PRIVATE_CENTRE_SELECT = [
  'id',
  'slug',
  'name',
  'suburb',
  'age_groups',
  'is_registered',
  'cover_image_url',
].join(',')

const PRIVATE_CENTRE_ENRICHMENT_SELECT = [
  'id',
  'email',
  'phone',
  'address',
  'capacity',
  'fees_display_mode',
  'monthly_fee_min',
  'monthly_fee_max',
  'registration_fee',
  'subsidy_accepted',
  'contact_whatsapp',
  'contact_phone',
  'onboarding_complete',
  'website_published',
  'communication_automation_settings',
  'owner_id',
].join(',')

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function buildEmptyPayload(): CentrePagePayload {
  return {
    centre: null,
    websiteContent: {
      aboutText: '',
      programCards: [],
      galleryUrls: [],
      visibleSections: DEFAULT_VISIBLE_SECTIONS,
    },
    userRole: null,
    existingApplication: null,
  }
}

async function loadPublicCentreRow(supabase: SupabaseServerClient, slugCandidates: string[]): Promise<Partial<Centre> | null> {
  try {
    const { data, error } = await supabase
      .from('public_ecd_centres')
      .select(PUBLIC_CENTRE_SELECT)
      .in('slug', slugCandidates)
      .limit(1)

    if (error) {
      console.error('[centre-page] public_ecd_centres lookup failed:', error)
      return null
    }

    return Array.isArray(data) && data.length > 0 ? (data[0] as Partial<Centre>) : null
  } catch (error) {
    console.error('[centre-page] Unexpected public centre lookup failure:', error)
    return null
  }
}

async function loadPrivateCentreRow(supabase: SupabaseServerClient, slugCandidates: string[]): Promise<Partial<Centre> | null> {
  try {
    const { data, error } = await supabase
      .from('ecd_centres')
      .select(PRIVATE_CENTRE_SELECT)
      .in('slug', slugCandidates)
      .limit(1)

    if (error) {
      console.error('[centre-page] ecd_centres base lookup failed:', error)
      return null
    }

    return Array.isArray(data) && data.length > 0 ? (data[0] as Partial<Centre>) : null
  } catch (error) {
    console.error('[centre-page] Unexpected private centre base lookup failure:', error)
    return null
  }
}

async function loadPrivateCentreEnrichment(supabase: SupabaseServerClient, centreId: string): Promise<Partial<Centre> | null> {
  try {
    const { data, error } = await supabase
      .from('ecd_centres')
      .select(PRIVATE_CENTRE_ENRICHMENT_SELECT)
      .eq('id', centreId)
      .maybeSingle()

    if (error) {
      console.error('[centre-page] ecd_centres enrichment lookup failed:', error)
      return null
    }

    return data ? (data as Partial<Centre>) : null
  } catch (error) {
    console.error('[centre-page] Unexpected private centre enrichment failure:', error)
    return null
  }
}

async function loadCentreClassrooms(
  supabase: SupabaseServerClient,
  centreId: string
): Promise<NonNullable<Centre['classrooms']>> {
  try {
    const { data, error } = await supabase
      .from('ecd_classes')
      .select('id,name,age_group,practitioner_name')
      .eq('ecd_id', centreId)
      .order('created_at', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[centre-page] ecd_classes lookup failed:', error)
      return []
    }

    return Array.isArray(data) ? (data as NonNullable<Centre['classrooms']>) : []
  } catch (error) {
    console.error('[centre-page] Unexpected classroom lookup failure:', error)
    return []
  }
}

async function loadWebsiteContent(
  supabase: SupabaseServerClient,
  centreId: string
): Promise<WebsiteContentState> {
  const emptyContent: WebsiteContentState = {
    aboutText: '',
    programCards: [],
    galleryUrls: [],
    visibleSections: DEFAULT_VISIBLE_SECTIONS,
  }

  try {
    const { data, error } = await supabase
      .from('ecd_content')
      .select('section,content_blocks')
      .eq('ecd_id', centreId)
      .in('section', ['about', 'programs', 'gallery', 'website_sections'])

    if (error) {
      console.error('[centre-page] ecd_content lookup failed:', error)
      return emptyContent
    }

    const sectionMap = new Map((data ?? []).map((row) => [row.section, row.content_blocks]))
    return {
      aboutText: fromParagraphBlocks(sectionMap.get('about')),
      programCards: fromProgramBlocks(sectionMap.get('programs')),
      galleryUrls: fromGalleryBlocks(sectionMap.get('gallery')),
      visibleSections: Array.isArray(sectionMap.get('website_sections'))
        ? (sectionMap.get('website_sections') as string[])
        : DEFAULT_VISIBLE_SECTIONS,
    }
  } catch (error) {
    console.error('[centre-page] Unexpected website content lookup failure:', error)
    return emptyContent
  }
}

async function loadCentrePagePayload(slugCandidates: string[]): Promise<CentrePagePayload> {
  const emptyPayload = buildEmptyPayload()
  if (slugCandidates.length === 0) return emptyPayload

  if (shouldUseDemoCentreData()) {
    const match = slugCandidates.map((slug) => demoCentrePageBySlug[slug]).find(Boolean)
    return match ?? emptyPayload
  }

  try {
    const supabase = await createClient()
    const publicCentre = await loadPublicCentreRow(supabase, slugCandidates)
    const privateCentre = await loadPrivateCentreRow(supabase, slugCandidates)
    const baseCentre = privateCentre ? { ...publicCentre, ...privateCentre } : publicCentre

    if (!baseCentre?.id) {
      return emptyPayload
    }

    const [enrichment, classrooms, websiteContent] = await Promise.all([
      loadPrivateCentreEnrichment(supabase, baseCentre.id),
      loadCentreClassrooms(supabase, baseCentre.id),
      loadWebsiteContent(supabase, baseCentre.id),
    ])

    const resolvedCentre = {
      ...baseCentre,
      ...enrichment,
      classrooms,
    } as Centre

    const payload: CentrePagePayload = {
      centre: resolvedCentre,
      websiteContent,
      userRole: null,
      existingApplication: null,
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return payload
    }

    const [{ data: profile, error: profileError }, { data: application, error: applicationError }] = await Promise.all([
      supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase
        .from('applications')
        .select('id,status')
        .eq('parent_id', user.id)
        .eq('ecd_id', resolvedCentre.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (profileError) {
      console.error('[centre-page] user profile lookup failed:', profileError)
    }
    if (applicationError) {
      console.error('[centre-page] application lookup failed:', applicationError)
    }

    payload.userRole = profile?.role ?? null
    payload.existingApplication = application?.id
      ? {
          id: application.id,
          status: application.status ?? null,
        }
      : null

    return payload
  } catch (error) {
    console.error('[centre-page] Failed to load centre payload:', error)
    return emptyPayload
  }
}

async function loadCentreMetadata(slugCandidates: string[]): Promise<MetadataCentre | null> {
  if (slugCandidates.length === 0) return null

  if (shouldUseDemoCentreData()) {
    const match = slugCandidates.map((slug) => demoCentrePageBySlug[slug]?.centre).find(Boolean)
    if (match) {
      return {
        name: match.name,
        tagline: match.tagline ?? null,
      }
    }
  }

  try {
    const supabase = await createClient()
    const publicCentre = await loadPublicCentreRow(supabase, slugCandidates)
    if (publicCentre?.name) {
      return {
        name: publicCentre.name,
        tagline: publicCentre.tagline ?? null,
      }
    }

    const privateCentre = await loadPrivateCentreRow(supabase, slugCandidates)
    if (privateCentre?.name) {
      return {
        name: privateCentre.name,
        tagline: privateCentre.tagline ?? null,
      }
    }
  } catch (error) {
    console.error('[centre-page] Failed to load metadata:', error)
  }

  return null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const normalizedSlug = normalizeCentreSlug(params.slug)
  const slugCandidates = resolveCentreSlugCandidates(params.slug)
  const centre = await loadCentreMetadata(slugCandidates)

  if (!centre) return { title: 'Creche Not Found' }

  return {
    title: `${centre.name} - CentreConnect`,
    description: centre.tagline || `View ${centre.name} details and apply online.`,
    openGraph: {
      images: [
        {
          url: `/api/og/centre/${normalizedSlug ?? params.slug}`,
          width: 1200,
          height: 630,
          alt: centre.name,
        },
      ],
    },
  }
}

function isTruthyPreviewFlag(value: string | string[] | undefined) {
  if (!value) return false
  const normalized = Array.isArray(value) ? value[0] : value
  return normalized === '1' || normalized === 'true'
}

function isInactiveCentre(value: boolean | null | undefined) {
  return value === false
}

export default async function CentrePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { preview?: string | string[] }
}) {
  const normalizedSlug = normalizeCentreSlug(params.slug)
  if (!normalizedSlug) {
    notFound()
  }

  const slugCandidates = resolveCentreSlugCandidates(params.slug)
  const previewRequested = isTruthyPreviewFlag(searchParams?.preview)
  if (!previewRequested) {
    const payload = await loadCentrePagePayload(slugCandidates)
    return (
      <CentreClient
        slug={normalizedSlug}
        centre={payload.centre}
        websiteContent={payload.websiteContent}
        userRole={payload.userRole}
        existingApplication={payload.existingApplication}
      />
    )
  }

  const supabase = await createClient()

  const { data: centreRows } = await supabase
    .from('ecd_centres')
    .select('id,slug,is_active')
    .in('slug', slugCandidates)
    .limit(1)

  const centre = Array.isArray(centreRows) && centreRows.length > 0 ? centreRows[0] : null

  if (!centre) {
    notFound()
  }

  if (isInactiveCentre(centre.is_active) && previewRequested) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      notFound()
    }

    const { data: membership } = await supabase
      .from('ecd_admins')
      .select('ecd_id')
      .eq('ecd_id', centre.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      notFound()
    }
  }

  const payload = await loadCentrePagePayload(slugCandidates)
  return (
    <CentreClient
      slug={normalizeCentreSlug(centre.slug) ?? normalizedSlug}
      centre={payload.centre}
      websiteContent={payload.websiteContent}
      userRole={payload.userRole}
      existingApplication={payload.existingApplication}
    />
  )
}
