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

  let centresQuery = supabase
    .from('public_ecd_centres')
    .select(
      'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted,latitude,longitude'
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

  return NextResponse.json({
    centres: (centresData ?? []).map((centre) => ({
      ...centre,
      subsidy_accepted: Boolean(centre.subsidy_accepted),
    })),
    totalResults: count ?? 0,
  })
}
