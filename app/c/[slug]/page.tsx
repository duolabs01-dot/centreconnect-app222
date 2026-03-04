import { createClient } from '@/lib/supabase/server'
import { CentreClient } from './centre-client'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { normalizeCentreSlug, resolveCentreSlugCandidates } from '@/lib/ecd/centre-slug'

type MetadataCentre = {
  name: string
  tagline: string | null
}

async function loadCentreMetadata(slugCandidates: string[]): Promise<MetadataCentre | null> {
  if (slugCandidates.length === 0) return null

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

  const supabase = await createClient()
  const slugCandidates = resolveCentreSlugCandidates(params.slug)
  const previewRequested = isTruthyPreviewFlag(searchParams?.preview)
  if (!previewRequested) {
    return <CentreClient slug={normalizedSlug} />
  }

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

  return <CentreClient slug={normalizeCentreSlug(centre.slug) ?? normalizedSlug} />
}
