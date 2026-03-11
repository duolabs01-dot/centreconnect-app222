import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Container } from '@/components/layout/container'
import { MapPin } from 'lucide-react'
import DirectoryExplorer from '@/components/directory/DirectoryExplorer'
import type { DirectoryCentre, RawDirectoryCentre } from '@/types/directory-centre'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { isPilotCentreIdentity } from '@/lib/ecd/pilot-centres'
import { resolveCentreCoordinates } from '@/lib/geo/centre-location'
import { defaultConfidenceForSource, readCentreLocationMetadata } from '@/lib/geo/centre-location-metadata'
import { demoDirectoryCentres, shouldUseDemoCentreData } from '@/lib/demo/demo-centres'

export const metadata: Metadata = {
  title: 'CentreConnect directory',
  description: 'Search, compare, and stay connected with trusted crèches across Alexandra and Johannesburg.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

export const revalidate = 60

type DirectoryPageProps = {
  searchParams?: {
    search?: string
    suburb?: string
    age?: string
    fee?: string
    registered?: string
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
  address: string | null
  communication_automation_settings: Record<string, unknown> | null
}

type CentreApplicationRow = {
  id: string
  ecd_id: string
  status: string | null
}

function toDirectoryCentre(centre: RawDirectoryCentre): DirectoryCentre | null {
  const safeSlug = normalizeCentreSlug(centre.slug)
  if (!safeSlug) return null

  const { latitude, longitude, source } = resolveCentreCoordinates({
    latitude: centre.latitude,
    longitude: centre.longitude,
    slug: safeSlug,
    suburb: centre.suburb,
    city: centre.city,
    storedSource: centre.coordinate_source ?? null,
  })

  return {
    id: centre.id,
    slug: safeSlug,
    name: centre.name,
    tagline: centre.tagline,
    suburb: centre.suburb,
    city: centre.city,
    age_groups: centre.age_groups,
    is_registered: Boolean(centre.is_claimed) && Boolean(centre.is_registered),
    logo_url: centre.logo_url,
    cover_image_url: centre.cover_image_url,
    capacity: null,
    fees_display_mode: centre.fees_display_mode,
    monthly_fee_min: centre.monthly_fee_min,
    monthly_fee_max: centre.monthly_fee_max,
    subsidy_accepted: Boolean(centre.subsidy_accepted),
    registration_fee: centre.registration_fee ?? null,
    is_claimed: Boolean(centre.is_claimed),
    is_pilot: isPilotCentreIdentity({ name: centre.name, slug: safeSlug }),
    is_featured: isPilotCentreIdentity({ name: centre.name, slug: safeSlug }),
    operating_schedule: centre.operating_schedule ?? null,
    operating_hours_summary: centre.operating_hours_summary ?? null,
    latitude,
    longitude,
    coordinate_source: centre.coordinate_source ?? source,
    coordinate_confidence: centre.coordinate_confidence ?? defaultConfidenceForSource(centre.coordinate_source ?? source),
    contact_whatsapp: centre.contact_whatsapp ?? null,
    contact_phone: centre.contact_phone ?? null,
    phone: centre.phone ?? null,
    existingApplicationId: centre.existingApplicationId ?? null,
    existingApplicationStatus: centre.existingApplicationStatus ?? null,
  }
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const search = (searchParams?.search ?? '').trim()
  const rawSuburb = (searchParams?.suburb ?? '').trim()
  const rawAgeGroup = (searchParams?.age ?? '').trim()
  const rawFee = (searchParams?.fee ?? '').trim()
  const rawRegistered = (searchParams?.registered ?? '').trim()

  const selectedSuburb = rawSuburb.toLowerCase() === 'all' ? '' : rawSuburb
  const selectedAgeGroup = rawAgeGroup.toLowerCase() === 'all' ? '' : rawAgeGroup
  const selectedFee = rawFee.toLowerCase() === 'any' ? '' : rawFee
  const selectedRegistered = rawRegistered === 'true'
  let effectiveSuburb = selectedSuburb

  const pageSize = 20
  const rawPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageFrom = (currentPage - 1) * pageSize
  const pageTo = pageFrom + pageSize - 1

  let centres: DirectoryCentre[] = []
  let allActiveCentres: DirectoryFacetSource[] = []
  let totalResults = 0
  let viewerRole: string | null = null

  if (shouldUseDemoCentreData()) {
    effectiveSuburb = selectedSuburb || 'Alexandra'
    centres = demoDirectoryCentres.filter((centre) => {
      if (search && !centre.name.toLowerCase().includes(search.toLowerCase())) return false
      if (effectiveSuburb && centre.suburb !== effectiveSuburb) return false
      if (selectedRegistered && !centre.is_registered) return false
      if (selectedAgeGroup && !(centre.age_groups ?? []).includes(selectedAgeGroup)) return false
      if (selectedFee) {
        const feeCap = Number(selectedFee)
        const feeValue = centre.monthly_fee_min ?? centre.monthly_fee_max
        if (!Number.isNaN(feeCap) && typeof feeValue === 'number' && feeValue > feeCap) return false
      }
      return true
    })
    allActiveCentres = demoDirectoryCentres.map((centre) => ({ suburb: centre.suburb, age_groups: centre.age_groups }))
    totalResults = centres.length
  } else try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
      viewerRole = profile?.role ?? null
    }

    const facetsQuery = supabase.from('public_ecd_centres').select('suburb,age_groups').order('suburb', { ascending: true })

    let centresQuery = supabase
      .from('public_ecd_centres')
      .select(
        'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,operating_schedule,operating_hours_summary'
      )
      .order('is_registered', { ascending: false })
      .order('name', { ascending: true })
      .range(pageFrom, pageTo)

    let countQuery = supabase.from('public_ecd_centres').select('id', { count: 'exact', head: true })

    if (search) {
      centresQuery = centresQuery.ilike('name', `%${search}%`)
      countQuery = countQuery.ilike('name', `%${search}%`)
    }

    effectiveSuburb = selectedSuburb || (!user && !search ? 'Alexandra' : selectedSuburb)

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

    if (selectedRegistered) {
      centresQuery = centresQuery.eq('is_registered', true)
      countQuery = countQuery.eq('is_registered', true)
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
        address: string | null
        communication_automation_settings: Record<string, unknown> | null
      }
    >()

    if (centreIds.length > 0) {
      const { data: geoRows } = await supabase
        .from('ecd_centres')
        .select('id,latitude,longitude,onboarding_complete,owner_id,address,communication_automation_settings')
        .in('id', centreIds)

        ; ((geoRows ?? []) as CentreGeoRow[]).forEach((row) => {
          geoById.set(row.id, {
            latitude: row.latitude,
            longitude: row.longitude,
            onboarding_complete: row.onboarding_complete,
            owner_id: row.owner_id,
            address: row.address,
            communication_automation_settings: row.communication_automation_settings,
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

        ; ((applicationRows ?? []) as CentreApplicationRow[]).forEach((row) => {
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
        const locationMetadata = readCentreLocationMetadata(geo?.communication_automation_settings)
        const resolvedCoords = resolveCentreCoordinates({
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          slug: centre.slug,
          suburb: centre.suburb,
          city: centre.city,
          address: geo?.address ?? null,
          storedSource: locationMetadata?.source,
        })
        return toDirectoryCentre({
          ...centre,
          is_claimed: hasOwner,
          latitude: resolvedCoords.latitude,
          longitude: resolvedCoords.longitude,
          coordinate_source: resolvedCoords.source,
          coordinate_confidence: locationMetadata?.confidence ?? defaultConfidenceForSource(resolvedCoords.source),
          existingApplicationId: existingApplication?.id ?? null,
          existingApplicationStatus: existingApplication?.status ?? null,
        } as RawDirectoryCentre)
      })
      .filter((centre): centre is DirectoryCentre => Boolean(centre))
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1
        if (!a.is_featured && b.is_featured) return 1
        if (a.is_pilot && !b.is_pilot) return -1
        if (!a.is_pilot && b.is_pilot) return 1
        return 0
      })
  } catch (err) {
    console.error('DirectoryPage error:', err)
  }

  const suburbs = Array.from(
    new Set(allActiveCentres.map((centre) => centre.suburb?.trim()).filter((value): value is string => Boolean(value)))
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
      <div
        className="space-y-6 pb-20 text-[#22312E]"
        style={{
          fontFamily: 'var(--font-display)',
          ['--teal' as string]: '#0D9488',
          ['--amber' as string]: '#D4935A',
          ['--amber-light' as string]: '#FDF0E6',
          ['--cream' as string]: '#FAF8F4',
          ['--warm-white' as string]: '#FFFDF9',
        }}
      >
        <header className="rounded-[2rem] border border-[#E8DDD0] bg-[var(--warm-white)] px-5 py-5 shadow-[0_18px_40px_rgba(31,44,39,0.05)] sm:px-8 sm:py-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] sm:text-[13px]"
                style={{
                  backgroundColor: 'var(--amber-light)',
                  borderColor: 'rgba(212,147,90,0.28)',
                  color: 'var(--amber)',
                }}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{effectiveSuburb ? `${effectiveSuburb} directory` : 'Johannesburg directory'}</span>
              </div>
              <h1
                className="mt-4 max-w-[13ch] text-[2rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#1F2D29] sm:max-w-none sm:text-[2.8rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Find the right creche faster.
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#5F6C68] sm:text-[16px] sm:leading-7">
                {effectiveSuburb ? `See centres in ${effectiveSuburb}, check fees, ages, and next steps fast, then apply or contact the centre.` : 'Check fees, ages, and next steps fast, then apply online or contact the centre directly.'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:w-[26rem]">
              <div className="rounded-[1.25rem] border border-[#DCEEE8] bg-[#F4FBF8] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6A7672]">CentreConnect</p>
                <p className="mt-1 text-sm font-semibold text-[#1F4B42]">Apply online</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#DCEEE8] bg-[#F4FBF8] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6A7672]">CentreConnect</p>
                <p className="mt-1 text-sm font-semibold text-[#1F4B42]">Message in app</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#E7DDD1] bg-white px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6A7672]">Public listing</p>
                <p className="mt-1 text-sm font-semibold text-[#22312E]">Call or WhatsApp</p>
              </div>
            </div>
          </div>
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
            suburb: effectiveSuburb,
            age: selectedAgeGroup,
            fee: selectedFee,
            registered: selectedRegistered,
          }}
          viewerRole={viewerRole}
        />
      </div>
    </Container>
  )
}








