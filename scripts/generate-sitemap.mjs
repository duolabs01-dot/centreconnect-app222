import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const baseUrl = 'https://centerconnect.co.za'
const now = new Date().toISOString()
const outputDir = resolve(process.cwd(), 'public')

function requireEnvValue(value, description) {
  if (!value) {
    throw new Error(`Missing environment variable for ${description}`)
  }
  return value
}

const supabaseUrl = requireEnvValue(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, 'Supabase URL')
const serviceRoleKey = requireEnvValue(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY,
  'Supabase service role key'
)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const staticPaths = [
  '/',
  '/directory',
  '/login',
  '/register',
  '/for-centres',
  '/terms',
  '/privacy',
  '/popia',
  '/forgot-password',
  '/reset-password',
  '/parent/discover',
  '/parent/dashboard',
  '/parent/applications',
  '/parent/notifications',
  '/parent/report-cards',
  '/parent/preferences',
  '/parent/profile',
  '/parent/children',
  '/parent/shortlist',
  '/parent/support',
  '/parent/onboarding',
  '/parent/daily-reports',
]

async function fetchDynamicCentrePaths() {
  const pathSet = new Set()
  const { data: centres, error } = await supabase
    .from('ecd_centres')
    .select('slug')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .not('slug', 'is', '')

  if (error) {
    console.warn('Failed to load centre slugs:', error.message)
    return pathSet
  }

  for (const centre of centres ?? []) {
    const slug = centre.slug?.trim()
    if (!slug) continue
    pathSet.add(`/c/${slug}`)
    pathSet.add(`/centre/${slug}`)
  }

  return pathSet
}

async function fetchJobPaths() {
  const pathSet = new Set()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, ecd_centres ( slug )')
    .eq('is_published', true)
    .not('ecd_centres.slug', 'is', null)
    .not('ecd_centres.slug', 'is', '')

  if (error) {
    console.warn('Failed to load job slugs:', error.message)
    return pathSet
  }

  for (const job of jobs ?? []) {
    const slug = job.ecd_centres?.slug?.trim()
    if (!slug || !job.id) continue
    pathSet.add(`/c/${slug}/jobs/${job.id}`)
  }

  return pathSet
}

async function build() {
  const dynamicPaths = await Promise.all([fetchDynamicCentrePaths(), fetchJobPaths()])
  const pathSet = new Set(staticPaths)
  for (const dynamicSet of dynamicPaths) {
    for (const path of dynamicSet) {
      pathSet.add(path)
    }
  }

  const urlEntries = Array.from(pathSet)
    .sort()
    .map((path) => `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.65</priority>\n  </url>`) 
    .join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`
  await writeFile(resolve(outputDir, 'sitemap.xml'), sitemap)

  const robots = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\nHost: centerconnect.co.za\n`
  await writeFile(resolve(outputDir, 'robots.txt'), robots)
}

build()
  .catch((error) => {
    console.error('Sitemap generation failed:', error)
    process.exit(1)
  })
