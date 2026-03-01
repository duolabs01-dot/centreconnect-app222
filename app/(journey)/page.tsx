import type { Metadata } from 'next'
import HomeClientPage from './page.client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type UserRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user' | null
type JobOpportunity = {
  id: string
  title: string
  roleType: string
  closesAt: string | null
  centreName: string
  centreSlug: string | null
  suburb: string | null
  city: string | null
}

type ShortlistCentre = {
  id: string
  name: string
  slug: string
  suburb: string | null
  city: string | null
  tagline: string | null
  latitude: number | null
  longitude: number | null
}

export const metadata: Metadata = {
  title: 'CentreConnect - Find ECD Centres Near You',
  description: 'Browse trusted ECD centres, compare options, and track your applications in one place.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: UserRole = null
  const userEmail: string | null = user?.email ?? null
  let jobOpportunities: JobOpportunity[] = []
  let shortlistCentres: ShortlistCentre[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    role = (profile?.role as UserRole | undefined) ?? null

    if (role === 'platform_admin') {
      redirect('/admin/command')
    }
    if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') {
      redirect('/ecd/dashboard')
    }
    if (role === 'parent_user') {
      redirect('/parent/dashboard')
    }
  }

  if (!user) {
    const [{ data: jobsRaw }, { data: shortlistRows }] = await Promise.all([
      supabase
        .from('jobs')
        .select(`
          id,
          title,
          role_type,
          closes_at,
          ecd_centres (
            name,
            slug,
            suburb,
            city
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('ecd_centres')
        .select('id,name,slug,suburb,city,tagline,latitude,longitude,is_registered')
        .eq('is_active', true)
        .order('is_registered', { ascending: false })
        .order('name', { ascending: true })
        .limit(40),
    ])

    jobOpportunities =
      (jobsRaw ?? []).map((job: any) => {
        const centre = Array.isArray(job.ecd_centres) ? job.ecd_centres[0] : job.ecd_centres
        return {
          id: job.id as string,
          title: (job.title as string | undefined) ?? 'Job opportunity',
          roleType: (job.role_type as string | undefined) ?? 'other',
          closesAt: (job.closes_at as string | null | undefined) ?? null,
          centreName: (centre?.name as string | undefined) ?? 'ECD Centre',
          centreSlug: (centre?.slug as string | undefined) ?? null,
          suburb: (centre?.suburb as string | undefined) ?? '',
          city: (centre?.city as string | null | undefined) ?? null,
        }
      }) ?? []

    shortlistCentres =
      (shortlistRows ?? []).map((centre: any) => ({
        id: centre.id as string,
        name: (centre.name as string | undefined) ?? 'ECD Centre',
        slug: (centre.slug as string | undefined) ?? '',
        suburb: (centre.suburb as string | null | undefined) ?? null,
        city: (centre.city as string | null | undefined) ?? null,
        tagline: (centre.tagline as string | null | undefined) ?? null,
        latitude:
          typeof centre.latitude === 'number'
            ? centre.latitude
            : centre.latitude != null
              ? Number(centre.latitude)
              : null,
        longitude:
          typeof centre.longitude === 'number'
            ? centre.longitude
            : centre.longitude != null
              ? Number(centre.longitude)
              : null,
      }))
      .filter((centre) => Boolean(centre.slug))
  }

  return (
    <div className="landing-legacy-typography">
      <HomeClientPage
        userEmail={userEmail}
        role={role}
        parentItems={[]}
        jobOpportunities={jobOpportunities}
        shortlistCentres={shortlistCentres}
      />
    </div>
  )
}
