import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApplyFlow } from '@/components/public/ApplyFlow'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

type ApplyPageProps = {
  params: {
    identifier: string
  }
}

type CentreRecord = {
  id: string
  slug: string
  name: string
  is_active: boolean | null
  city: string | null
  suburb: string | null
}

const centreSelect = 'id,slug,name,is_active,city,suburb'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const revalidate = 300 // 5 minutes ISR — centre data changes rarely
export const metadata: Metadata = {
  title: 'Apply | CentreConnect',
  description: 'Submit your ECD application in a few steps.',
}

const mapCentre = (centre: any): CentreRecord => ({
  id: centre.id,
  slug: centre.slug,
  name: centre.name ?? 'Unnamed centre',
  is_active: centre.is_active ?? true,
  city: centre.city ?? null,
  suburb: centre.suburb ?? null,
})

const mapPublicCentre = (centre: any): CentreRecord => ({
  id: centre.id,
  slug: centre.slug,
  name: centre.name ?? 'Unnamed centre',
  is_active: true,
  city: centre.city ?? null,
  suburb: centre.suburb ?? null,
})

function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

async function getCentreByIdentifier(identifier: string): Promise<CentreRecord | null> {
  const admin = createAdminClient()
  const normalized = identifier.trim()
  const identifierIsUuid = isUuid(normalized)

  if (identifierIsUuid) {
    const { data: byId } = await admin
      .from('ecd_centres')
      .select(centreSelect)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .eq('id', normalized)
      .maybeSingle()

    if (byId) return mapCentre(byId)
  }

  const { data: bySlug } = await admin
    .from('ecd_centres')
    .select(centreSelect)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .eq('slug', normalized)
    .maybeSingle()

  if (bySlug) return mapCentre(bySlug)

  if (identifierIsUuid) {
    const { data: publicById } = await admin
      .from('public_ecd_centres')
      .select('id,slug,name,city,suburb')
      .eq('id', normalized)
      .maybeSingle()

    if (publicById) return mapPublicCentre(publicById)
  }

  const { data: publicBySlug } = await admin
    .from('public_ecd_centres')
    .select('id,slug,name,city,suburb')
    .eq('slug', normalized)
    .maybeSingle()

  if (publicBySlug) return mapPublicCentre(publicBySlug)

  return null
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  let centre: CentreRecord | null = null

  try {
    centre = await getCentreByIdentifier(params.identifier)
  } catch (error) {
    console.error('Apply page failed for identifier:', params.identifier, error)
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Unable to open this application page</CardTitle>
            <CardDescription>Please try again in a moment or return to the centre profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/directory"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Browse centres
            </a>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!centre || centre.is_active === false) {
    notFound()
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const next = encodeURIComponent(`/apply/${centre.slug}`)
    redirect(`/login?next=${next}`)
  }

  const { data: existingApplication } = await supabase
    .from('applications')
    .select('id')
    .eq('parent_id', user.id)
    .eq('ecd_id', centre.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingApplication?.id) {
    redirect(`/parent/applications/${existingApplication.id}`)
  }

  const [{ data: children }, { data: parentDocuments }] = await Promise.all([
    supabase
      .from('children')
      .select('id,first_name,last_name,date_of_birth,gender')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('parent_documents').select('doc_type').eq('parent_id', user.id).limit(80),
  ])

  if (!children || children.length === 0) {
    redirect('/parent/children/new')
  }

  const documentCount = (parentDocuments ?? []).length
  const childCount = (children ?? []).length

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-10 lg:px-8">
      <div className="mb-3">
        <Link
          href={`/c/${centre.slug}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to centre
        </Link>
      </div>
      <div className="mb-4 rounded-[1.6rem] border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-800">Ready to apply</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">Apply to {centre.name}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">You are one calm step away from sending this application. Choose a child profile, reuse your saved documents, and submit in a few minutes.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-semibold text-cyan-800">{childCount} child profile{childCount === 1 ? '' : 's'} ready</span>
          <span className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-semibold text-cyan-800">{documentCount} document{documentCount === 1 ? '' : 's'} on file</span>
        </div>
      </div>

      <Card className="border-slate-200/90 bg-white/95 shadow-[var(--shadow-elevation-1)]">
        <CardHeader className="space-y-1.5 pb-3">
          <CardTitle className="text-xl text-slate-900 sm:text-2xl">Apply to {centre.name}</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Select a child profile and submit your application.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ApplyFlow
            centre={{
              id: centre.id,
              slug: centre.slug,
              name: centre.name,
              city: centre.city,
              suburb: centre.suburb,
            }}
            childProfiles={(children ?? []).map((child) => ({
              id: child.id,
              first_name: child.first_name,
              last_name: child.last_name,
              date_of_birth: child.date_of_birth,
            }))}
            initialDocumentTypes={(parentDocuments ?? []).map((doc) => doc.doc_type)}
          />
        </CardContent>
      </Card>
    </main>
  )
}










