import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'

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

const mapCentre = (centre: any): CentreRecord => ({
  id: centre.id,
  slug: centre.slug,
  name: centre.name ?? 'Unnamed centre',
  is_active: centre.is_active ?? true,
  city: centre.city ?? null,
  suburb: centre.suburb ?? null,
})

const getCentreByIdentifier = cache(async (identifier: string): Promise<CentreRecord | null> => {
  const supabase = await createClient()

  const { data: byId } = await supabase
    .from('ecd_centres')
    .select(centreSelect)
    .eq('id', identifier)
    .maybeSingle()

  if (byId) return mapCentre(byId)

  const { data: bySlug } = await supabase
    .from('ecd_centres')
    .select(centreSelect)
    .eq('slug', identifier)
    .maybeSingle()

  if (bySlug) return mapCentre(bySlug)

  return null
})

export const metadata = async ({ params }: ApplyPageProps): Promise<Metadata> => {
  const centre = await getCentreByIdentifier(params.identifier)

  if (!centre || centre.is_active === false) {
    return {
      title: 'Centre Not Found | CentreConnect',
      description: 'This centre could not be found or is inactive.',
    }
  }

  return {
    title: `Apply to ${centre.name} | CentreConnect`,
    description: 'Submit an application to your chosen ECD centre.',
  }
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const centre = await getCentreByIdentifier(params.identifier)

  if (!centre || centre.is_active === false) {
    notFound()
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/register?redirect=/apply/${centre.id}`)
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
