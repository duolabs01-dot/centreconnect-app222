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
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
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
      roleLabel={role === 'ecd_admin' ? 'Centre Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="border-slate-100 bg-white lg:col-span-2 shadow-sm text-slate-900 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle>Website Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="rounded-full bg-slate-100 p-1">
              <div className="h-2.5 rounded-full bg-teal-600 transition-all duration-700" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-sm font-bold text-teal-700">{completionPct}% complete</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors',
                  hasTagline
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                )}
              >
                Step 1: Add headline
              </div>
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors',
                  hasAbout
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                )}
              >
                Step 2: Add about section
              </div>
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors',
                  hasPrograms && hasVisibleSections
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                )}
              >
                Step 3: Enable sections
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Plan & Website Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current package</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{guide.label}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Status: {subscription?.status ?? 'trial'} {subscription?.monthly_price ? `| R${subscription.monthly_price}/month` : ''}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 mb-2">Included now</p>
              <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-600 font-medium">
                {guide.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Button variant="outline" asChild className="w-full border-slate-200 text-slate-700 font-bold h-11 rounded-xl">
              <Link href="/ecd/marketplace">Open Marketplace Add-ons</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Edit Website Content</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={saveWebsiteContent} className="space-y-5">
              <div>
                <label htmlFor="tagline" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hero tagline</label>
                <input
                  id="tagline"
                  name="tagline"
                  defaultValue={centre?.tagline ?? ''}
                  placeholder="Example: Safe, caring learning for ages 2 to 6"
                  className="cc-native-field mt-1.5 h-12 rounded-xl"
                />
              </div>

              <div>
                <label htmlFor="about" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">About section</label>
                <textarea
                  id="about"
                  name="about"
                  defaultValue={aboutText}
                  placeholder="Use plain language about your centre and daily routine."
                  className="cc-native-field mt-1.5 h-auto min-h-32 py-3 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label htmlFor="programs" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Programs (Title | Description)</label>
                <textarea
                  id="programs"
                  name="programs"
                  defaultValue={programsText}
                  placeholder="Toddler Group | Play-based learning for ages 2-3"
                  className="cc-native-field mt-1.5 h-auto min-h-32 py-3 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2">Visible sections</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sectionOptions.map((section) => (
                    <label
                      key={section.key}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <input type="checkbox" name="sections" value={section.key} defaultChecked={enabledSections.includes(section.key)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                      {section.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-xl shadow-sm transition-all active:scale-95">Save Draft</Button>
                {centre?.slug ? (
                  <Button type="button" variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-xl">
                    <a href={`/centre/${centre.slug}`} target="_blank" rel="noreferrer">
                      Preview Public Page
                    </a>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold">Publish Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</p>
                <p className={cn("mt-1 text-xl font-black", centre?.is_active ? "text-emerald-600" : "text-amber-600")}>
                  {centre?.is_active ? 'PUBLISHED' : 'DRAFT'}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {centre?.is_active
                    ? 'Your centre page is live and visible to parents.'
                    : 'Your centre page is hidden until you publish.'}
                </p>
              </div>

              <form action={setWebsitePublished}>
                <input type="hidden" name="next_published" value={centre?.is_active ? 'false' : 'true'} />
                <Button
                  type="submit"
                  variant={centre?.is_active ? 'outline' : 'default'}
                  className={cn("w-full h-12 rounded-xl font-bold transition-all active:scale-95 shadow-sm", 
                    !centre?.is_active && "bg-teal-600 hover:bg-teal-700 text-white")}
                >
                  {centre?.is_active ? 'Unpublish Website' : 'Publish Website'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold">Custom Setup</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form action={submitWebsiteBrief} className="space-y-4">
                <select name="site_type" className="cc-native-field h-11 rounded-xl text-sm">
                  <option value="mini-site">Mini website (quick launch)</option>
                  <option value="full-website">Full website (deeper build)</option>
                </select>
                <select name="domain_plan" className="cc-native-field h-11 rounded-xl text-sm">
                  <option value="platform-subdomain">Use platform subdomain</option>
                  <option value="bring-own-domain">I want my own domain</option>
                  <option value="need-domain-help">I need help buying a domain</option>
                </select>
                <textarea
                  name="goals"
                  className="cc-native-field h-auto min-h-24 py-3 rounded-xl text-sm leading-relaxed"
                  placeholder="What should this website achieve for your centre?"
                />
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 rounded-xl shadow-sm transition-all active:scale-95">Send Request</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </EcdOsShell>
  )
}
  )
}





