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
    <section className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Start here</h2>
          <p className="mt-1 text-sm text-slate-600">A few nearby creches you can open first.</p>
        </div>
        <Button size="sm" variant="ghost" asChild className="rounded-full px-3 text-cyan-700 hover:text-cyan-800">
          <Link href="/parent/discover">See all</Link>
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {suggestedCentres.length === 0 ? (
          <EmptyState title="No suggestions yet" description="Check back soon for creche recommendations." />
        ) : (
          suggestedCentres.map((centre) => (
            <div
              key={centre.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{centre.name}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  {centre.suburb ?? 'Area not listed'}
                </p>
              </div>
              <Button size="sm" variant="outline" asChild className="rounded-full">
                <Link href={`/c/${centre.slug}`}>Open</Link>
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
