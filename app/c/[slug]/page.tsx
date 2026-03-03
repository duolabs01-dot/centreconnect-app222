import { createClient } from '@/lib/supabase/server'
import { CentreClient } from './centre-client'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug
  const supabase = await createClient()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('name, tagline')
    .eq('slug', slug)
    .maybeSingle()

  if (!centre) return { title: 'Creche Not Found' }

  return {
    title: `${centre.name} - CentreConnect`,
    description: centre.tagline || `View ${centre.name} details and apply online.`,
    openGraph: {
      images: [
        {
          url: `/api/og/centre/${slug}`,
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
  const supabase = await createClient()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('id,slug,is_active')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!centre) {
    notFound()
  }

  const previewRequested = isTruthyPreviewFlag(searchParams?.preview)
  if (isInactiveCentre(centre.is_active) && !previewRequested) {
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

  return <CentreClient slug={params.slug} />
}
