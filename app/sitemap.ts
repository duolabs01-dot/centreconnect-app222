import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'

const BASE_URL = 'https://centreconnect.co.za'

// Revalidate sitemap once per day — centre list grows slowly
export const revalidate = 86400

const STATIC_PAGES: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/directory`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/for-centres`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/register`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    url: `${BASE_URL}/login`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${BASE_URL}/privacy`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/popia`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/terms`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const admin = createAdminClient()

    // Fetch all public centre slugs from the canonical VIEW
    const { data: centreRows } = await admin
      .from('public_ecd_centres')
      .select('slug,name')
      .not('slug', 'is', null)
      .order('name', { ascending: true })

    const centrePages: MetadataRoute.Sitemap = (centreRows ?? [])
      .map((row) => normalizeCentreSlug(row.slug as string | null | undefined))
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => ({
        url: `${BASE_URL}/c/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))

    return [...STATIC_PAGES, ...centrePages]
  } catch (err) {
    // Fall back to static pages if DB is unreachable at build time
    console.error('[sitemap] Failed to fetch centre slugs:', err)
    return STATIC_PAGES
  }
}
