import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Website - CentreConnect',
  description: 'Build your centre website and submit website upgrade requests.',
}

const sectionOptions = [
  { key: 'hero', label: 'Hero' },
  { key: 'about', label: 'About Us' },
  { key: 'programs', label: 'Programs' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'events', label: 'Events Calendar' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'contact', label: 'Contact' },
]

const tierGuide: Record<
  'basic' | 'standard' | 'premium',
  { label: string; includes: string[]; suggestedAddOns: string[] }
> = {
  basic: {
    label: 'Basic',
    includes: ['Centre profile page', 'Contact details + map', 'Programs + about sections'],
    suggestedAddOns: ['Custom domain setup', 'Extra gallery/content design'],
  },
  standard: {
    label: 'Standard',
    includes: ['Everything in Basic', 'Richer section controls', 'Better public presentation'],
    suggestedAddOns: ['Domain connection help', 'Premium design pass'],
  },
  premium: {
    label: 'Premium',
    includes: ['Everything in Standard', 'Highest website support priority', 'Full growth stack compatibility'],
    suggestedAddOns: ['Extra seasonal campaign design', 'Advanced integrations'],
  },
}

function toParagraphBlocks(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: 'paragraph', content: line }))
}

function fromParagraphBlocks(contentBlocks: unknown): string {
  if (!Array.isArray(contentBlocks)) return ''
  const parts = contentBlocks
    .map((block) => {
      if (typeof block === 'string') return block
      if (block && typeof block === 'object' && 'content' in block && typeof block.content === 'string') {
        return block.content
      }
      return ''
    })
    .filter(Boolean)
  return parts.join('\n')
}

function toProgramBlocks(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [titlePart, descriptionPart] = line.includes('|')
        ? line.split('|', 2).map((part) => part.trim())
        : [`Program ${index + 1}`, line]
      return {
        title: titlePart || `Program ${index + 1}`,
        description: descriptionPart || titlePart || line,
      }
    })
}

function fromProgramBlocks(contentBlocks: unknown): string {
  if (!Array.isArray(contentBlocks)) return ''
  const parts = contentBlocks
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const title = 'title' in block && typeof block.title === 'string' ? block.title.trim() : ''
      const description = 'description' in block && typeof block.description === 'string' ? block.description.trim() : ''
      if (!title && !description) return ''
      if (!description) return title
      if (!title) return description
      return `${title} | ${description}`
    })
    .filter(Boolean)
  return parts.join('\n')
}

