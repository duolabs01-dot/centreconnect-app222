import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isPilotCentreIdentity } from '@/lib/ecd/pilot-centres'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { resolveCentreCoordinates } from '@/lib/geo/centre-location'
import { defaultConfidenceForSource, readCentreLocationMetadata } from '@/lib/geo/centre-location-metadata'

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
  address: string | null
  communication_automation_settings: Record<string, unknown> | null
}

type CentreApplicationRow = {
  id: string
  ecd_id: string
  status: string | null
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
      'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,operating_schedule,operating_hours_summary'
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

  const effectiveSuburb = query.suburb || (!user && !query.search ? 'Alexandra' : '')
  if (effectiveSuburb) {
    try {
      const { data: existing } = await supabase
        .from('area_search_counts')
        .select('count')
        .eq('suburb', effectiveSuburb)
        .maybeSingle()

      if (existing?.count != null) {
        await supabase
          .from('area_search_counts')
          .update({ count: (existing.count ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq('suburb', effectiveSuburb)
      } else {
        await supabase
          .from('area_search_counts')
          .insert({ suburb: effectiveSuburb, count: 1, updated_at: new Date().toISOString() })
      }
    } catch (error) {
      console.error('Area search tracking failed:', error)
    }
  }

  if (effectiveSuburb) {
    centresQuery = centresQuery.eq('suburb', effectiveSuburb)
    countQuery = countQuery.eq('suburb', effectiveSuburb)
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

  const BAJABULILE_ID = 'f580f125-81ed-412a-8d25-f187605a6a69'
  const bajabulileQuery = supabase
    .from('public_ecd_centres')
    .select(
      'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,operating_schedule,operating_hours_summary'
    )
    .eq('id', BAJABULILE_ID)
    .maybeSingle()

  const [{ data: centresData }, { count }, { data: bajabulileData }] = await Promise.all([
    centresQuery,
    countQuery,
    bajabulileQuery,
  ])

  const combinedData = [...(centresData ?? [])]
  if (bajabulileData && !combinedData.find((c) => c.id === BAJABULILE_ID)) {
    combinedData.unshift(bajabulileData)
  }

  const centreIds = combinedData.map((centre) => centre.id as string)
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

  const centres = combinedData.flatMap((centre) => {
    const safeSlug = normalizeCentreSlug((centre.slug as string | null | undefined) ?? null)
    if (!safeSlug) return []

    return [
      (() => {
        const geo = geoById.get(centre.id as string)
        const locationMetadata = readCentreLocationMetadata(geo?.communication_automation_settings)
        const resolvedCoordinates = resolveCentreCoordinates({
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          slug: safeSlug,
          suburb: (centre.suburb as string | null | undefined) ?? null,
          city: (centre.city as string | null | undefined) ?? null,
          address: geo?.address ?? null,
          storedSource: locationMetadata?.source,
        })
        return {
          ...centre,
          slug: safeSlug,
          subsidy_accepted: Boolean(centre.subsidy_accepted),
          is_registered: Boolean(geoById.get(centre.id as string)?.owner_id) ? Boolean(centre.is_registered) : false,
          is_claimed: Boolean(geoById.get(centre.id as string)?.owner_id),
          is_pilot: isPilotCentreIdentity(centre),
          is_featured: isPilotCentreIdentity(centre),
          latitude: resolvedCoordinates.latitude,
          longitude: resolvedCoordinates.longitude,
          coordinate_source: resolvedCoordinates.source,
          coordinate_confidence: locationMetadata?.confidence ?? defaultConfidenceForSource(resolvedCoordinates.source),
          existingApplicationId: applicationByCentre.get(centre.id as string)?.id ?? null,
          existingApplicationStatus: applicationByCentre.get(centre.id as string)?.status ?? null,
        }
      })(),
    ]
  })

  centres.sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1
    return 0
  })

  return NextResponse.json({
    centres,
    totalResults: count ?? 0,
  })
}


