import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SharedCentreCard } from '@/components/shared/CentreCard'
import { type CentreCardData, parseAgeGroupsToMonths } from '@/types/centre-card'

export async function SuggestedCentresSection() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_ecd_centres')
    .select('id,name,suburb,city,slug,cover_image_url,logo_url,monthly_fee_min,monthly_fee_max,age_groups,is_registered,fees_display_mode')
    .order('name', { ascending: true })
    .limit(4)

  const suggestedCentres: CentreCardData[] = (data ?? []).map((row) => {
    const { age_min_months, age_max_months } = parseAgeGroupsToMonths(row.age_groups)
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      suburb: row.suburb ?? null,
      area: row.city ?? null,
      fee_min: row.monthly_fee_min ?? null,
      fee_max: row.monthly_fee_max ?? null,
      age_min_months,
      age_max_months,
      hero_image_url: row.cover_image_url ?? null,
      is_verified: true, // all rows in public_ecd_centres are active/published
      is_dsd_registered: Boolean(row.is_registered),
      vacancy_status: null,
      is_claimed: true,
    }
  })

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Start here</h2>
          <p className="mt-1 text-sm text-slate-600">A few cr&egrave;ches you can open first.</p>
        </div>
        <Button size="sm" variant="ghost" asChild className="rounded-full px-3 text-cyan-700 hover:text-cyan-800">
          <Link href="/parent/discover">See all</Link>
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {suggestedCentres.length === 0 ? (
          <EmptyState title="No suggestions yet" description="Check back soon for cr&egrave;che recommendations." />
        ) : (
          suggestedCentres.map((centre) => (
            <SharedCentreCard key={centre.id} centre={centre} />
          ))
        )}
      </div>
    </section>
  )
}
