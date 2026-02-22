import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'

type PageProps = {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('slug,name,tagline,description,suburb,city,cover_image_url')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!centre) {
    return {
      title: 'Centre Not Found | CentreConnect',
      description: 'This centre could not be found.',
    }
  }

  const title = `${centre.name} | CentreConnect`
  const description =
    centre.tagline ||
    centre.description ||
    `Explore ${centre.name} in ${centre.suburb}, ${centre.city}.`
  const heroImage = getCentreHeroImage(centre.slug, centre.cover_image_url)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [heroImage],
    },
  }
}

export default function PublicCentreAliasPage({ params }: PageProps) {
  redirect(`/centre/${params.slug}`)
}

