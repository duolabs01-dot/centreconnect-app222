import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Container } from '@/components/layout/container'
import { Sparkles, MapPin } from 'lucide-react'
import DirectoryExplorer from '@/components/directory/DirectoryExplorer'
import type { DirectoryCentre, RawDirectoryCentre } from '@/types/directory-centre'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'

export const metadata: Metadata = {
  title: 'Find a Creche - CentreConnect',
  description: 'Search and compare trusted ECD centres in Alexandra and surrounding areas.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

export const revalidate = 60 // Faster revalidation for a "live" feel

type DirectoryPageProps = {
  searchParams?: {
    search?: string
    suburb?: string
    age?: string
    fee?: string
    subsidy?: string
    page?: string
  }
}

type DirectoryFacetSource = {
  suburb: string | null
  age_groups: string[] | null
}

type CentreGeoRow = {
  id: string
  latitude: number | string | null
  longitude: number | string | null
  onboarding_complete: boolean | null
  owner_id: string | null
}

type CentreApplicationRow = {
  id: string
  ecd_id: string
  status: string | null
}

function toDirectoryCentre(centre: RawDirectoryCentre): DirectoryCentre | null {
  const safeSlug = normalizeCentreSlug(centre.slug)
  if (!safeSlug) return null

  const latitude =
    typeof centre.latitude === 'number'
      ? centre.latitude
      : centre.latitude != null
        ? Number(centre.latitude)
        : null
  const longitude =
    typeof centre.longitude === 'number'
      ? centre.longitude
      : centre.longitude != null
        ? Number(centre.longitude)
        : null

  return {
    id: centre.id,
    slug: safeSlug,
    name: centre.name,
    tagline: centre.tagline,
    suburb: centre.suburb,
    city: centre.city,
    age_groups: centre.age_groups,
    is_registered: centre.is_registered,
    logo_url: centre.logo_url,
    cover_image_url: centre.cover_image_url,
    capacity: null,
    fees_display_mode: centre.fees_display_mode,
    monthly_fee_min: centre.monthly_fee_min,
    monthly_fee_max: centre.monthly_fee_max,
    subsidy_accepted: Boolean(centre.subsidy_accepted),
    is_claimed: Boolean(centre.is_claimed),
    latitude,
    longitude,
    existingApplicationId: centre.existingApplicationId ?? null,
    existingApplicationStatus: centre.existingApplicationStatus ?? null,
  }
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const search = (searchParams?.search ?? '').trim()
  const rawSuburb = (searchParams?.suburb ?? '').trim()
  const rawAgeGroup = (searchParams?.age ?? '').trim()
  const rawFee = (searchParams?.fee ?? '').trim()
  const rawSubsidy = (searchParams?.subsidy ?? '').trim()

  const selectedSuburb = rawSuburb.toLowerCase() === 'all' ? '' : rawSuburb
  const selectedAgeGroup = rawAgeGroup.toLowerCase() === 'all' ? '' : rawAgeGroup
  const selectedFee = rawFee.toLowerCase() === 'any' ? '' : rawFee
  const selectedSubsidy = rawSubsidy === 'true'
  
  const pageSize = 20 // Slightly smaller for faster initial paint
  const rawPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageFrom = (currentPage - 1) * pageSize
  const pageTo = pageFrom + pageSize - 1

  let centres: DirectoryCentre[] = []
  let allActiveCentres: DirectoryFacetSource[] = []
  let totalResults = 0
  
  try {
    const supabase = await createClient()

    // 1. Get user profile if it exists to help with default logic
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Fetch facets and centres in parallel
    const facetsQuery = supabase
      .from('public_ecd_centres')
      .select('suburb,age_groups')
      .order('suburb', { ascending: true })

    let centresQuery = supabase
      .from('public_ecd_centres')
      .select(
        'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted'
      )
      .order('is_registered', { ascending: false }) // Prioritize registered centres
      .order('name', { ascending: true })
      .range(pageFrom, pageTo)

    let countQuery = supabase
      .from('public_ecd_centres')
      .select('id', { count: 'exact', head: true })

    // Apply filters
    if (search) {
      centresQuery = centresQuery.ilike('name', `%${search}%`)
      countQuery = countQuery.ilike('name', `%${search}%`)
    }
    
    // PILOT LOGIC: Default to Alexandra if no suburb is selected and user is unauthenticated
    const effectiveSuburb = selectedSuburb || (!user && !search ? 'Alexandra' : selectedSuburb)
    
    if (effectiveSuburb) {
      centresQuery = centresQuery.eq('suburb', effectiveSuburb)
      countQuery = countQuery.eq('suburb', effectiveSuburb)
    }
    
    if (selectedAgeGroup) {
      centresQuery = centresQuery.contains('age_groups', [selectedAgeGroup])
      countQuery = countQuery.contains('age_groups', [selectedAgeGroup])
    }
    
    if (selectedFee) {
      const feeCap = Number(selectedFee)
      if (!Number.isNaN(feeCap)) {
        centresQuery = centresQuery.or(`monthly_fee_min.lte.${feeCap},monthly_fee_max.lte.${feeCap}`)
        countQuery = countQuery.or(`monthly_fee_min.lte.${feeCap},monthly_fee_max.lte.${feeCap}`)
      }
    }
    
    if (selectedSubsidy) {
      centresQuery = centresQuery.eq('subsidy_accepted', true)
      countQuery = countQuery.eq('subsidy_accepted', true)
    }

    const [facetsResult, centresResult, countResult] = await Promise.all([facetsQuery, centresQuery, countQuery])

    allActiveCentres = (facetsResult.data ?? []) as DirectoryFacetSource[]
    totalResults = countResult.count ?? 0

    const centreRows = (centresResult.data ?? []) as Array<RawDirectoryCentre & { id: string }>
    const centreIds = centreRows.map((centre) => centre.id)
    const applicationByCentre = new Map<string, { id: string; status: string | null }>()
    const geoById = new Map<
      string,
      {
        latitude: number | string | null
        longitude: number | string | null
        onboarding_complete: boolean | null
        owner_id: string | null
      }
    >()

    if (centreIds.length > 0) {
      const { data: geoRows } = await supabase
        .from('ecd_centres')
        .select('id,latitude,longitude,onboarding_complete,owner_id')
        .in('id', centreIds)

      ;((geoRows ?? []) as CentreGeoRow[]).forEach((row) => {
        geoById.set(row.id, {
          latitude: row.latitude,
          longitude: row.longitude,
          onboarding_complete: row.onboarding_complete,
          owner_id: row.owner_id,
        })
      })
    }

    if (user && centreIds.length > 0) {
      const { data: applicationRows } = await supabase
        .from('applications')
        .select('id,ecd_id,status')
        .eq('parent_id', user.id)
        .in('ecd_id', centreIds)
        .order('created_at', { ascending: false })

      ;((applicationRows ?? []) as CentreApplicationRow[]).forEach((row) => {
        if (!applicationByCentre.has(row.ecd_id)) {
          applicationByCentre.set(row.ecd_id, {
            id: row.id,
            status: row.status ?? null,
          })
        }
      })
    }

    centres = centreRows
      .map((centre) => {
        const geo = geoById.get(centre.id)
        const existingApplication = applicationByCentre.get(centre.id)
        const hasOwner = typeof geo?.owner_id === 'string' && geo.owner_id.trim().length > 0
        return toDirectoryCentre({
          ...centre,
          is_claimed: hasOwner,
          latitude: (geo?.latitude as number | string | null | undefined) ?? null,
          longitude: (geo?.longitude as number | string | null | undefined) ?? null,
          existingApplicationId: existingApplication?.id ?? null,
          existingApplicationStatus: existingApplication?.status ?? null,
        } as RawDirectoryCentre)
      })
      .filter((centre): centre is DirectoryCentre => Boolean(centre))
  } catch (err) {
    console.error('DirectoryPage error:', err)
  }

  // Facet processing
  const suburbs = Array.from(
    new Set(
      allActiveCentres
        .map((centre) => centre.suburb?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b))

  const ageGroups = Array.from(
    new Set(
      allActiveCentres.flatMap((centre) =>
        (centre.age_groups ?? []).map((group) => group.trim()).filter(Boolean)
      )
    )
  ).sort((a, b) => a.localeCompare(b))

  return (
    <Container>
      <div className="space-y-6 pb-20">
        {/* Simplified, Premium Header */}
        <header className="px-1">
          <div className="flex items-center gap-2 text-cyan-600 mb-2">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Alexandra Pilot</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Find the right creche.
          </h1>
          <p className="mt-2 text-slate-500 max-w-lg">
            Compare trusted centres in Alexandra by price, age group, and government subsidy.
          </p>
        </header>

        <DirectoryExplorer
          initialCentres={centres}
          suburbs={suburbs}
          ageGroups={ageGroups}
          totalResults={totalResults}
          pageSize={pageSize}
          initialPage={currentPage}
          initialFilters={{
            search,
            suburb: selectedSuburb, // Don't pass effectiveSuburb here so the UI shows current filter state
            age: selectedAgeGroup,
            fee: selectedFee,
            subsidy: selectedSubsidy,
          }}
        />
      </div>
    </Container>
  )
}

