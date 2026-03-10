import { createClient } from '@/lib/supabase/server'
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
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { normalizeCentreSlug, resolveCentreSlugCandidates } from '@/lib/ecd/centre-slug'

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

async function loadCentrePagePayload(slugCandidates: string[]): Promise<CentrePagePayload> {
  const emptyPayload: CentrePagePayload = {
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

  if (slugCandidates.length === 0) return emptyPayload

  try {
    const supabase = await createClient()
    const [{ data: centreRows }, { data: fallbackRows }] = await Promise.all([
      supabase.from('ecd_centres').select('*').in('slug', slugCandidates).limit(1),
      supabase.from('public_ecd_centres').select('*').in('slug', slugCandidates).limit(1),
    ])

    const centreData = Array.isArray(centreRows) && centreRows.length > 0 ? (centreRows[0] as Centre) : null
    const publicCentreData = Array.isArray(fallbackRows) && fallbackRows.length > 0 ? (fallbackRows[0] as Centre) : null
    const resolvedCentre = centreData ? { ...publicCentreData, ...centreData } : publicCentreData

    if (!resolvedCentre?.id) {
      return emptyPayload
    }

    const { data: contentRows } = await supabase
      .from('ecd_content')
      .select('section,content_blocks')
      .eq('ecd_id', resolvedCentre.id)
      .in('section', ['about', 'programs', 'gallery', 'website_sections'])

    const sectionMap = new Map((contentRows ?? []).map((row) => [row.section, row.content_blocks]))
    const visibleSections = Array.isArray(sectionMap.get('website_sections'))
      ? (sectionMap.get('website_sections') as string[])
      : DEFAULT_VISIBLE_SECTIONS

    const payload: CentrePagePayload = {
      centre: resolvedCentre,
      websiteContent: {
        aboutText: fromParagraphBlocks(sectionMap.get('about')),
        programCards: fromProgramBlocks(sectionMap.get('programs')),
        galleryUrls: fromGalleryBlocks(sectionMap.get('gallery')),
        visibleSections,
      },
      userRole: null,
      existingApplication: null,
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return payload
    }

    const [{ data: profile }, { data: existingApplicationData }] = await Promise.all([
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

    payload.userRole = profile?.role ?? null
    payload.existingApplication = existingApplicationData?.id
      ? {
          id: existingApplicationData.id,
          status: existingApplicationData.status ?? null,
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

  try {
    const supabase = await createClient()

    const { data: publicRows } = await supabase
      .from('public_ecd_centres')
      .select('name,tagline')
      .in('slug', slugCandidates)
      .limit(1)

    if (Array.isArray(publicRows) && publicRows.length > 0) {
      return publicRows[0] as MetadataCentre
    }

    const { data: privateRows } = await supabase
      .from('ecd_centres')
      .select('name,tagline')
      .in('slug', slugCandidates)
      .limit(1)

    if (Array.isArray(privateRows) && privateRows.length > 0) {
      return privateRows[0] as MetadataCentre
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
