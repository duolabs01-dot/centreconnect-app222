import type { Metadata } from 'next'
import HomeClientPage, { type HomeActiveCentre } from './page.client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isPilotCentreIdentity } from '@/lib/ecd/pilot-centres'
import { demoDirectoryCentres, shouldUseDemoCentreData } from '@/lib/demo/demo-centres'
import {
  deriveParentEntryPath,
  hasEnrolledChildStatus,
  hasPendingParentApplicationStatus,
  isEnrolledApplicationStatus,
} from '@/lib/parent/home-state'

export const revalidate = 3600

type UserRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user' | null

export const metadata: Metadata = {
  title: 'CentreConnect - Find Creches Near You',
  description: 'Browse trusted creches, compare options, and track your applications in one place.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

function pickPrimaryAgeGroup(value: unknown) {
  if (!Array.isArray(value)) return null

  const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return first?.trim() ?? null
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { source?: string }
}) {
  if (searchParams?.source === 'pwa') {
    redirect('/')
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let user: { id: string } | null = null

  try {
    supabase = await createClient()
    const userResult = await supabase.auth.getUser()
    user = (userResult.data?.user as { id: string } | null) ?? null
  } catch (error) {
    console.error('[home] Failed to initialize Supabase session context:', error)
  }

  let role: UserRole = null

  if (user && supabase) {
    try {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()

      role = (profile?.role as UserRole | undefined) ?? null
    } catch (error) {
      console.error('[home] Failed to load user profile role:', error)
      role = null
    }

    if (role === 'platform_admin') {
      redirect('/admin/command')
    }
    if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') {
      redirect('/ecd/dashboard')
    }
    if (role === 'parent_user') {
      const parentEntryPath = await getParentEntryPath(supabase, user.id)
      redirect(parentEntryPath)
    }
  }

  async function getParentEntryPath(supabase: Awaited<ReturnType<typeof createClient>>, parentId: string) {
    const [{ data: children }, { data: applications }] = await Promise.all([
      supabase.from('children').select('id,enrollment_status').eq('parent_id', parentId),
      supabase.from('applications').select('id,status').eq('parent_id', parentId),
    ])

    const hasChildren = (children?.length ?? 0) > 0
    const hasEnrolledChild =
      (children ?? []).some((child: { enrollment_status?: string | null }) =>
        hasEnrolledChildStatus(child.enrollment_status)
      ) ||
      (applications ?? []).some((application: { status?: string | null }) =>
        isEnrolledApplicationStatus(application.status)
      )
    const hasPendingApplications = (applications ?? []).some((application: { status?: string | null }) =>
      hasPendingParentApplicationStatus(application.status)
    )

    return deriveParentEntryPath({
      hasChildren,
      hasPendingApplications,
      hasEnrolledChild,
    })
  }

  let activeCentres: HomeActiveCentre[] = shouldUseDemoCentreData()
    ? demoDirectoryCentres.map((centre) => ({
        id: centre.id,
        name: centre.name,
        slug: centre.slug,
        suburb: centre.suburb,
        primaryAgeGroup: pickPrimaryAgeGroup(centre.age_groups),
        isRegistered: centre.is_registered,
        isClaimed: centre.is_claimed,
        isPilot: centre.is_pilot,
        isFeatured: centre.is_featured,
        coverImage: centre.cover_image_url,
        latitude: centre.latitude,
        longitude: centre.longitude,
      }))
    : []

  if (supabase && !shouldUseDemoCentreData()) {
    try {
      const admin = createAdminClient()
      const { data: centreRows } = await admin
        .from('ecd_centres')
        .select('id,name,slug,suburb,age_groups,is_registered,cover_image_url,latitude,longitude,owner_id,onboarding_complete,website_published,is_active')
        .eq('website_published', true)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(16)

      activeCentres = (centreRows ?? [])
        .filter((centre: any) => centre.website_published === true)
        .map((centre: any) => ({
          id: String(centre.id),
          name: typeof centre.name === 'string' && centre.name.trim().length > 0 ? centre.name.trim() : 'Creche',
          slug: typeof centre.slug === 'string' && centre.slug.trim().length > 0 ? centre.slug.trim() : null,
          suburb: typeof centre.suburb === 'string' && centre.suburb.trim().length > 0 ? centre.suburb.trim() : null,
          primaryAgeGroup: pickPrimaryAgeGroup(centre.age_groups),
          isRegistered: Boolean(centre.is_registered),
          isClaimed:
            (typeof centre.owner_id === 'string' && centre.owner_id.trim().length > 0) ||
            centre.onboarding_complete === true ||
            centre.website_published === true,
          isPilot: isPilotCentreIdentity({ name: centre.name, slug: centre.slug }),
          isFeatured: isPilotCentreIdentity({ name: centre.name, slug: centre.slug }),
          coverImage: centre.cover_image_url ?? null,
          latitude: typeof centre.latitude === 'number' ? centre.latitude : null,
          longitude: typeof centre.longitude === 'number' ? centre.longitude : null,
        }))
        .sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1
          if (!a.isFeatured && b.isFeatured) return 1
          if (a.isPilot && !b.isPilot) return -1
          if (!a.isPilot && b.isPilot) return 1
          return 0
        })
        .slice(0, 6)
    } catch (error) {
      console.error('[home] Failed to load active centres for landing page:', error)
    }
  }

  return <HomeClientPage activeCentres={activeCentres} />
}



