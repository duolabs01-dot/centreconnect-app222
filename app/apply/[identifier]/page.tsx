import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ApplyFlow } from '@/components/public/ApplyFlow'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

export const dynamic = 'force-dynamic'
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
  const supabase = await createClient()
  const normalized = identifier.trim()
  const identifierIsUuid = isUuid(normalized)

  if (identifierIsUuid) {
    const { data: byId } = await supabase
      .from('ecd_centres')
      .select(centreSelect)
      .eq('id', normalized)
      .maybeSingle()

    if (byId) return mapCentre(byId)
  }

  const { data: bySlug } = await supabase
    .from('ecd_centres')
    .select(centreSelect)
    .eq('slug', normalized)
    .maybeSingle()

  if (bySlug) return mapCentre(bySlug)

  if (identifierIsUuid) {
    const { data: publicById } = await supabase
      .from('public_ecd_centres')
      .select('id,slug,name,city,suburb')
      .eq('id', normalized)
      .maybeSingle()

    if (publicById) return mapPublicCentre(publicById)
  }

  const { data: publicBySlug } = await supabase
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const next = encodeURIComponent(`/apply/${centre.slug}`)
    redirect(`/login?next=${next}`)
  }

  const { data: children } = await supabase
    .from('children')
    .select('id,first_name,last_name,date_of_birth,gender')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })

  if (!children || children.length === 0) {
    redirect('/parent/children/new')
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Apply to {centre.name}</CardTitle>
          <CardDescription>Select a child profile and submit your application.</CardDescription>
        </CardHeader>
        <CardContent>
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
          />
        </CardContent>
      </Card>
    </main>
  )
}
