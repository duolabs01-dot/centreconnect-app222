type ShortlistRow = {
  centre_id: string
}

type SupabaseLikeClient = {
  from: (table: string) => any
}

export async function getParentShortlistSummary(
  supabase: SupabaseLikeClient,
  parentId: string,
  visibleCentreIds?: string[]
) {
  const totalCountPromise = supabase
    .from('parent_shortlists')
    .select('centre_id', { count: 'exact', head: true })
    .eq('parent_id', parentId)

  const visibleQuery = supabase
    .from('parent_shortlists')
    .select('centre_id')
    .eq('parent_id', parentId)

  if (visibleCentreIds && visibleCentreIds.length > 0) {
    visibleQuery.in('centre_id', visibleCentreIds)
  }

  const [countResult, visibleResult] = await Promise.all([totalCountPromise, visibleQuery])

  const savedCentreIds = new Set(
    ((visibleResult.data ?? []) as ShortlistRow[])
      .map((row) => row.centre_id)
      .filter(Boolean)
  )

  return {
    savedCount: countResult.count ?? 0,
    savedCentreIds,
  }
}
