import { writeFile } from 'fs/promises'
import { resolve } from 'node:path'

const baseUrl = 'https://centerconnect.co.za'
const outputDir = resolve(process.cwd(), 'public')
const now = new Date().toISOString()

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

async function buildSitemap() {
  const urlset = staticPaths
    .map(
      (path) => `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.65</priority>\n  </url>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>`

  await writeFile(resolve(outputDir, 'sitemap.xml'), xml)

  const robots = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n` +
    `Host: centerconnect.co.za\n`

  await writeFile(resolve(outputDir, 'robots.txt'), robots)
}

buildSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error)
  process.exit(1)
})