export default async function EcdWebsitePage() {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const [{ data: centre }, { data: contentRows }, { data: subscription }] = await Promise.all([
    supabase
      .from('ecd_centres')
      .select('id,slug,name,tagline,description,is_active,updated_at')
      .eq('id', ecdId)
      .maybeSingle(),
    supabase.from('ecd_content').select('section,content_blocks').eq('ecd_id', ecdId).in('section', ['about', 'programs', 'website_sections']),
    supabase
      .from('subscriptions')
      .select('tier,status,monthly_price,current_period_end')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const sectionMap = new Map((contentRows ?? []).map((row) => [row.section, row.content_blocks]))
  const aboutText = fromParagraphBlocks(sectionMap.get('about'))
  const programsText = fromProgramBlocks(sectionMap.get('programs'))
  const enabledSections = Array.isArray(sectionMap.get('website_sections'))
    ? (sectionMap.get('website_sections') as string[])
    : sectionOptions.map((item) => item.key)
  const hasTagline = Boolean((centre?.tagline ?? '').trim())
  const hasAbout = Boolean(aboutText.trim())
  const hasPrograms = Boolean(programsText.trim())
  const hasVisibleSections = enabledSections.length > 0
  const completedSteps = [hasTagline, hasAbout, hasPrograms && hasVisibleSections].filter(Boolean).length
  const completionPct = Math.round((completedSteps / 3) * 100)
  const tier = (subscription?.tier ?? 'basic') as 'basic' | 'standard' | 'premium'
  const guide = tierGuide[tier]

  async function saveWebsiteContent(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const tagline = String(formData.get('tagline') ?? '').trim()
    const about = String(formData.get('about') ?? '').trim()
    const programs = String(formData.get('programs') ?? '').trim()
    const sectionKeys = formData.getAll('sections').map((value) => String(value))

    await session.supabase
      .from('ecd_centres')
      .update({
        tagline: tagline || null,
        description: about || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.ecdId)

    await session.supabase.from('ecd_content').upsert(
      [
        {
          ecd_id: session.ecdId,
          section: 'about',
          content_blocks: toParagraphBlocks(about),
          updated_by: session.user.id,
        },
        {
          ecd_id: session.ecdId,
          section: 'programs',
          content_blocks: toProgramBlocks(programs),
          updated_by: session.user.id,
        },
        {
          ecd_id: session.ecdId,
          section: 'website_sections',
          content_blocks: sectionKeys,
          updated_by: session.user.id,
        },
      ],
      { onConflict: 'ecd_id,section' }
    )

    const { data: updatedCentre } = await session.supabase.from('ecd_centres').select('slug').eq('id', session.ecdId).maybeSingle()
    revalidatePath('/ecd/website')
    if (updatedCentre?.slug) revalidatePath(`/centre/${updatedCentre.slug}`)
  }

  async function setWebsitePublished(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const nextPublished = String(formData.get('next_published') ?? '') === 'true'
    const nowIso = new Date().toISOString()

    await session.supabase.from('ecd_centres').update({ is_active: nextPublished, updated_at: nowIso }).eq('id', session.ecdId)

    const { data: updatedCentre } = await session.supabase.from('ecd_centres').select('slug').eq('id', session.ecdId).maybeSingle()
    revalidatePath('/ecd/website')
    if (updatedCentre?.slug) revalidatePath(`/centre/${updatedCentre.slug}`)
  }

  async function submitWebsiteBrief(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const siteType = String(formData.get('site_type') ?? 'mini-site')
    const domainPlan = String(formData.get('domain_plan') ?? 'platform-subdomain')
    const style = String(formData.get('style') ?? '').trim()
    const pages = String(formData.get('pages') ?? '').trim()
    const goals = String(formData.get('goals') ?? '').trim()
    const ticketNumber = `WEB-${Date.now().toString().slice(-8)}`

    const summary = [
      `Website request type: ${siteType}`,
      `Domain preference: ${domainPlan}`,
      pages ? `Pages requested: ${pages}` : null,
      style ? `Visual style: ${style}` : null,
      goals ? `Business goals: ${goals}` : null,
      'Please advise package impact and implementation plan.',
    ]
      .filter(Boolean)
      .join('\n')

    await session.supabase.from('support_tickets').insert({
      ticket_number: ticketNumber,
      ecd_id: session.ecdId,
      created_by: session.user.id,
      subject: 'Website setup request',
      description: summary,
      category: 'technical',
      priority: 2,
      status: 'open',
    })

    revalidatePath('/ecd/website')
    revalidatePath('/ecd/support')
  }

  return (
    <EcdOsShell
      title="Website"
      description="Build your page, publish when ready, and request custom website setup."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="glass border border-border bg-gradient-to-br from-cyan-50/80 via-white/80 to-emerald-50/80 lg:col-span-2 shadow-2xl text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Website Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-full bg-white/10 p-1">
              <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-sm text-cyan-200">{completionPct}% complete</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition-colors',
                  hasTagline
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                         : 'border-border bg-card text-muted-foreground'                )}
              >
                Step 1: Add headline
              </div>
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition-colors',
                  hasAbout
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                         : 'border-border bg-card text-muted-foreground'                )}
              >
                Step 2: Add about section
              </div>
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition-colors',
                  hasPrograms && hasVisibleSections
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                         : 'border-border bg-card text-muted-foreground'                )}
              >
                Step 3: Enable sections and publish
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border border-border bg-card/90 text-foreground">
          <CardHeader>
            <CardTitle>Plan & Website Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current package</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{guide.label}</p>
              <p className="text-xs text-slate-400">
                Status: {subscription?.status ?? 'trial'} {subscription?.monthly_price ? `| R${subscription.monthly_price}/month` : ''}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Included now</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                {guide.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Suggested add-ons</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                {guide.suggestedAddOns.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Button variant="outline" asChild>
              <Link href="/ecd/marketplace">Open Marketplace Add-ons</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border border-border bg-card/90 text-foreground">
          <CardHeader>
            <CardTitle>Edit Website Content</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveWebsiteContent} className="space-y-4">
              <div>
                                 <label htmlFor="tagline" className="text-sm font-medium text-foreground">                  Hero tagline
                </label>
                <input
                  id="tagline"
                  name="tagline"
                  defaultValue={centre?.tagline ?? ''}
                  placeholder="Example: Safe, caring learning for ages 2 to 6"
                  className="cc-native-field mt-1"
                />
              </div>

              <div>
                <label htmlFor="about" className="text-sm font-medium text-foreground">
                  About section
                </label>
                <textarea
                  id="about"
                  name="about"
                  defaultValue={aboutText}
                  placeholder="Use plain language about your centre and daily routine."
                  className="cc-native-field mt-1 h-auto min-h-28 py-2"
                />
              </div>

              <div>
                <label htmlFor="programs" className="text-sm font-medium text-foreground">
                  Programs (one per line: Title | Description)
                </label>
                <textarea
                  id="programs"
                  name="programs"
                  defaultValue={programsText}
                  placeholder="Toddler Group | Play-based learning for ages 2-3"
                  className="cc-native-field mt-1 h-auto min-h-32 py-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">Visible sections</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {sectionOptions.map((section) => (
                    <label
                      key={section.key}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <input type="checkbox" name="sections" value={section.key} defaultChecked={enabledSections.includes(section.key)} />
                      {section.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save Draft</Button>
                {centre?.slug ? (
                  <Button type="button" variant="outline" asChild>
                    <a href={`/centre/${centre.slug}`} target="_blank" rel="noreferrer">
                      Preview Public Page
                    </a>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass border border-border bg-card/90 text-foreground">
          <CardHeader>
            <CardTitle>Publish Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">
                Status: {centre?.is_active ? 'Published' : 'Draft'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {centre?.is_active
                  ? 'Your centre page is visible to parents.'
                  : 'Your centre page is hidden until you publish.'}
              </p>
              {centre?.updated_at ? (
                <p className="mt-1 text-xs text-slate-500">Last updated: {new Date(centre.updated_at).toLocaleString()}</p>
              ) : null}
            </div>

            <form action={setWebsitePublished}>
              <input type="hidden" name="next_published" value={centre?.is_active ? 'false' : 'true'} />
              <Button
                type="submit"
                variant={centre?.is_active ? 'outline' : 'default'}
                className="w-full"
              >
                {centre?.is_active ? 'Unpublish Website' : 'Publish Website'}
              </Button>
            </form>

            <p className="text-xs text-slate-600">
              Tip: Save draft, preview, then publish.
            </p>
          </CardContent>
        </Card>

        <Card className="glass border border-border bg-card/90 text-foreground lg:col-span-2">
          <CardHeader>
            <CardTitle>Need a Full Website Setup?</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitWebsiteBrief} className="grid gap-3 md:grid-cols-2">
              <select name="site_type" className="cc-native-field">
                <option value="mini-site">Mini website (quick launch)</option>
                <option value="full-website">Full website (deeper build)</option>
              </select>
              <select name="domain_plan" className="cc-native-field">
                <option value="platform-subdomain">Use platform subdomain</option>
                <option value="bring-own-domain">I want my own domain</option>
                <option value="need-domain-help">I need help buying a domain</option>
              </select>
              <input
                name="pages"
                className="cc-native-field md:col-span-2"
                placeholder="Pages needed (e.g. Home, Admissions, Gallery, Careers)"
              />
              <input
                name="style"
                className="cc-native-field md:col-span-2"
                placeholder="Style direction (e.g. warm, playful, premium)"
              />
              <textarea
                name="goals"
                className="cc-native-field md:col-span-2 h-auto min-h-24 py-2"
                placeholder="What should this website achieve for your centre?"
              />
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit">Send Website Request</Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/ecd/support">Track in Support</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </EcdOsShell>
  )
}
