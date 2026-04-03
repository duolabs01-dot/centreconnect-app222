import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPilotCentreIdentity } from '@/lib/ecd/pilot-centres'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { resolveCentreCoordinates } from '@/lib/geo/centre-location'
import { defaultConfidenceForSource, readCentreLocationMetadata } from '@/lib/geo/centre-location-metadata'
import { getParentShortlistSummary } from '@/lib/parent/shortlist-data'

type QueryParams = {
  search?: string
  suburb?: string
  age?: string
  fee?: string
  registered?: string
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
    registered: params.get('registered') ?? undefined,
    page: params.get('page') ?? '1',
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let centresQuery = admin
    .from('public_ecd_centres')
    .select(
      'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,operating_schedule,operating_hours_summary,latitude,longitude,owner_id,address'
    )
    .order('name', { ascending: true })
    .range(0, PAGE_SIZE - 1)

  let countQuery = admin.from('public_ecd_centres').select('id', { count: 'exact', head: true })
  if (query.search) {
    const pattern = `%${query.search}%`
    centresQuery = centresQuery.ilike('name', pattern)
    countQuery = countQuery.ilike('name', pattern)
  }

  const effectiveSuburb = query.suburb || ''
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

  if (query.registered === 'true') {
    centresQuery = centresQuery.eq('is_registered', true)
    countQuery = countQuery.eq('is_registered', true)
  }

  const pageNumber = Number.parseInt(query.page ?? '1', 10)
  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1
  const from = (safePage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  centresQuery = centresQuery.range(from, to)

  const BAJABULILE_ID = 'f580f125-81ed-412a-8d25-f187605a6a69'
  const bajabulileQuery = admin
    .from('public_ecd_centres')
    .select(
      'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,operating_schedule,operating_hours_summary,latitude,longitude,owner_id,address'
    )
    .eq('id', BAJABULILE_ID)
    .maybeSingle()

  const [{ data: centresData }, { count }, { data: bajabulileData }] = await Promise.all([
    centresQuery,
    countQuery,
    bajabulileQuery,
  ])

  const combinedData = [...(centresData ?? [])]
  if (bajabulileData && !combinedData.find((centre) => centre.id === BAJABULILE_ID)) {
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
  let savedCentreIds = new Set<string>()

  if (centreIds.length > 0) {
    const { data: geoRows } = await admin
      .from('ecd_centres')
      .select('id,latitude,longitude,onboarding_complete,owner_id,address,communication_automation_settings')
      .in('id', centreIds)

    ;((geoRows ?? []) as CentreGeoRow[]).forEach((row: any) => {
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
    const [applicationRowsResult, shortlistSummary] = await Promise.all([
      supabase
        .from('applications')
        .select('id,ecd_id,status')
        .eq('parent_id', user.id)
        .in('ecd_id', centreIds)
        .order('created_at', { ascending: false }),
      getParentShortlistSummary(supabase, user.id, centreIds),
    ])

    ;((applicationRowsResult.data ?? []) as CentreApplicationRow[]).forEach((row: any) => {
      if (!applicationByCentre.has(row.ecd_id)) {
        applicationByCentre.set(row.ecd_id, {
          id: row.id,
          status: row.status ?? null,
        })
      }
    })

    savedCentreIds = shortlistSummary.savedCentreIds
  }

  const centres = combinedData.flatMap((centre) => {
    const safeSlug = normalizeCentreSlug((centre.slug as string | null | undefined) ?? null)
    if (!safeSlug) return []

    return [
      (() => {
        const geo = geoById.get(centre.id as string)
        // Prefer coordinates/ownership from the view (populated by migration 20260401_001);
        // fall back to the secondary geo query for centres not yet in the view.
        const viewLat = (centre.latitude as number | string | null | undefined) ?? null
        const viewLng = (centre.longitude as number | string | null | undefined) ?? null
        const viewOwnerId = (centre.owner_id as string | null | undefined) ?? null
        const viewAddress = (centre.address as string | null | undefined) ?? null
        const locationMetadata = readCentreLocationMetadata(geo?.communication_automation_settings)
        const resolvedCoordinates = resolveCentreCoordinates({
          latitude: viewLat ?? geo?.latitude,
          longitude: viewLng ?? geo?.longitude,
          slug: safeSlug,
          suburb: (centre.suburb as string | null | undefined) ?? null,
          city: (centre.city as string | null | undefined) ?? null,
          address: viewAddress ?? geo?.address ?? null,
          storedSource: locationMetadata?.source,
        })
        const effectiveOwnerId = viewOwnerId || geo?.owner_id || null
        return {
          ...centre,
          slug: safeSlug,
          subsidy_accepted: Boolean(centre.subsidy_accepted),
          is_registered: Boolean(effectiveOwnerId) ? Boolean(centre.is_registered) : false,
          is_claimed: Boolean(effectiveOwnerId),
          is_pilot: isPilotCentreIdentity(centre),
          is_featured: isPilotCentreIdentity(centre),
          latitude: resolvedCoordinates.latitude ?? null,
          longitude: resolvedCoordinates.longitude ?? null,
          coordinate_source: resolvedCoordinates.source,
          coordinate_confidence: locationMetadata?.confidence ?? defaultConfidenceForSource(resolvedCoordinates.source),
          existingApplicationId: applicationByCentre.get(centre.id as string)?.id ?? null,
          existingApplicationStatus: applicationByCentre.get(centre.id as string)?.status ?? null,
          is_saved: savedCentreIds.has(centre.id as string),
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


