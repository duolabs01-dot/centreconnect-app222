import { createClient } from '@/lib/supabase/server'
import { CentreClient } from './centre-client'
import type { Metadata } from 'next'

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

export default function CentrePage({ params }: { params: { slug: string } }) {
  return <CentreClient slug={params.slug} />
}
