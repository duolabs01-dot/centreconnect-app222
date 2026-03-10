import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Container } from '@/components/layout/container'
import { MapPin } from 'lucide-react'
import DirectoryExplorer from '@/components/directory/DirectoryExplorer'
import type { DirectoryCentre, RawDirectoryCentre } from '@/types/directory-centre'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { isPilotCentreIdentity } from '@/lib/ecd/pilot-centres'

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
    is_registered: Boolean(centre.is_claimed) && Boolean(centre.is_registered),
    logo_url: centre.logo_url,
    cover_image_url: centre.cover_image_url,
    capacity: null,
    fees_display_mode: centre.fees_display_mode,
    monthly_fee_min: centre.monthly_fee_min,
    monthly_fee_max: centre.monthly_fee_max,
    subsidy_accepted: Boolean(centre.subsidy_accepted),
    is_claimed: Boolean(centre.is_claimed),
    is_pilot: isPilotCentreIdentity({ name: centre.name, slug: safeSlug }),
    is_featured: isPilotCentreIdentity({ name: centre.name, slug: safeSlug }),
    latitude,
    longitude,
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
  const rawSubsidy = (searchParams?.subsidy ?? '').trim()

  const selectedSuburb = rawSuburb.toLowerCase() === 'all' ? '' : rawSuburb
  const selectedAgeGroup = rawAgeGroup.toLowerCase() === 'all' ? '' : rawAgeGroup
  const selectedFee = rawFee.toLowerCase() === 'any' ? '' : rawFee
  const selectedSubsidy = rawSubsidy === 'true'
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

  try {
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
        'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted,contact_whatsapp,contact_phone'
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

        ; ((geoRows ?? []) as CentreGeoRow[]).forEach((row) => {
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
          fontFamily: 'var(--font-dm-sans)',
          ['--teal' as string]: '#0D9488',
          ['--amber' as string]: '#D4935A',
          ['--amber-light' as string]: '#FDF0E6',
          ['--cream' as string]: '#FAF8F4',
          ['--warm-white' as string]: '#FFFDF9',
        }}
      >
        <header className="rounded-[2rem] border border-[#E8DDD0] bg-[var(--warm-white)] px-5 py-6 shadow-[0_18px_40px_rgba(31,44,39,0.05)] sm:px-8 sm:py-8">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] sm:text-[13px]"
            style={{
              backgroundColor: 'var(--amber-light)',
              borderColor: 'rgba(212,147,90,0.28)',
              color: 'var(--amber)',
            }}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>{effectiveSuburb ? `${effectiveSuburb} is now live on CentreConnect` : 'Johannesburg CentreConnect hub'}</span>
          </div>
          <h1
            className="mt-4 max-w-[14ch] text-[2.2rem] leading-[1.04] tracking-[-0.035em] text-[#1F2D29] sm:max-w-none sm:text-[3.2rem] sm:leading-[0.98]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            CentreConnect keeps your child’s centre organised.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#5F6C68] sm:text-[17px] sm:leading-[0.98]">
            {effectiveSuburb
              ? `${effectiveSuburb} centres on CentreConnect share attendance, documents, pickup, and safety notes right away so you can keep trusting the same team and see those updates in one calm view.`
              : `CentreConnect keeps attendance, documents, pickup tools, and parent updates in one calm place for families whose children already attend a participating centre. The filters below are still available if you want to compare other trusted partners.`}
          </p>
          <p className="mt-3 text-[13px] italic leading-6 text-[#7B827E] sm:text-[14px]">
            This is your CentreConnect hub—it is better for you now because it highlights the updates parents already get from their centre. Use the filters below only if you also want to compare other trusted crèches that keep families informed.
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
            suburb: effectiveSuburb,
            age: selectedAgeGroup,
            fee: selectedFee,
            subsidy: selectedSubsidy,
          }}
          viewerRole={viewerRole}
        />
      </div>
    </Container>
  )
}





