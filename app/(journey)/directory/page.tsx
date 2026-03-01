import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout/PageContainer'
import { Sparkles } from 'lucide-react'
import { DirectoryAuthCta } from '@/components/directory/auth-cta'
import DirectoryExplorer from '@/components/directory/DirectoryExplorer'
import type { DirectoryCentre, RawDirectoryCentre } from '@/types/directory-centre'

export const metadata: Metadata = {
  title: 'Directory - CentreConnect',
  description: 'Find and filter ECD centres by suburb, age group, fees, and subsidy support.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

export const revalidate = 120

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
}

type ParentPreferences = {
  max_monthly_budget: number | null
  preferred_radius_km: number | null
  preferred_suburbs: string[] | null
  transport_needed: boolean | null
}

function getFeeOptionFromBudget(value: number | null | undefined) {
  if (!value) return ''
  if (value <= 800) return '800'
  if (value <= 1200) return '1200'
  if (value <= 2000) return '2000'
  return ''
}

function toDirectoryCentre(centre: RawDirectoryCentre): DirectoryCentre {
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
    slug: centre.slug,
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
    latitude,
    longitude,
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
  const pageSize = 24
  const rawPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageFrom = (currentPage - 1) * pageSize
  const pageTo = pageFrom + pageSize - 1

  let centres: DirectoryCentre[] = []
  let allActiveCentres: DirectoryFacetSource[] = []
  let totalResults = 0
  try {
    const supabase = await createClient()

    const facetsQuery = supabase
      .from('public_ecd_centres')
      .select('suburb,age_groups')
      .order('suburb', { ascending: true })

    let centresQuery = supabase
      .from('public_ecd_centres')
      .select(
        'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted'
      )
      .order('name', { ascending: true })
      .range(pageFrom, pageTo)

    let countQuery = supabase
      .from('public_ecd_centres')
      .select('id', { count: 'exact', head: true })

    if (search) centresQuery = centresQuery.ilike('name', `%${search}%`)
    if (search) countQuery = countQuery.ilike('name', `%${search}%`)
    if (selectedSuburb) centresQuery = centresQuery.eq('suburb', selectedSuburb)
    if (selectedSuburb) countQuery = countQuery.eq('suburb', selectedSuburb)
    if (selectedAgeGroup) centresQuery = centresQuery.contains('age_groups', [selectedAgeGroup])
    if (selectedAgeGroup) countQuery = countQuery.contains('age_groups', [selectedAgeGroup])
    if (selectedFee) {
      const feeCap = Number(selectedFee)
      if (!Number.isNaN(feeCap)) {
        centresQuery = centresQuery.or(`monthly_fee_min.lte.${feeCap},monthly_fee_max.lte.${feeCap}`)
        countQuery = countQuery.or(`monthly_fee_min.lte.${feeCap},monthly_fee_max.lte.${feeCap}`)
      }
    }
    if (selectedSubsidy) centresQuery = centresQuery.eq('subsidy_accepted', true)
    if (selectedSubsidy) countQuery = countQuery.eq('subsidy_accepted', true)

    const [facetsResult, centresResult, countResult] = await Promise.all([facetsQuery, centresQuery, countQuery])

    if (facetsResult.error) {
      console.error('Error fetching facets:', facetsResult.error)
    }
    if (centresResult.error) {
      console.error('Error fetching centres:', centresResult.error)
    }
    if (countResult.error) {
      console.error('Error counting centres:', countResult.error)
    }



    allActiveCentres = (facetsResult.data ?? []) as DirectoryFacetSource[]
    totalResults = countResult.count ?? 0

    const centreRows = (centresResult.data ?? []) as Array<RawDirectoryCentre & { id: string }>
    const centreIds = centreRows.map((centre) => centre.id)
    const geoById = new Map<string, { latitude: number | string | null; longitude: number | string | null }>()

    if (centreIds.length > 0) {
      const { data: geoRows, error: geoError } = await supabase
        .from('ecd_centres')
        .select('id,latitude,longitude')
        .in('id', centreIds)

      if (geoError) {
        console.error('Error fetching centre coordinates:', geoError)
      } else {
        ;((geoRows ?? []) as CentreGeoRow[]).forEach((row) => {
          geoById.set(row.id, { latitude: row.latitude, longitude: row.longitude })
        })
      }
    }

    centres = centreRows.map((centre) => {
      const geo = geoById.get(centre.id)
      return toDirectoryCentre({
        ...centre,
        latitude: (geo?.latitude as number | string | null | undefined) ?? null,
        longitude: (geo?.longitude as number | string | null | undefined) ?? null,
      } as RawDirectoryCentre)
    })
  } catch (err) {
    console.error('Unexpected error in DirectoryPage:', err)
    centres = []
    allActiveCentres = []
    totalResults = 0
  }


  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

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

  const defaultFilters = {
    search,
    suburb: selectedSuburb,
    age: selectedAgeGroup,
    fee: selectedFee,
    subsidy: selectedSubsidy,
  }

  const centresWithCoords = centres

  return (
    <PageContainer>
      <div className="cc-page space-y-4 sm:space-y-6">
          <section className="cc-section-block">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" />
              Trusted Discovery
            </div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl lg:text-3xl">
              Find Centres That Actually Fit Your Family
            </h1>
            <p className="text-sm text-slate-600">
              Filter by what matters: suburb, age group, fees, and subsidy support. Then compare confidently.
            </p>
          </section>

          <section className="rounded-2xl border border-cyan-100/80 bg-white/90 p-3.5 shadow-[var(--shadow-elevation-3)] sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-800">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                    Personalized for your family
                  </p>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Get personalized centre recommendations
                </p>
                <p className="text-xs text-slate-600">
                  Sign in to use saved suburb, budget, and profile preferences.
                </p>
              </div>
              <DirectoryAuthCta />
            </div>
          </section>

          <DirectoryExplorer
            initialCentres={centresWithCoords}
            suburbs={suburbs}
            ageGroups={ageGroups}
            totalResults={totalResults}
            pageSize={pageSize}
            initialPage={currentPage}
            initialFilters={defaultFilters}
          />
        </div>
      </PageContainer>
    </main>
  )
}


