import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'

export async function SuggestedCentresSection() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_ecd_centres')
    .select('id,name,suburb,slug')
    .order('name', { ascending: true })
    .limit(4)

  const suggestedCentres = (data ?? []) as Array<{
    id: string
    name: string
    suburb: string | null
    slug: string
  }>

  return (
    <section className="cc-glass-soft rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Suggested centres</h2>
      <p className="mt-1 text-sm text-slate-600">Explore popular centres you can apply to next.</p>
      <div className="mt-4 space-y-3">
        {suggestedCentres.length === 0 ? (
          <EmptyState title="No suggestions yet" description="Check back soon for centre recommendations." />
        ) : (
          suggestedCentres.map((centre) => (
            <div
              key={centre.id}
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{centre.name}</p>
                <p className="mt-1 text-xs text-slate-600">{centre.suburb ?? 'Suburb not listed'}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/centre/${centre.slug}`}>View centre</Link>
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
