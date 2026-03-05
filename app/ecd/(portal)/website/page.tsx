import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'
import {
  AGE_GROUP_PRICE_BANDS,
  buildAgeGroupPricingFromRandInput,
  getAgeGroupPricingSummary,
  normalizeAgeGroupPricing,
  type AgeGroupPricingKey,
} from '@/lib/pricing/age-group-pricing'

export const metadata: Metadata = {
  title: 'Website - CentreConnect',
  description: 'Build your crèche website and submit website upgrade requests.',
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

const agePriceFieldByKey: Record<AgeGroupPricingKey, string> = {
  '0-2': 'age_price_0_2',
  '2-4': 'age_price_2_4',
  '4-6': 'age_price_4_6',
  '6+': 'age_price_6_plus',
}

const tierGuide: Record<
  'basic' | 'standard' | 'premium',
  { label: string; includes: string[]; suggestedAddOns: string[] }
> = {
  basic: {
    label: 'Basic',
    includes: ['Crèche profile page', 'Contact details + map', 'Programs + about sections'],
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

function centsToRandInput(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2)
}

type WebsiteActionStatus =
  | 'draft-saved'
  | 'published'
  | 'unpublished'
  | 'request-sent'
  | 'save-error'
  | 'publish-error'
  | 'request-error'

const websiteStatusCopy: Record<
  WebsiteActionStatus,
  { tone: 'success' | 'error'; title: string; description: string }
> = {
  'draft-saved': {
    tone: 'success',
    title: 'Draft saved',
    description: 'Your website draft changes were saved successfully.',
  },
  published: {
    tone: 'success',
    title: 'Website published',
    description: 'Your public crèche page is now live for parents.',
  },
  unpublished: {
    tone: 'success',
    title: 'Website unpublished',
    description: 'Your public crèche page is now hidden from parents.',
  },
  'request-sent': {
    tone: 'success',
    title: 'Request sent',
    description: 'Your custom website request was sent to support.',
  },
  'save-error': {
    tone: 'error',
    title: 'Could not save draft',
    description: 'Please try again. If the issue continues, contact support.',
  },
  'publish-error': {
    tone: 'error',
    title: 'Could not update publish status',
    description: 'Please try again. If the issue continues, contact support.',
  },
  'request-error': {
    tone: 'error',
    title: 'Could not send request',
    description: 'Please try again. If the issue continues, contact support.',
  },
}

const WEBSITE_MEDIA_BUCKET = 'ecd-media'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_GALLERY_IMAGES = 12
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

function isFormFile(value: FormDataEntryValue | null): value is File {
  if (!value || typeof value === 'string') return false
  return typeof value.name === 'string'
}

function sanitizeFileName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

function toFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.trim().toLowerCase()
  if (fromName) return fromName
  const fromType = file.type.split('/').pop()?.trim().toLowerCase()
  return fromType || 'jpg'
}

function toGalleryUrls(contentBlocks: unknown): string[] {
  if (!Array.isArray(contentBlocks)) return []
  const normalized = contentBlocks
    .map((block) => {
      if (typeof block === 'string') return block.trim()
      if (block && typeof block === 'object' && 'url' in block && typeof block.url === 'string') {
        return block.url.trim()
      }
      return ''
    })
    .filter((value) => value.length > 0)
  return Array.from(new Set(normalized))
}

async function uploadWebsiteImage(
  admin: ReturnType<typeof createAdminClient>,
  ecdId: string,
  file: File,
  kind: 'logo' | 'hero' | 'gallery'
) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported image format (${file.type || 'unknown'}).`)
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image exceeds 8MB limit.')
  }

  const extension = toFileExtension(file)
  const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, '')) || kind
  const path = `${ecdId}/website/${kind}-${Date.now()}-${baseName}-${crypto.randomUUID().slice(0, 8)}.${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage.from(WEBSITE_MEDIA_BUCKET).upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  })
  if (uploadError) {
    throw new Error(uploadError.message || 'Image upload failed.')
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(WEBSITE_MEDIA_BUCKET).getPublicUrl(path)
  if (!publicUrl) throw new Error('Image upload succeeded but URL generation failed.')
  return publicUrl
}

