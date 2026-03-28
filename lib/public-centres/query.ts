import 'server-only'

import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { isPilotCentreIdentity } from '@/lib/ecd/pilot-centres'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type FeaturedPublicCentre = {
  id: string
  slug: string
  name: string
  suburb: string | null
  primaryAgeGroup: string | null // first entry from age_groups
  age_groups: string[] | null
  isRegistered: boolean
  isClaimed: boolean // Boolean(owner_id?.trim())
  isPilot: boolean
  isFeatured: boolean // same as isPilot on this surface
  coverImage: string | null // cover_image_url from view
  logo_url: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  fee_min: number | null // monthly_fee_min
  fee_max: number | null // monthly_fee_max
  latitude: number | null
  longitude: number | null
}

function pickPrimaryAgeGroup(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return first?.trim() ?? null
}

export async function fetchFeaturedPublicCentres(
  admin: AdminClient,
  options?: { limit?: number }
): Promise<FeaturedPublicCentre[]> {
  const limit = options?.limit ?? 6
  const fetchLimit = limit === 0 ? 100 : Math.max(limit * 4, 24)

  try {
    // Step 1: Query public_ecd_centres view
    const { data: viewRows, error: viewError } = await admin
      .from('public_ecd_centres')
      .select(
        'id,slug,name,suburb,age_groups,is_registered,logo_url,cover_image_url,monthly_fee_min,monthly_fee_max,contact_phone,contact_whatsapp'
      )
      .order('name', { ascending: true })
      .limit(fetchLimit)

    if (viewError || !viewRows?.length) {
      return []
    }

    // Step 2: Normalize slugs and drop rows with falsy slugs
    const validRows = viewRows
      .map((row: any) => ({
        ...row,
        _normalizedSlug: normalizeCentreSlug(row.slug),
      }))
      .filter((row: any): row is typeof row & { _normalizedSlug: string } => Boolean(row._normalizedSlug))

    if (validRows.length === 0) return []

    // Step 3: Fetch owner_id from ecd_centres base table for isClaimed
    const centreIds = validRows.map((r: any) => r.id as string)
    const { data: ownerRows } = await admin
      .from('ecd_centres')
      .select('id,owner_id')
      .in('id', centreIds)

    const ownerMap: Record<string, string | null> = {}
    for (const row of ownerRows ?? []) {
      ownerMap[(row as any).id] = (row as any).owner_id ?? null
    }

    // Step 4: Map to FeaturedPublicCentre
    const mapped: FeaturedPublicCentre[] = validRows.map((row: any) => {
      const ownerId = ownerMap[row.id] ?? null
      const isClaimed = Boolean(ownerId?.trim())
      const isPilot = isPilotCentreIdentity({ name: row.name, slug: row._normalizedSlug })
      return {
        id: String(row.id),
        slug: row._normalizedSlug,
        name: typeof row.name === 'string' && row.name.trim().length > 0 ? row.name.trim() : 'Cr\u00e8che',
        suburb: typeof row.suburb === 'string' && row.suburb.trim().length > 0 ? row.suburb.trim() : null,
        primaryAgeGroup: pickPrimaryAgeGroup(row.age_groups),
        age_groups: Array.isArray(row.age_groups) ? (row.age_groups as string[]) : null,
        isRegistered: Boolean(row.is_registered),
        isClaimed,
        isPilot,
        isFeatured: isPilot,
        coverImage: row.cover_image_url ?? null,
        logo_url: row.logo_url ?? null,
        contact_phone: row.contact_phone ?? null,
        contact_whatsapp: row.contact_whatsapp ?? null,
        fee_min: typeof row.monthly_fee_min === 'number' ? row.monthly_fee_min : null,
        fee_max: typeof row.monthly_fee_max === 'number' ? row.monthly_fee_max : null,
        latitude: null,
        longitude: null,
      }
    })

    // Step 5: Sort — featured first, pilot first, then alphabetical
    mapped.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1
      if (!a.isFeatured && b.isFeatured) return 1
      if (a.isPilot && !b.isPilot) return -1
      if (!a.isPilot && b.isPilot) return 1
      return a.name.localeCompare(b.name)
    })

    // Step 6: Slice to limit (0 = return all)
    if (limit === 0) return mapped
    return mapped.slice(0, limit)
  } catch (error) {
    console.error('[fetchFeaturedPublicCentres] Error:', error)
    return []
  }
}
