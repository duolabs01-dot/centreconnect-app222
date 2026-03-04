'use server'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type QueryParams = {
  search?: string
  suburb?: string
  age?: string
  fee?: string
  subsidy?: string
  page?: string
}

const PAGE_SIZE = 24

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

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const params = url.searchParams
  const query: QueryParams = {
    search: params.get('search') ?? undefined,
    suburb: params.get('suburb') ?? undefined,
    age: params.get('age') ?? undefined,
    fee: params.get('fee') ?? undefined,
    subsidy: params.get('subsidy') ?? undefined,
    page: params.get('page') ?? '1',
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let centresQuery = supabase
    .from('public_ecd_centres')
    .select(
      'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted'
    )
    .order('name', { ascending: true })
    .range(0, PAGE_SIZE - 1)

  let countQuery = supabase
    .from('public_ecd_centres')
    .select('id', { count: 'exact', head: true })

  if (query.search) {
    const pattern = `%${query.search}%`
    centresQuery = centresQuery.ilike('name', pattern)
    countQuery = countQuery.ilike('name', pattern)
  }

  if (query.suburb) {
    centresQuery = centresQuery.eq('suburb', query.suburb)
    countQuery = countQuery.eq('suburb', query.suburb)
  }

  if (query.age) {
    centresQuery = centresQuery.contains('age_groups', [query.age])
    countQuery = countQuery.contains('age_groups', [query.age])
  }

  if (query.fee) {
    const feeCap = Number(query.fee)
    if (!Number.isNaN(feeCap)) {
      centresQuery = centresQuery.or(`monthly_fee_min.lte.${feeCap},monthly_fee_max.lte.${feeCap}`)
      countQuery = countQuery.or(`monthly_fee_min.lte.${feeCap},monthly_fee_max.lte.${feeCap}`)
    }
  }

  if (query.subsidy === 'true') {
    centresQuery = centresQuery.eq('subsidy_accepted', true)
    countQuery = countQuery.eq('subsidy_accepted', true)
  }

  const pageNumber = Number.parseInt(query.page ?? '1', 10)
  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1
  const from = (safePage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  centresQuery = centresQuery.range(from, to)

  const [{ data: centresData }, { count }] = await Promise.all([centresQuery, countQuery])
  const centreIds = (centresData ?? []).map((centre) => centre.id as string)
  const applicationByCentre = new Map<string, { id: string; status: string | null }>()
  let supportsOwnerId = true
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
    let geoRows: CentreGeoRow[] = []
    const { data: geoRowsWithOwner, error: geoRowsWithOwnerError } = await supabase
      .from('ecd_centres')
      .select('id,latitude,longitude,onboarding_complete,owner_id')
      .in('id', centreIds)

    if (geoRowsWithOwnerError) {
      supportsOwnerId = false
      const { data: fallbackGeoRows } = await supabase
        .from('ecd_centres')
        .select('id,latitude,longitude,onboarding_complete')
        .in('id', centreIds)
      geoRows = ((fallbackGeoRows ?? []) as Omit<CentreGeoRow, 'owner_id'>[]).map((row) => ({
        ...row,
        owner_id: null,
      }))
    } else {
      geoRows = (geoRowsWithOwner ?? []) as CentreGeoRow[]
    }

    geoRows.forEach((row) => {
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

  return NextResponse.json({
    centres: (centresData ?? []).map((centre) => ({
      ...centre,
      subsidy_accepted: Boolean(centre.subsidy_accepted),
      is_claimed: supportsOwnerId
        ? Boolean(geoById.get(centre.id as string)?.owner_id)
        : Boolean(geoById.get(centre.id as string)?.onboarding_complete ?? centre.is_registered),
      latitude: toFiniteNumber(geoById.get(centre.id as string)?.latitude),
      longitude: toFiniteNumber(geoById.get(centre.id as string)?.longitude),
      existingApplicationId: applicationByCentre.get(centre.id as string)?.id ?? null,
      existingApplicationStatus: applicationByCentre.get(centre.id as string)?.status ?? null,
    })),
    totalResults: count ?? 0,
  })
}