export default async function EcdWebsitePage({
  searchParams,
}: {
  searchParams?: { status?: string | string[] }
}) {
  const rawStatus = searchParams?.status
  const status =
    typeof rawStatus === 'string'
      ? rawStatus
      : Array.isArray(rawStatus)
        ? rawStatus[0]
        : null
  const statusMeta = status && status in websiteStatusCopy ? websiteStatusCopy[status as WebsiteActionStatus] : null
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const [{ data: centre }, { data: contentRows }, { data: subscription }] = await Promise.all([
    supabase
      .from('ecd_centres')
      .select(
        'id,slug,name,tagline,description,logo_url,cover_image_url,is_active,updated_at,age_group_pricing,monthly_fee_min,monthly_fee_max,fees_display_mode'
      )
      .eq('id', ecdId)
      .maybeSingle(),
    supabase
      .from('ecd_content')
      .select('section,content_blocks')
      .eq('ecd_id', ecdId)
      .in('section', ['about', 'programs', 'gallery', 'website_sections']),
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
  const existingGalleryUrls = toGalleryUrls(sectionMap.get('gallery'))
  const enabledSections = Array.isArray(sectionMap.get('website_sections'))
    ? (sectionMap.get('website_sections') as string[])
    : sectionOptions.map((item) => item.key)
  const hasTagline = Boolean((centre?.tagline ?? '').trim())
  const hasAbout = Boolean(aboutText.trim())
  const hasPrograms = Boolean(programsText.trim())
  const hasBrandMedia = Boolean(centre?.logo_url || centre?.cover_image_url)
  const hasVisibleSections = enabledSections.length > 0
  const completedSteps = [hasTagline, hasAbout, hasPrograms && hasVisibleSections, hasBrandMedia].filter(Boolean).length
  const completionPct = Math.round((completedSteps / 4) * 100)
  const tier = (subscription?.tier ?? 'basic') as 'basic' | 'standard' | 'premium'
  const guide = tierGuide[tier]
  const ageGroupPricing = normalizeAgeGroupPricing(centre?.age_group_pricing, centre?.monthly_fee_min ?? null)
  const pricingSummary = getAgeGroupPricingSummary(ageGroupPricing)

  async function saveWebsiteContent(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const admin = createAdminClient()
    const tagline = String(formData.get('tagline') ?? '').trim()
    const about = String(formData.get('about') ?? '').trim()
    const programs = String(formData.get('programs') ?? '').trim()
    const sectionKeys = formData.getAll('sections').map((value) => String(value))
    const logoFileValue = formData.get('logo_file')
    const heroFileValue = formData.get('hero_file')
    const galleryFileValues = formData.getAll('gallery_files')
    const logoFile = isFormFile(logoFileValue) && logoFileValue.size > 0 ? logoFileValue : null
    const heroFile = isFormFile(heroFileValue) && heroFileValue.size > 0 ? heroFileValue : null
    const galleryFiles = galleryFileValues.filter(
      (value): value is File => isFormFile(value) && value.size > 0
    )
    const agePricing = buildAgeGroupPricingFromRandInput(
      {
        '0-2': String(formData.get(agePriceFieldByKey['0-2']) ?? ''),
        '2-4': String(formData.get(agePriceFieldByKey['2-4']) ?? ''),
        '4-6': String(formData.get(agePriceFieldByKey['4-6']) ?? ''),
        '6+': String(formData.get(agePriceFieldByKey['6+']) ?? ''),
      },
      centre?.monthly_fee_min ?? null
    )
    const nextPricingSummary = getAgeGroupPricingSummary(agePricing)
    const nextFeesDisplayMode =
      nextPricingSummary.minFeeRand === null
        ? 'contact'
        : nextPricingSummary.minFeeRand === nextPricingSummary.maxFeeRand
          ? 'exact'
          : 'range'

    let uploadedLogoUrl: string | null = null
    let uploadedHeroUrl: string | null = null
    const uploadedGalleryUrls: string[] = []

    try {
      if (logoFile) {
        uploadedLogoUrl = await uploadWebsiteImage(admin, session.ecdId, logoFile, 'logo')
      }
      if (heroFile) {
        uploadedHeroUrl = await uploadWebsiteImage(admin, session.ecdId, heroFile, 'hero')
      }
      for (const galleryFile of galleryFiles.slice(0, MAX_GALLERY_IMAGES)) {
        const uploaded = await uploadWebsiteImage(admin, session.ecdId, galleryFile, 'gallery')
        uploadedGalleryUrls.push(uploaded)
      }
    } catch {
      redirect('/ecd/website?status=save-error')
    }

    const mergedGalleryUrls = Array.from(
      new Set([...existingGalleryUrls, ...uploadedGalleryUrls].filter((value) => value.length > 0))
    ).slice(-MAX_GALLERY_IMAGES)
    const centreUpdatePayload: {
      tagline: string | null
      description: string | null
      age_group_pricing: ReturnType<typeof buildAgeGroupPricingFromRandInput>
      monthly_fee_min: number | null
      monthly_fee_max: number | null
      fees_display_mode: 'exact' | 'range' | 'contact'
      fees_last_updated_at: string
      updated_at: string
      logo_url?: string
      cover_image_url?: string
    } = {
      tagline: tagline || null,
      description: about || null,
      age_group_pricing: agePricing,
      monthly_fee_min: nextPricingSummary.minFeeRand,
      monthly_fee_max: nextPricingSummary.maxFeeRand ?? nextPricingSummary.minFeeRand,
      fees_display_mode: nextFeesDisplayMode,
      fees_last_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (uploadedLogoUrl) {
      centreUpdatePayload.logo_url = uploadedLogoUrl
    }
    if (uploadedHeroUrl) {
      centreUpdatePayload.cover_image_url = uploadedHeroUrl
    }

    const { error: centreUpdateError } = await session.supabase
      .from('ecd_centres')
      .update(centreUpdatePayload)
      .eq('id', session.ecdId)
    if (centreUpdateError) {
      redirect('/ecd/website?status=save-error')
    }

    const { error: contentUpsertError } = await session.supabase.from('ecd_content').upsert(
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
        {
          ecd_id: session.ecdId,
          section: 'gallery',
          content_blocks: mergedGalleryUrls,
          updated_by: session.user.id,
        },
      ],
      { onConflict: 'ecd_id,section' }
    )
    if (contentUpsertError) {
      redirect('/ecd/website?status=save-error')
    }

    const { data: updatedCentre } = await session.supabase.from('ecd_centres').select('slug').eq('id', session.ecdId).maybeSingle()
    revalidatePath('/ecd/website')
    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/dashboard')
    revalidatePath('/directory')
    if (updatedCentre?.slug) revalidatePath(`/c/${updatedCentre.slug}`)
    if (updatedCentre?.slug) revalidatePath(`/centre/${updatedCentre.slug}`)
    redirect('/ecd/website?status=draft-saved')
  }

  async function setWebsitePublished(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const nextPublished = String(formData.get('next_published') ?? '') === 'true'
    const nowIso = new Date().toISOString()

    const { error: publishToggleError } = await session.supabase
      .from('ecd_centres')
      .update({ is_active: nextPublished, updated_at: nowIso })
      .eq('id', session.ecdId)
    if (publishToggleError) {
      redirect('/ecd/website?status=publish-error')
    }

    const { data: updatedCentre } = await session.supabase.from('ecd_centres').select('slug').eq('id', session.ecdId).maybeSingle()
    revalidatePath('/ecd/website')
    if (updatedCentre?.slug) revalidatePath(`/c/${updatedCentre.slug}`)
    redirect(`/ecd/website?status=${nextPublished ? 'published' : 'unpublished'}`)
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

    const { error: supportInsertError } = await session.supabase.from('support_tickets').insert({
      ticket_number: ticketNumber,
      ecd_id: session.ecdId,
      created_by: session.user.id,
      subject: 'Website setup request',
      description: summary,
      category: 'technical',
      priority: 2,
      status: 'open',
    })
    if (supportInsertError) {
      redirect('/ecd/website?status=request-error')
    }

    revalidatePath('/ecd/website')
    revalidatePath('/ecd/support')
    redirect('/ecd/website?status=request-sent')
  }

  return (
    <EcdOsShell
      title="Website"
      description="Build your page, publish when ready, and request custom website setup."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      {statusMeta ? (
        <div
          className={cn(
            'mb-6 rounded-2xl border px-4 py-3',
            statusMeta.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          )}
        >
          <p className="text-sm font-bold">{statusMeta.title}</p>
          <p className="mt-1 text-xs font-medium">{statusMeta.description}</p>
        </div>
      ) : null}
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="border-slate-100 bg-white lg:col-span-2 shadow-sm text-slate-900 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle>Website Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="rounded-full bg-slate-100 p-1">
              <div className="h-2.5 rounded-full bg-teal-600 transition-[width] duration-700" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-sm font-bold text-teal-700">{completionPct}% complete</p>
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors',
                  hasBrandMedia
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                )}
              >
                Step 4: Add brand media
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
            <Button variant="outline" asChild className="w-full border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
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
                  className="cc-native-field mt-1.5 h-12 rounded-2xl"
                />
              </div>

              <div id="brand-media" className="scroll-mt-28 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brand media</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="logo_file" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Logo image
                    </label>
                    {centre?.logo_url ? (
                      <Image
                        src={centre.logo_url}
                        alt="Current centre logo"
                        width={96}
                        height={96}
                        className="h-20 w-20 rounded-2xl border border-slate-200 object-cover bg-white"
                      />
                    ) : (
                      <p className="text-xs text-slate-500">No logo uploaded yet.</p>
                    )}
                    <input
                      id="logo_file"
                      name="logo_file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="cc-native-field h-12 rounded-2xl py-2 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                    />
                    <p className="text-xs text-slate-500">Shows on directory cards, admissions pages, and jobs pages.</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="hero_file" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Hero image
                    </label>
                    {centre?.cover_image_url ? (
                      <Image
                        src={centre.cover_image_url}
                        alt="Current hero image"
                        width={384}
                        height={144}
                        className="h-24 w-full rounded-2xl border border-slate-200 object-cover bg-white"
                      />
                    ) : (
                      <p className="text-xs text-slate-500">No hero image uploaded yet.</p>
                    )}
                    <input
                      id="hero_file"
                      name="hero_file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="cc-native-field h-12 rounded-2xl py-2 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                    />
                    <p className="text-xs text-slate-500">Used as the public page hero and listing cover image.</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="gallery_files" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Gallery pictures
                    </label>
                    {existingGalleryUrls.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {existingGalleryUrls.slice(0, 8).map((url) => (
                          <Image
                            key={url}
                            src={url}
                            alt="Gallery preview"
                            width={180}
                            height={120}
                            className="h-20 w-full rounded-xl border border-slate-200 object-cover bg-white"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No gallery pictures uploaded yet.</p>
                    )}
                    <input
                      id="gallery_files"
                      name="gallery_files"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      multiple
                      className="cc-native-field h-12 rounded-2xl py-2 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                    />
                    <p className="text-xs text-slate-500">
                      Add new gallery pictures anytime. We keep up to {MAX_GALLERY_IMAGES} most recent unique images.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="about" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">About section</label>
                <textarea
                  id="about"
                  name="about"
                  defaultValue={aboutText}
                  placeholder="Use plain language about your crèche and daily routine."
                  className="cc-native-field mt-1.5 h-auto min-h-32 py-3 rounded-2xl leading-relaxed"
                />
              </div>

              <div>
                <label htmlFor="programs" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Programs (Title | Description)</label>
                <textarea
                  id="programs"
                  name="programs"
                  defaultValue={programsText}
                  placeholder="Toddler Group | Play-based learning for ages 2-3"
                  className="cc-native-field mt-1.5 h-auto min-h-32 py-3 rounded-2xl leading-relaxed"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age-based monthly pricing</p>
                <p className="mt-1 ml-1 text-xs text-slate-500">
                  These prices auto-fill applications, offer fees, and monthly invoices.
                </p>
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-[1fr_160px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <p>Age Group</p>
                    <p className="text-right">Monthly Fee (R)</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {AGE_GROUP_PRICE_BANDS.map((band) => (
                      <div key={band.key} className="grid grid-cols-[1fr_160px] items-center px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{band.label}</p>
                        <input
                          name={agePriceFieldByKey[band.key]}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={centsToRandInput(ageGroupPricing[band.key].monthly_fee_cents)}
                          className="cc-native-field h-10 rounded-xl text-right font-semibold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 ml-1 text-xs text-teal-700">
                  Current fee range:{' '}
                  {pricingSummary.minFeeRand === null
                    ? 'Contact for fees'
                    : pricingSummary.minFeeRand === pricingSummary.maxFeeRand
                      ? `R${pricingSummary.minFeeRand.toFixed(2)}`
                      : `R${pricingSummary.minFeeRand.toFixed(2)} - R${pricingSummary.maxFeeRand?.toFixed(2)}`}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2">Visible sections</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sectionOptions.map((section) => (
                    <label
                      key={section.key}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <input type="checkbox" name="sections" value={section.key} defaultChecked={enabledSections.includes(section.key)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                      {section.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl shadow-sm transition-colors">Save Draft</Button>
                {centre?.slug ? (
                  <Button type="button" variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
                    <a href={`/c/${centre.slug}?preview=1`} target="_blank" rel="noreferrer">
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
                    ? 'Your crèche page is live and visible to parents.'
                    : 'Your crèche page is hidden until you publish.'}
                </p>
              </div>

              <form action={setWebsitePublished}>
                <input type="hidden" name="next_published" value={centre?.is_active ? 'false' : 'true'} />
                <Button
                  type="submit"
                  variant={centre?.is_active ? 'outline' : 'default'}
                  className={cn("w-full h-12 rounded-2xl font-bold transition-colors shadow-sm", 
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
                <select name="site_type" className="cc-native-field h-11 rounded-2xl text-sm">
                  <option value="mini-site">Mini website (quick launch)</option>
                  <option value="full-website">Full website (deeper build)</option>
                </select>
                <select name="domain_plan" className="cc-native-field h-11 rounded-2xl text-sm">
                  <option value="platform-subdomain">Use platform subdomain</option>
                  <option value="bring-own-domain">I want my own domain</option>
                  <option value="need-domain-help">I need help buying a domain</option>
                </select>
                <textarea
                  name="goals"
                  className="cc-native-field h-auto min-h-24 py-3 rounded-2xl text-sm leading-relaxed"
                  placeholder="What should this website achieve for your crèche?"
                />
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 rounded-2xl shadow-sm transition-colors">Send Request</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </EcdOsShell>
  )
}





